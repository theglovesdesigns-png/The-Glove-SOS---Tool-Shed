// ============================================================
// netlify/lib/webread.mjs  --  Tool Shed v4.1  (NEW FILE)
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   You paste a link to an article. This file goes and gets that
//   web page, throws away the menus / ads / code, and hands back
//   just the readable words (plus the page title).
//
// WHY IT'S HERE (and not the AI's job):
//   Our own back office reading the page is FREE. Asking the AI
//   to go read it costs money. So we read it, then hand the text
//   to the AI like any other source doc.
//
// SAFETY:
//   - Only http:// and https:// links.
//   - Never reads "inside" addresses (localhost, 10.x, 192.168.x ...),
//     so nobody can use this to poke at private servers.
//   - Gives up after 10 seconds, and never reads more than 2 MB.
// ============================================================

const READ_TIMEOUT_MS = 10000;
const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_ARTICLE_CHARS = 60000; // same cap as an uploaded source doc

// Is this a normal public web address?
function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch (e) { throw new Error("That doesn't look like a web address. It should start with https://"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http:// or https:// links can be read.");
  const h = u.hostname.toLowerCase();
  const privateHost =
    h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^0\./.test(h) || h === "[::1]" || /^\[?f[cd]/.test(h);
  if (privateHost) throw new Error("That address isn't a public web page.");
  return u;
}

// Turn "&amp;" into "&", "&#39;" into "'", etc.
function decodeEntities(s) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "-", ndash: "-", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "..." };
  return s
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (named[n.toLowerCase()] !== undefined ? named[n.toLowerCase()] : m));
}

// HTML -> plain readable text.
export function htmlToText(html) {
  let h = String(html || "");
  // 1) Throw away things that are never article words.
  h = h.replace(/<!--[\s\S]*?-->/g, " ")
       .replace(/<(script|style|noscript|svg|iframe|form|button|select|template)\b[\s\S]*?<\/\1>/gi, " ")
       .replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " ");
  // 2) If the page marks its main story with <article> or <main>, keep just that.
  const art = h.match(/<article\b[\s\S]*?<\/article>/gi);
  if (art && art.join(" ").replace(/<[^>]+>/g, "").trim().length > 500) h = art.join("\n");
  else {
    const main = h.match(/<main\b[\s\S]*?<\/main>/i);
    if (main && main[0].replace(/<[^>]+>/g, "").trim().length > 500) h = main[0];
  }
  // 3) Keep paragraphs and headings on their own lines.
  h = h.replace(/<\/(p|div|h[1-6]|li|tr|section|blockquote)>/gi, "\n")
       .replace(/<br\s*\/?>/gi, "\n")
       .replace(/<li\b[^>]*>/gi, "- ")
       .replace(/<h([1-6])\b[^>]*>/gi, (m, n) => "\n" + "#".repeat(Math.min(Number(n) + 1, 4)) + " ");
  // 4) Strip every remaining tag, decode &amp; etc., tidy spaces.
  const text = decodeEntities(h.replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 1)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function pageTitle(html, url) {
  const og = String(html).match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
  const t = og ? og[1] : (String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return decodeEntities(String(t || "").replace(/\s+/g, " ").trim()).slice(0, 160) || url.hostname;
}

// ------------------------------------------------------------
// readArticle(url) -> { url, title, text, chars, cut }
// Throws a plain-English error if the page can't be read.
// ------------------------------------------------------------
export async function readArticle(rawUrl) {
  const u = checkUrl(rawUrl);
  const stopper = new AbortController();
  const timer = setTimeout(() => stopper.abort(), READ_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(u.href, {
      redirect: "follow",
      signal: stopper.signal,
      headers: {
        // Look like a normal browser -- some sites refuse unknown visitors.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ToolShedReader",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "That site took more than 10 seconds to answer." : "Couldn't reach that site (" + e.message + ").");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) throw new Error("That site blocks automatic reading (HTTP " + res.status + "). Copy the article text into a .txt file and attach it instead.");
  if (!res.ok) throw new Error("That page answered with an error (HTTP " + res.status + ").");
  const type = res.headers.get("content-type") || "";
  if (/pdf/i.test(type)) throw new Error("That link is a PDF. Download it and attach it as a Source Doc instead.");
  if (!/html|text\/plain|xml/i.test(type) && type) throw new Error("That link isn't a web page (" + type.split(";")[0] + ").");

  const buf = await res.arrayBuffer();
  const raw = new TextDecoder("utf-8").decode(buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf);
  const isHtml = /html|xml/i.test(type) || /<html|<body|<p[\s>]/i.test(raw.slice(0, 5000));
  let text = isHtml ? htmlToText(raw) : raw.trim();
  if (text.length < 200) throw new Error("Couldn't find article text on that page (it may need JavaScript or a login).");
  const cut = text.length > MAX_ARTICLE_CHARS;
  if (cut) text = text.slice(0, MAX_ARTICLE_CHARS);
  return { url: res.url || u.href, title: isHtml ? pageTitle(raw, u) : u.hostname, text, chars: text.length, cut };
}
