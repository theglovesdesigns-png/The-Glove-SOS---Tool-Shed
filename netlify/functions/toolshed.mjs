// ============================================================
// netlify/functions/toolshed.mjs  --  Tool Shed v3.7 BACK OFFICE
// ------------------------------------------------------------
// v3.7 ADDED:
//   - Source docs on ideas (ideas.get, source_docs on create/update)
//   - Review & Approve flow: a new blog saves as a "Review" draft,
//     then queue.approve marks it Approved. queue.get / queue.review
//     load and save the private review data (docs, fact check, notes).
//   - APPROVAL GATE: a blog can only be Scheduled or Published
//     after it has been approved.
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   This is the "back office" behind the Tool Shed app.
//   The browser asks it to do things ("save this idea",
//   "write a blog", "publish this post"), and it does them
//   using the secret keys that live on Netlify's server.
//
//   The browser talks to it at:   /.netlify/functions/toolshed
//   Every request looks like:     { "action": "ideas.create", "data": {...} }
//
// SECURITY:
//   Every request must carry your Tool Shed passcode in the
//   "x-toolshed-passcode" header. Wrong or missing passcode =
//   request refused. Set the passcode in Netlify as
//   TOOLSHED_PASSCODE (any phrase you'll remember).
//
// ENVIRONMENT VARIABLES (Netlify > Site configuration > Env vars):
//   TOOLSHED_PASSCODE           your app passcode  (required)
//   SUPABASE_URL                https://blnmltwmusgfxjwwnegp.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   from Supabase > Project Settings > API keys
//   ANTHROPIC_API_KEY           only needed if using Claude
//   GEMINI_API_KEY              only needed if using Gemini
// ============================================================

import { timingSafeEqual, createHash } from "node:crypto";
import * as db from "../lib/supabase.mjs";
import { askAI, DEFAULT_MODELS } from "../lib/ai.mjs";
import { publishPost, unpublishPost, nowInShopTZ, PUBLISH_HOUR } from "../lib/publish.mjs";
import { withPlaybook, activePlaybook, DEFAULT_PLAYBOOK, checkSeo } from "../lib/seo.mjs"; // v3.7

// ------------------------------------------------------------
// RULES THE DATABASE ENFORCES (copied from Supabase so we can
// fix bad values BEFORE Supabase rejects them)
// ------------------------------------------------------------
const CATEGORIES = [
  "Glove Care", "Glove Repair", "Glove Provider Spotlight",
  "Behind the Scenes", "Customer Stories", "General Tips",
];
const IDEA_STATUSES = ["New", "Pending", "In Progress", "Used", "Archived"];
const QUEUE_STATUSES = ["Pending", "Review", "Approved", "Scheduled", "Published to Site"];

// Settings the app is allowed to read/write. API keys are NOT on
// this list on purpose -- they live only in Netlify env vars now.
const SETTING_KEYS = [
  "ai_provider", "ai_model",
  "jb_voice", "brand_dna", "logo_url",
  "default_author", "min_word_count", "max_word_count",
  "site_url", "notification_email", "sheet_id", "sheet_tab",
  "auto_generate", "auto_newsletter", "email_notify",
  "seo_playbook", // v3.7: JB's edited National SEO Playbook (blank = default)
];

const BUCKET = "blog-images";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB (Netlify caps requests at ~6 MB)

// ---------- v3.7: SOURCE DOCS ----------
// The browser pulls the TEXT out of a PDF / Word / text file and
// sends us that text. We keep the text (not the original file),
// because the text is what the AI reads.
const MAX_DOCS = 8;               // docs per idea or per blog
const MAX_DOC_CHARS = 60000;      // about 15 pages of text per doc
const MAX_ALL_DOC_CHARS = 200000; // all docs together

// One message used everywhere the approval gate says "not yet".
const NOT_APPROVED_MSG =
  "Approve this blog first. In the Blog Queue click Review, read it over, then click Approve.";

// ------------------------------------------------------------
// v3.7 HELPERS
// ------------------------------------------------------------

// Tidy a list of docs from the browser. Drops empty ones, trims
// anything too big, and keeps only the fields we expect.
//   cleanDocs([{name:"lace.pdf", text:"..."}]) -> [{name, type, size, chars, text, added_at}]
function cleanDocs(list) {
  if (!Array.isArray(list)) return [];
  let total = 0;
  const out = [];
  for (const d of list.slice(0, MAX_DOCS)) {
    const text = String((d && d.text) || "").slice(0, MAX_DOC_CHARS);
    if (!text.trim()) continue;
    if (total + text.length > MAX_ALL_DOC_CHARS) break; // stop before we go over the limit
    total += text.length;
    out.push({
      name: String(d.name || "document").slice(0, 200),
      type: String(d.type || "").slice(0, 100),
      size: Number(d.size) || 0,
      chars: text.length,
      text,
      added_at: d.added_at || new Date().toISOString(),
    });
  }
  return out;
}

// Tidy a fact-check result from the browser.
//   level: "ok" (backed up) | "check" (worth a look) | "bad" (can't verify)
function cleanFactCheck(fc) {
  if (!fc || typeof fc !== "object") return null;
  const LEVELS = ["ok", "check", "bad"];
  const items = (Array.isArray(fc.items) ? fc.items : []).slice(0, 40).map((it) => ({
    level: LEVELS.includes(it && it.level) ? it.level : "check",
    claim: String((it && it.claim) || "").slice(0, 400),
    note: String((it && it.note) || "").slice(0, 400),
  })).filter((it) => it.claim);
  return {
    checked_at: fc.checked_at || new Date().toISOString(),
    summary: String(fc.summary || "").slice(0, 600),
    items,
  };
}

// Save the PRIVATE review data for one blog (docs, fact check,
// notes). Lives in its own table so the public website can never
// read it. Updates the row if it exists, otherwise creates it.
async function saveReview(postId, fields) {
  const row = Object.assign({}, fields, { updated_at: new Date().toISOString() });
  const rows = await db.update("blog_post_reviews", "post_id=eq." + postId, row);
  if (rows.length) return rows[0];
  return db.insert("blog_post_reviews", Object.assign({ post_id: postId }, row));
}

// Wording edits JB made in the review editor -> database columns.
// Recounts words and read time whenever the blog text changes.
function editChanges(c) {
  const out = {};
  if (c.title !== undefined) {
    out.title = String(c.title).trim();
    if (!out.title) throw new Error("A blog needs a title.");
  }
  if (c.content !== undefined) {
    out.content = String(c.content);
    if (!out.content.trim()) throw new Error("A blog needs content.");
    const words = out.content.split(/\s+/).filter(Boolean).length;
    out.word_count = words;
    out.read_time = Math.max(1, Math.ceil(words / 225));
  }
  if (c.excerpt !== undefined) out.excerpt = String(c.excerpt) || null;
  if (c.meta_description !== undefined) out.meta_description = String(c.meta_description) || null;
  return out;
}

// Mark an idea "Used" once its blog is approved. Never fails the
// main action -- worst case the idea just stays on the list.
async function markIdeaUsed(ideaId) {
  if (!ideaId) return;
  try { await db.update("blog_ideas", "id=eq." + needId(ideaId), { status: "Used" }); }
  catch (e) { /* not worth failing over */ }
}

// ------------------------------------------------------------
// SMALL HELPERS
// ------------------------------------------------------------

// Send a JSON answer back to the browser.
function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Compare passcodes safely. Hashing both first means the check
// takes the same time no matter what was typed (no guessing trick).
function passcodeOK(given) {
  const real = process.env.TOOLSHED_PASSCODE || "";
  if (!real) return false; // no passcode configured = lock everything
  const a = createHash("sha256").update(String(given || "")).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

// Make sure a category is one of the 6 the database accepts.
// "glove repair tips" -> "Glove Repair", junk -> "General Tips".
function fixCategory(c) {
  const s = String(c || "").trim();
  const exact = CATEGORIES.find((x) => x.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const l = s.toLowerCase();
  if (l.includes("provider") || l.includes("spotlight") || l.includes("shop")) return "Glove Provider Spotlight";
  if (l.includes("behind")) return "Behind the Scenes";
  if (l.includes("customer") || l.includes("story")) return "Customer Stories";
  if (l.includes("repair") || l.includes("relac") || l.includes("lace")) return "Glove Repair";
  if (l.includes("care") || l.includes("clean") || l.includes("condition") || l.includes("break")) return "Glove Care";
  return "General Tips";
}

// "polish" = JB wrote it, AI only proofreads. "write" = AI writes it.
// Anything else falls back to "write" (the database only allows these two).
function fixMode(m) {
  return m === "polish" ? "polish" : "write";
}

// "Hello World!!" -> "hello-world"  (max 60 characters)
function makeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

// Tags come from the AI as "tag-one, tag-two". The database
// wants a LIST like ["tag-one","tag-two"]. (v3.3 bug #2.)
function toTagList(t) {
  if (Array.isArray(t)) return t.map((x) => String(x).trim()).filter(Boolean);
  return String(t || "")
    .split(/[,\n]/)
    .map((x) => x.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 20);
}

// A date must look like 2026-10-15, or be empty.
function cleanDate(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Must be a Supabase id (uuid). Stops weird input reaching SQL filters.
function needId(id) {
  const s = String(id || "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Missing or invalid id.");
  return s;
}

// Read current settings into a simple { key: value } object.
async function loadSettings() {
  const rows = await db.select("app_settings", "select=key,value");
  const m = {};
  rows.forEach((r) => { m[r.key] = r.value; });
  return m;
}

// ------------------------------------------------------------
// THE ACTIONS  (each one is a thing the app can ask for)
// ------------------------------------------------------------
const actions = {
  // ---------- health check: "is everything plugged in?" ----------
  async ping() {
    let settings = {};
    try { settings = await loadSettings(); } catch (e) { /* reported below */ }
    const provider = settings.ai_provider === "gemini" ? "gemini" : "claude";
    return {
      ok: true,
      supabase: db.supabaseConfigured(),
      provider,
      model: settings.ai_model || DEFAULT_MODELS[provider],
      hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      shopTime: nowInShopTZ(),
      publishHour: PUBLISH_HOUR,
    };
  },

  // ---------- SETTINGS ----------
  async "settings.get"() {
    const all = await loadSettings();
    const safe = {};
    SETTING_KEYS.forEach((k) => { if (all[k] !== undefined) safe[k] = all[k]; });
    return { settings: safe };
  },

  async "settings.save"(data) {
    const incoming = (data && data.settings) || {};
    const rows = Object.keys(incoming)
      .filter((k) => SETTING_KEYS.includes(k)) // ignore anything not on the list
      .map((k) => ({ key: k, value: String(incoming[k] == null ? "" : incoming[k]) }));
    if (!rows.length) throw new Error("Nothing to save.");
    const before = await loadSettings().catch(() => ({}));
    await db.upsertSettings(rows);

    // If the website address changed (e.g. lovable.app -> theglovesos.com),
    // rewrite every blog's stored link so they all point to the new site.
    let relinked = 0;
    if (incoming.site_url !== undefined) {
      const site = String(incoming.site_url || "").trim().replace(/\/+$/, "");
      const old = String(before.site_url || "").trim().replace(/\/+$/, "");
      if (site && site !== old) {
        const posts = await db.select("blog_posts", "select=id,slug&limit=1000");
        for (const p of posts) {
          await db.update("blog_posts", "id=eq." + p.id, { blog_url: site + "/blog/" + p.slug });
          relinked++;
        }
      }
    }
    return { saved: rows.length, relinked };
  },

  // ---------- IDEAS ----------
  async "ideas.list"() {
    const ideas = await db.select(
      "blog_ideas",
      // v3.7: source_doc_count (just the NUMBER of docs) keeps this list
      // small and fast. The doc text itself loads with ideas.get.
      "select=id,title,category,notes,status,topic_keywords,write_mode,created_at,source_doc_count" +
        // Hide ideas already turned into blogs ("Used") or shelved ("Archived").
        "&or=(status.is.null,status.not.in.(Used,Archived))&order=created_at.desc&limit=300"
    );
    return { ideas };
  },

  // v3.7: ONE idea, including the full text of its source docs.
  // Used when you click Edit or Send to Generator.
  async "ideas.get"(data) {
    const id = needId(data && data.id);
    const rows = await db.select(
      "blog_ideas",
      "select=id,title,category,notes,status,topic_keywords,write_mode,created_at,source_docs,source_doc_count&id=eq." + id
    );
    if (!rows.length) throw new Error("Idea not found (it may have been deleted).");
    return { idea: rows[0] };
  },

  async "ideas.create"(data) {
    const title = String((data && data.title) || "").trim();
    if (!title) throw new Error("An idea needs a title.");
    const idea = await db.insert("blog_ideas", {
      title,
      category: fixCategory(data.category),
      notes: data.notes || "",
      topic_keywords: data.topic_keywords || title,
      write_mode: fixMode(data.write_mode),
      source_docs: cleanDocs(data.source_docs), // v3.7
      status: "New",
      date_found: new Date().toISOString(),
    });
    // Don't send all the doc text back -- the list only needs the count.
    delete idea.source_docs;
    return { idea };
  },

  async "ideas.update"(data) {
    const id = needId(data && data.id);
    const changes = {};
    if (data.status) {
      if (!IDEA_STATUSES.includes(data.status)) throw new Error("Unknown idea status: " + data.status);
      changes.status = data.status;
    }
    if (data.title !== undefined) changes.title = String(data.title).trim();
    if (data.notes !== undefined) changes.notes = String(data.notes);
    if (data.category !== undefined) changes.category = fixCategory(data.category);
    if (data.write_mode !== undefined) changes.write_mode = fixMode(data.write_mode);
    if (data.source_docs !== undefined) changes.source_docs = cleanDocs(data.source_docs); // v3.7
    if (data.title !== undefined && !changes.title) throw new Error("An idea needs a title.");
    if (!Object.keys(changes).length) throw new Error("Nothing to change.");
    const rows = await db.update("blog_ideas", "id=eq." + id, changes);
    if (!rows.length) throw new Error("Idea not found.");
    delete rows[0].source_docs; // list only needs source_doc_count
    return { idea: rows[0] };
  },

  async "ideas.delete"(data) {
    const id = needId(data && data.id);
    const rows = await db.remove("blog_ideas", "id=eq." + id);
    return { deleted: rows.length };
  },

  // ---------- QUEUE (blog_posts) ----------
  async "queue.list"() {
    const posts = await db.select(
      "blog_posts",
      "select=id,title,slug,category,author,upload_status,word_count,read_time,publish_date," +
        "blog_url,created_at,is_published,published_at,featured_image_url,excerpt,approved_at,idea_id" +
        "&order=created_at.desc&limit=300"
    );
    return { posts };
  },

  // Save a freshly generated blog into the queue.
  // v3.7: a new blog is ALWAYS a draft ("Review" or "Pending").
  // It only becomes Approved through queue.approve -- so nothing
  // can skip JB's review.
  async "queue.create"(data) {
    const p = (data && data.post) || {};
    if (!p.title || !p.content) throw new Error("A blog needs a title and content.");

    const status = p.upload_status === "Pending" ? "Pending" : "Review";
    const date = cleanDate(p.publish_date);
    const ideaId = data.ideaId ? needId(data.ideaId) : null;

    const settings = await loadSettings().catch(() => ({}));
    const site = (settings.site_url || "https://theglovesos.com").replace(/\/+$/, "");
    const hero = p.featured_image_url || null;
    const baseSlug = makeSlug(p.slug || p.title) || "blog-" + Date.now();

    const row = {
      title: p.title,
      category: fixCategory(p.category),
      author: p.author || settings.default_author || "JB",
      content: p.content,
      excerpt: p.excerpt || null,
      meta_description: p.meta_description || null,
      seo_keywords: p.seo_keywords || null,
      tags: toTagList(p.tags),
      word_count: Number(p.word_count) || null,
      read_time: Number(p.read_time) || null,
      upload_status: status,
      publish_date: date,
      is_published: false, // NEVER goes live by accident on save
      featured_image_url: hero,
      hero_image_url: hero,
      hero_image_prompt: p.hero_image_prompt || null,
      social_image_prompt: p.social_image_prompt || null,
      thumbnail_prompt: p.thumbnail_prompt || null,
      insert_image_prompts: p.insert_image_prompts || null,
      social_caption: p.social_caption || null,
      internal_links: p.internal_links || null,
      external_links: p.external_links || null,
      source: "AI",
      idea_id: ideaId,   // v3.7: remember which idea this came from
      approved_at: null, // v3.7: not approved until JB says so
    };

    // Slugs must be unique. If "glove-care-101" is taken, try
    // "glove-care-101-2", "-3" ... so a repeat title never fails.
    let post = null;
    for (let n = 1; n <= 6 && !post; n++) {
      row.slug = n === 1 ? baseSlug : baseSlug.slice(0, 56) + "-" + n;
      row.blog_url = site + "/blog/" + row.slug;
      try {
        post = await db.insert("blog_posts", row);
      } catch (e) {
        const dup = e.status === 409 || /duplicate key|blog_posts_slug_key/i.test(e.message);
        if (!dup || n === 6) throw e;
      }
    }

    // v3.7: the idea is now "In Progress" (still on your Ideas list,
    // marked as being worked on). It becomes "Used" when you approve.
    if (ideaId) {
      try { await db.update("blog_ideas", "id=eq." + ideaId, { status: "In Progress" }); }
      catch (e) { /* not worth failing the save over */ }
    }

    // v3.7: save the private review data (source docs + fact check).
    // The blog itself is already safe, so a problem here is a warning.
    let warning = "";
    const docs = cleanDocs(data.source_docs);
    const fc = cleanFactCheck(data.fact_check);
    if (docs.length || fc) {
      try { await saveReview(post.id, { source_docs: docs, fact_check: fc }); }
      catch (e) { warning = "Blog saved, but its source docs didn't save: " + e.message; }
    }
    return { post, warning };
  },

  // v3.7: ONE blog with EVERYTHING -- the full text plus its private
  // review data. Used by the Review button in the Blog Queue.
  async "queue.get"(data) {
    const id = needId(data && data.id);
    const rows = await db.select("blog_posts", "select=*&id=eq." + id);
    if (!rows.length) throw new Error("Blog not found (it may have been deleted).");
    const rev = await db.select(
      "blog_post_reviews",
      "select=source_docs,fact_check,review_notes,updated_at&post_id=eq." + id
    );
    return { post: rows[0], review: rev[0] || { source_docs: [], fact_check: null, review_notes: "" } };
  },

  // v3.7: save fact-check results, review notes and/or source docs.
  async "queue.review"(data) {
    const id = needId(data && data.id);
    const fields = {};
    if (data.fact_check !== undefined) fields.fact_check = cleanFactCheck(data.fact_check);
    if (data.review_notes !== undefined) fields.review_notes = String(data.review_notes || "") || null;
    if (data.source_docs !== undefined) fields.source_docs = cleanDocs(data.source_docs);
    if (!Object.keys(fields).length) throw new Error("Nothing to save.");
    const found = await db.select("blog_posts", "select=id&id=eq." + id);
    if (!found.length) throw new Error("Blog not found (it may have been deleted).");
    const review = await saveReview(id, fields);
    return { review: { fact_check: review.fact_check, review_notes: review.review_notes } };
  },

  // v3.7: APPROVE a blog -- "as-is", or with the edits JB just made.
  //   data = { id, changes: {title, content, excerpt, meta_description}, review_notes }
  async "queue.approve"(data) {
    const id = needId(data && data.id);
    const found = await db.select("blog_posts", "select=id,is_published,idea_id&id=eq." + id);
    if (!found.length) throw new Error("Blog not found (it may have been deleted).");
    if (found[0].is_published) throw new Error("This blog is already live. Unpublish it first if you need to change it.");

    const changes = Object.assign(editChanges((data && data.changes) || {}), {
      upload_status: "Approved",
      approved_at: new Date().toISOString(),
      is_published: false,
    });
    const rows = await db.update("blog_posts", "id=eq." + id, changes);
    if (!rows.length) throw new Error("Blog not found.");

    let warning = "";
    if (data.review_notes !== undefined) {
      try { await saveReview(id, { review_notes: String(data.review_notes || "") || null }); }
      catch (e) { warning = "Approved, but your review notes didn't save: " + e.message; }
    }
    await markIdeaUsed(found[0].idea_id);
    return { post: rows[0], warning };
  },

  // Change status / upload day / hero image / wording of a queued blog.
  async "queue.update"(data) {
    const id = needId(data && data.id);
    const c = data.changes || {};
    const changes = {};

    if (c.publish_date !== undefined) changes.publish_date = cleanDate(c.publish_date);
    if (c.featured_image_url !== undefined) {
      changes.featured_image_url = c.featured_image_url || null;
      changes.hero_image_url = c.featured_image_url || null;
    }

    // v3.7: wording edits (title / content / excerpt / meta).
    const edits = editChanges(c);
    const editing = Object.keys(edits).length > 0;

    // Look up where the blog stands now (needed for the approval gate).
    let cur = null;
    if (editing || c.upload_status !== undefined) {
      const found = await db.select("blog_posts", "select=publish_date,approved_at,is_published,idea_id&id=eq." + id);
      if (!found.length) throw new Error("Blog not found (it may have been deleted).");
      cur = found[0];
    }

    // Changing the words means it needs a fresh approval.
    if (editing) {
      if (cur.is_published) throw new Error("This blog is live on the website. Unpublish it first, then edit.");
      Object.assign(changes, edits, { upload_status: "Review", approved_at: null, is_published: false });
    }

    if (c.upload_status !== undefined) {
      const s = c.upload_status;
      if (!QUEUE_STATUSES.includes(s)) throw new Error("Unknown status: " + s);
      if (editing && s !== "Review" && s !== "Pending") throw new Error("Save your edits first, then approve them.");

      // THE APPROVAL GATE: no scheduling or publishing without approval.
      if ((s === "Scheduled" || s === "Published to Site") && !cur.approved_at) throw new Error(NOT_APPROVED_MSG);

      // Choosing "Published to Site" really publishes it.
      if (s === "Published to Site") {
        if (Object.keys(changes).length) await db.update("blog_posts", "id=eq." + id, changes);
        return { post: await publishPost(id) };
      }
      changes.upload_status = s;
      changes.is_published = false; // any other status = not live on the site
      if (s === "Approved") changes.approved_at = cur.approved_at || new Date().toISOString();
      if (s === "Pending" || s === "Review") changes.approved_at = null; // back to draft = needs approval again
      if (s === "Scheduled") {
        const d = changes.publish_date !== undefined ? changes.publish_date : cur.publish_date;
        if (!d) throw new Error("Set an upload day before choosing Scheduled.");
      }
      if (s === "Approved") await markIdeaUsed(cur.idea_id);
    }

    if (!Object.keys(changes).length) throw new Error("Nothing to change.");
    const rows = await db.update("blog_posts", "id=eq." + id, changes);
    if (!rows.length) throw new Error("Blog not found.");
    return { post: rows[0] };
  },

  async "queue.publish"(data) {
    const id = needId(data && data.id);
    // v3.7 approval gate
    const found = await db.select("blog_posts", "select=approved_at&id=eq." + id);
    if (!found.length) throw new Error("Blog not found (it may have been deleted).");
    if (!found[0].approved_at) throw new Error(NOT_APPROVED_MSG);
    return { post: await publishPost(id) };
  },

  async "queue.unpublish"(data) {
    const id = needId(data && data.id);
    await unpublishPost(id, "Review");
    // v3.7: back in Review = needs a fresh approval before it goes live again.
    const rows = await db.update("blog_posts", "id=eq." + id, { approved_at: null });
    return { post: rows[0] };
  },

  async "queue.delete"(data) {
    const id = needId(data && data.id);
    const rows = await db.remove("blog_posts", "id=eq." + id);
    return { deleted: rows.length };
  },

  // ---------- AI ----------
  async "ai.generate"(data) {
    const prompt = String((data && data.prompt) || "");
    if (!prompt) throw new Error("Empty prompt.");
    const s = await loadSettings().catch(() => ({}));
    const provider = s.ai_provider === "gemini" ? "gemini" : "claude";
    // v3.7: wrap SEO-related tasks ("blog", "polish", "seo", "research")
    // with the National SEO Playbook. Other tasks pass through unchanged.
    const fullPrompt = withPlaybook(data.task, prompt, s.seo_playbook);
    const text = await askAI({ provider, model: s.ai_model, prompt: fullPrompt, maxTokens: data.maxTokens });
    return { text, provider };
  },

  // ---------- SEO (v3.7) ----------
  // The playbook currently in force (saved version, or the default).
  async "seo.playbook"() {
    const s = await loadSettings().catch(() => ({}));
    const saved = String(s.seo_playbook || "").trim();
    return { playbook: activePlaybook(saved), isDefault: !saved, defaultPlaybook: DEFAULT_PLAYBOOK };
  },

  // Grade a generated blog. Pure code, no AI cost.
  async "seo.check"(data) {
    return checkSeo(data || {});
  },

  // ---------- IMAGES ----------
  // The browser already resized/cropped the picture. We just
  // store it, and optionally attach it as a blog's hero image.
  async "image.upload"(data) {
    const b64 = String((data && data.base64) || "").replace(/^data:[^,]+,/, "");
    if (!b64) throw new Error("No image received.");
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image is over 4 MB after resizing. Try a smaller one.");

    const type = ["image/jpeg", "image/png", "image/webp"].includes(data.contentType) ? data.contentType : "image/jpeg";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const folder = ["hero", "social", "thumbnails", "products", "misc", "brand"].includes(data.folder) ? data.folder : "misc";
    const name = makeSlug(data.name || "image") || "image";
    const path = folder === "brand" && data.fixedName ? "brand/logo." + ext : folder + "/" + name + "-" + Date.now() + "." + ext;

    const url = await db.uploadFile(BUCKET, path, bytes, type);

    let post = null;
    if (data.attachToPostId) {
      const rows = await db.update("blog_posts", "id=eq." + needId(data.attachToPostId), {
        featured_image_url: url,
        hero_image_url: url,
      });
      post = rows[0] || null;
    }
    return { url, post };
  },

  // ---------- NEWSLETTER ----------
  async "newsletter.create"(data) {
    const n = data || {};
    const row = await db.insert("newsletters", {
      month: String(n.month || ""),
      year: Number(n.year) || new Date().getFullYear(),
      subject: n.subject || null,
      preheader: n.preheader || null,
      body: n.body || null,
      status: "Draft",
      generated_by: "AI",
      date_generated: new Date().toISOString(),
    });
    return { newsletter: row };
  },
};

// ------------------------------------------------------------
// THE FRONT DOOR -- every request comes through here.
// ------------------------------------------------------------
export default async (req) => {
  if (req.method !== "POST") return reply(405, { error: "Use POST." });

  // 1) Check the passcode.
  if (!process.env.TOOLSHED_PASSCODE) {
    return reply(500, { error: "TOOLSHED_PASSCODE is not set in Netlify environment variables." });
  }
  if (!passcodeOK(req.headers.get("x-toolshed-passcode"))) {
    return reply(401, { error: "Wrong passcode. Re-enter it in Settings." });
  }

  // 2) Make sure Supabase secrets exist.
  if (!db.supabaseConfigured()) {
    return reply(500, { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Netlify environment variables." });
  }

  // 3) Read what the app is asking for.
  let body;
  try { body = await req.json(); } catch (e) { return reply(400, { error: "Request was not valid JSON." }); }
  const handler = actions[body && body.action];
  if (!handler) return reply(400, { error: "Unknown action: " + (body && body.action) });

  // 4) Do it, and report success or a readable error.
  try {
    const result = await handler(body.data || {});
    return reply(200, result);
  } catch (e) {
    console.error("[toolshed]", body.action, e.message); // shows in Netlify function logs
    return reply(400, { error: e.message });
  }
};

// No custom path needed: Netlify automatically serves this file
// at /.netlify/functions/toolshed (named after the file).
