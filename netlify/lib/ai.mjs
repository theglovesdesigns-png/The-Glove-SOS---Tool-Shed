// ============================================================
// netlify/lib/ai.mjs  --  Tool Shed v4.1
// v4.1: MONEY + RESEARCH.
//       - Every call reports its tokens and an estimated COST, so the app
//         can show "this run cost 2 cents" and a monthly total.
//       - Optional WEB SEARCH (Claude's web_search tool, capped at a few
//         searches) so research can find REAL articles with links.
//       - Haiku 5.5 support (about 20x cheaper than Sonnet) for research.
// v4.0: THE BIG FIX. Claude Sonnet 5.5 "thinks" before answering by
//       default, and that hidden thinking used up the answer budget --
//       SEO packs came back EMPTY and polished blogs got CUT OFF.
//       Now we (1) turn up-front thinking off, (2) give more room, and
//       (3) never accept a cut-off or empty answer as "done".
// v3.8: auto-retries when the AI is briefly busy, and explains
//       common errors (bad key, no credit, unknown model) in plain English.
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   One function, askAI(), that sends a prompt to EITHER
//   Claude (Anthropic) OR Gemini (Google) and gives back text.
//   The rest of the app never has to care which one is used --
//   you flip the switch in Tool Shed > Settings > AI Provider.
//
// WHERE THE KEYS COME FROM (Netlify environment variables):
//   ANTHROPIC_API_KEY   from console.anthropic.com
//   ANTHROPIC_WORKSPACE_ID  (optional, v3.8) the wrkspc_... ID of your
//                       Claude Console workspace. Only needed if your key
//                       is NOT scoped to one workspace. Leave unset otherwise.
//   GEMINI_API_KEY      from aistudio.google.com  (Get API key)
//   You only need the key for the provider you actually use.
//
// TIME LIMIT:
//   Netlify stops any function after 60 seconds. We give the AI
//   50 seconds, then stop it ourselves so you get a clear
//   "took too long" message instead of a mystery crash.
// ============================================================

// Default models. You can override these in Settings without
// touching code (handy when a provider releases a new model).
export const DEFAULT_MODELS = {
  claude: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
};

// v4.1: the cheap, fast model -- used for research by default.
export const CHEAP_MODEL = "claude-haiku-5-5";

// v4.1: PRICES in US dollars per 1 MILLION tokens (Claude pricing page).
//   1 million tokens is roughly 750,000 words, so a whole blog costs pennies.
//   If a model isn't listed, we estimate with Sonnet's price (the safe, higher guess).
export const PRICES = {
  "claude-sonnet-5-5": { in: 2.0, out: 10.0 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-opus-5-5": { in: 4.0, out: 20.0 },
};
export const WEB_SEARCH_PRICE = 0.01; // $10 per 1,000 searches = 1 cent each

// Turn token counts into dollars.  e.g. 3,000 in + 2,000 out on Sonnet = $0.026
export function estimateCost(model, usage) {
  const u = usage || {};
  const key = Object.keys(PRICES).find((k) => String(model || "").startsWith(k));
  const p = PRICES[key] || PRICES["claude-sonnet-5-5"];
  const dollars = ((u.input_tokens || 0) * p.in + (u.output_tokens || 0) * p.out) / 1e6 +
    (u.web_searches || 0) * WEB_SEARCH_PRICE;
  return Math.round(dollars * 100000) / 100000; // 5 decimal places
}

const AI_TIMEOUT_MS = 50000; // 50 seconds
const MAX_TOKENS_CAP = 12000; // v4.0: room for long blogs (you only pay for what's used)

// v4.0: Which thinking setting to send each Claude model.
//   Sonnet 5.5 thinks by default and REJECTS {type:"disabled"}; the docs say
//   {type:"between_tools"} turns off the up-front thinking (with no tools in
//   play, the answer is just text). Other models: leave it alone.
//   If a model ever rejects this setting, askClaude retries once without it.
// v4.1: Haiku 5.5 is the opposite -- it ACCEPTS {type:"disabled"} and rejects
//   "between_tools". But with web search on we leave Haiku's thinking alone:
//   the docs warn that with thinking off it can skip a search it needed.
function thinkingFor(model, webSearch) {
  if (/^claude-sonnet-5-5/.test(model)) return { type: "between_tools" };
  if (/^claude-haiku-5-5/.test(model) && !webSearch) return { type: "disabled" };
  return null;
}

// ------------------------------------------------------------
// askAI({ provider, model, prompt, maxTokens })
//   provider  "claude" or "gemini"
//   model     optional -- falls back to DEFAULT_MODELS
//   prompt    the text we want the AI to respond to
//   maxTokens roughly how long the answer is allowed to be
//             (1 token is about 3/4 of a word)
// ------------------------------------------------------------
// The simple version most of the app uses: just the text back.
export async function askAI(opts) {
  return (await askAIFull(opts)).text;
}

// ------------------------------------------------------------
// v4.1: askAIFull -- same as askAI, plus the receipt.
//   webSearch  0 = off. 1-5 = let Claude search the web up to that many times.
// Returns { text, model, usage: {input_tokens, output_tokens, web_searches},
//           cost_usd, sources: [{url, title}] }
// ------------------------------------------------------------
export async function askAIFull({ provider, model, prompt, maxTokens, webSearch }) {
  const which = provider === "gemini" ? "gemini" : "claude"; // anything else = Claude
  const useModel = (model || "").trim() || DEFAULT_MODELS[which];
  const limit = Math.min(Number(maxTokens) || 3000, MAX_TOKENS_CAP);

  // AbortController = a "stop button" we can press on the request.
  const stopper = new AbortController();
  const timer = setTimeout(() => stopper.abort(), AI_TIMEOUT_MS);
  const started = Date.now();

  try {
    // v3.8: AUTO-RETRY. When the AI service is busy for a moment
    // ("overloaded", "rate limited", a 5xx hiccup), wait 2 seconds and
    // try again -- up to 2 more times, and only if there's still enough
    // of our 50 seconds left for a real answer.
    for (let attempt = 1; ; attempt++) {
      try {
        const r = which === "gemini"
          ? await askGemini(useModel, prompt, limit, stopper.signal)
          : await askClaude(useModel, prompt, limit, stopper.signal, Math.min(Number(webSearch) || 0, 5));
        // Gemini prices aren't in our table, so its cost shows as unknown (null).
        r.cost_usd = which === "gemini" ? null : estimateCost(r.model || useModel, r.usage);
        return r;
      } catch (e) {
        const timeLeft = AI_TIMEOUT_MS - (Date.now() - started);
        // A dropped connection ("fetch failed") is also worth one more try.
        const retryable = e.busy || (e.name === "TypeError" && /fetch/i.test(e.message));
        if (!retryable || attempt >= 3 || timeLeft < 20000) throw e;
        console.log("[ai] " + which + " busy (" + e.message + ") -- retry " + attempt + " in 2s");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        webSearch
          ? "The web search took longer than 50 seconds. Try again with fewer searches, or turn web search off."
          : "The AI took longer than 50 seconds. Try a shorter word count, or switch AI provider in Settings."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer); // always cancel the stopwatch
  }
}

// ------------------------------------------------------------
// v3.8: turn an AI service error into plain English.
//   status  the HTTP code (401, 429, 529...)
//   msg     the service's own message
// Returns an Error. err.busy = true means "worth trying again".
// ------------------------------------------------------------
function aiError(who, status, msg) {
  const m = String(msg || "");
  let plain = who + " error: " + m;
  let busy = false;
  if (status === "cutoff") {
    // v4.0: the answer hit the length limit before it finished.
    plain = who + "'s answer got cut off before it finished (it ran out of room). Nothing was saved half-done -- click Generate again. (" + m + ")";
  } else if (status === 401 || /invalid x-api-key|api key not valid|authentication/i.test(m)) {
    plain = who + " rejected the API key. Check " + (who === "Claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY") +
      " in Netlify > Environment variables, then redeploy. (" + m + ")";
  } else if (/credit balance|billing|insufficient|quota/i.test(m)) {
    plain = who + " says the account is out of credit or over quota. Add credit at " +
      (who === "Claude" ? "console.anthropic.com > Billing" : "aistudio.google.com") + ". (" + m + ")";
  } else if (/anthropic-workspace-id|not scoped to a workspace|identity-linked/i.test(m)) {
    // v3.8: the API key isn't tied to one workspace.
    plain = "Your Claude API key isn't tied to a workspace. Easiest fix: in the Claude Console > Settings > API keys, " +
      "create a new key scoped to one workspace, paste it into Netlify as ANTHROPIC_API_KEY, and redeploy. " +
      "(Or add ANTHROPIC_WORKSPACE_ID = your wrkspc_... ID in Netlify.) (" + m + ")";
  } else if (/workspace .* not found|must be a valid workspace id/i.test(m)) {
    plain = "Claude can't find the workspace in ANTHROPIC_WORKSPACE_ID. Copy the exact wrkspc_... ID from the Claude Console > Settings > Workspaces, then redeploy. (" + m + ")";
  } else if (status === 404 || /model.*(not.found|does not exist)|not_found_error/i.test(m)) {
    plain = who + " doesn't recognize the model name. In Tool Shed > Settings, clear the AI Model box to use the default. (" + m + ")";
  } else if (status === 429 || status === 529 || status >= 500 || /overloaded|rate.?limit|unavailable/i.test(m)) {
    plain = who + " is busy right now and didn't answer after a few tries. Wait a minute and click Generate again. (" + m + ")";
    busy = true;
  } else if (status === 400 && /too long|prompt is too long|context/i.test(m)) {
    plain = "Too much text for one request. Remove a source doc or shorten your notes, then try again. (" + m + ")";
  }
  const err = new Error(plain);
  err.status = status;
  err.busy = busy;
  return err;
}

// ------------------------------------------------------------
// CLAUDE  (Anthropic Messages API)
// ------------------------------------------------------------
async function askClaude(model, prompt, maxTokens, signal, webSearch) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is missing in Netlify environment variables.");

  // v4.0: turn off the hidden up-front thinking (see thinkingFor above).
  const thinking = thinkingFor(model, webSearch);
  try {
    return await callClaude(key, model, prompt, maxTokens, signal, thinking, webSearch);
  } catch (e) {
    // Safety valve: if Claude says it doesn't accept that thinking
    // setting, try once more without it instead of failing.
    if (thinking && e.status === 400 && /thinking|between_tools|disabled/i.test(e.message)) {
      console.log("[ai] model rejected thinking setting -- retrying without it");
      return await callClaude(key, model, prompt, maxTokens, signal, null, webSearch);
    }
    // v4.1: if this model can't use web search, try the default model with search.
    if (webSearch && e.status === 400 && /web_search|tool/i.test(e.message) && model !== DEFAULT_MODELS.claude) {
      console.log("[ai] " + model + " can't web search -- retrying on " + DEFAULT_MODELS.claude);
      return await callClaude(key, DEFAULT_MODELS.claude, prompt, maxTokens, signal,
        thinkingFor(DEFAULT_MODELS.claude, webSearch), webSearch);
    }
    throw e;
  }
}

async function callClaude(key, model, prompt, maxTokens, signal, thinking, webSearch) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (thinking) body.thinking = thinking;
  // v4.1: WEB SEARCH -- Claude searches, reads the results, and cites them.
  //   max_uses caps how many searches it may run (each one costs 1 cent).
  //   user_location US = results that make sense for a national US audience.
  if (webSearch) {
    body.tools = [{
      type: "web_search_20250305",
      name: "web_search",
      max_uses: webSearch,
      user_location: { type: "approximate", country: "US" },
    }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // v3.8: keys that aren't tied to ONE workspace must say which
      // workspace to use. Only sent when ANTHROPIC_WORKSPACE_ID is set.
      ...(process.env.ANTHROPIC_WORKSPACE_ID
        ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID.trim() }
        : {}),
      // NOTE: no "dangerous-direct-browser-access" header anymore --
      // we're on a server now, which is how it's meant to be done.
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    // v3.8: plain-English message + "busy" flag so askAI can retry.
    throw aiError("Claude", res.status, (data.error && data.error.message) || "HTTP " + res.status);
  }
  // Claude returns a list of content blocks; join all the TEXT ones
  // (thinking blocks, if any, are skipped -- they're not the answer).
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // v4.0: NEVER treat a cut-off or empty answer as finished.
  //   stop_reason "max_tokens" = it ran out of room mid-answer.
  //   stop_reason "refusal"    = it declined to answer.
  const used = data.usage ? " (" + data.usage.output_tokens + " of " + maxTokens + " tokens used)" : "";
  // v4.1: the receipt -- tokens + searches actually used
  const usage = {
    input_tokens: (data.usage && data.usage.input_tokens) || 0,
    output_tokens: (data.usage && data.usage.output_tokens) || 0,
    web_searches: (data.usage && data.usage.server_tool_use && data.usage.server_tool_use.web_search_requests) || 0,
  };
  // v4.1: every web page Claude found or cited (no duplicates)
  const sources = [];
  const seen = {};
  const addSrc = (url, title) => {
    if (!url || seen[url]) return;
    seen[url] = 1;
    sources.push({ url, title: title || url });
  };
  (data.content || []).forEach((b) => {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      b.content.forEach((r) => addSrc(r.url, r.title));
    }
    if (b.type === "text" && Array.isArray(b.citations)) {
      b.citations.forEach((c) => addSrc(c.url, c.title));
    }
  });
  if (data.stop_reason === "max_tokens") {
    throw aiError("Claude", "cutoff", "stop_reason max_tokens" + used);
  }
  if (data.stop_reason === "refusal") {
    throw new Error("Claude declined to answer this one. Try rewording the title or notes.");
  }
  if (!text.trim()) {
    throw new Error("Claude sent back an empty answer" + used + ". Click Generate again.");
  }
  return { text, model: data.model || model, usage, sources };
}

// ------------------------------------------------------------
// GEMINI  (Google generateContent API)
// ------------------------------------------------------------
async function askGemini(model, prompt, maxTokens, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing in Netlify environment variables.");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key, // key in a header, not in the URL, so it never lands in logs
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || "HTTP " + res.status;
    // v3.8: plain-English message (billing, bad key, busy...) + retry flag.
    throw aiError("Gemini", res.status, msg);
  }

  const cand = (data.candidates || [])[0];
  if (!cand || !cand.content) {
    // Usually a safety block or empty answer.
    const why = (cand && cand.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason) || "no answer";
    throw new Error("Gemini returned nothing (" + why + "). Try rewording, or switch to Claude.");
  }
  const text = (cand.content.parts || []).map((p) => p.text || "").join("");
  // v4.0: same rule as Claude -- a cut-off answer is not a finished answer.
  if (cand.finishReason === "MAX_TOKENS") throw aiError("Gemini", "cutoff", "finishReason MAX_TOKENS");
  if (!text.trim()) throw new Error("Gemini sent back an empty answer. Click Generate again.");
  const um = data.usageMetadata || {};
  return { text, model, usage: { input_tokens: um.promptTokenCount || 0, output_tokens: um.candidatesTokenCount || 0, web_searches: 0 }, sources: [] };
}
