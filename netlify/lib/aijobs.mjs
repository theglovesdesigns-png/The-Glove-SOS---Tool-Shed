// ============================================================
// netlify/lib/aijobs.mjs  --  Tool Shed v4.6  (NEW FILE)
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   Everything needed to run ONE AI request, shared by:
//     - toolshed.mjs       (quick calls that answer right away)
//     - ai-background.mjs  (long calls that run as a background job)
//
// WHY BACKGROUND JOBS?
//   Netlify cuts a normal function off at about 30 seconds. Writing a
//   long blog (or proofreading notes full of numbers) can take longer.
//   A BACKGROUND function may run up to 15 minutes. So for the long
//   steps, the app:
//     1. asks toolshed.mjs to START a job  (a row in the ai_jobs table)
//     2. toolshed.mjs pokes ai-background.mjs, which does the AI work
//        and writes the answer into that row
//     3. the app checks the row every 2 seconds until it's done
// ============================================================

import { timingSafeEqual, createHash } from "node:crypto";
import * as db from "./supabase.mjs";
import { askAIFull, DEFAULT_MODELS, CHEAP_MODEL, BIG_TIMEOUT_MS } from "./ai.mjs";
import { withPlaybook, BRAND_RULE, brandFix } from "./seo.mjs";

export const MAX_WEB_SEARCHES = 3;

// Same passcode check as toolshed.mjs (the background function needs it too).
export function passcodeOK(given) {
  const real = process.env.TOOLSHED_PASSCODE || "";
  if (!real) return false;
  const a = createHash("sha256").update(String(given || "")).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

// All settings as { key: value }.
export async function loadSettingsMap() {
  const rows = await db.select("app_settings", "select=key,value");
  const m = {};
  rows.forEach((r) => { m[r.key] = r.value; });
  return m;
}

// This month (Ohio time) as "2026-11".
export function thisMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).format(new Date());
}
// What has AI cost so far this month? (sum of the monthly view)
export async function monthSpend() {
  const rows = await db.select("ai_usage_monthly", "select=task,calls,web_searches,cost_usd,input_tokens,output_tokens&month=eq." + thisMonth());
  const total = rows.reduce((n, r) => n + Number(r.cost_usd || 0), 0);
  return { total: Math.round(total * 10000) / 10000, rows };
}
// Write the receipt. Never fails the real work.
export async function logUsage(row) {
  try { await db.insert("ai_usage", row); } catch (e) { console.log("[usage] couldn't log:", e.message); }
}

// ------------------------------------------------------------
// prepareAI(data) -- everything decided BEFORE the AI is called:
//   which provider/model, the full prompt (website-name rule + SEO
//   playbook), web search, and the monthly budget check.
// Returns a plain object that can be stored in a job row.
// ------------------------------------------------------------
export async function prepareAI(data) {
  const prompt = String((data && data.prompt) || "");
  if (!prompt) throw new Error("Empty prompt.");
  const s = await loadSettingsMap().catch(() => ({}));
  const provider = s.ai_provider === "gemini" ? "gemini" : "claude";
  const task = String(data.task || "other").slice(0, 40);
  // Website-name rule on EVERY prompt + SEO playbook for SEO-type tasks.
  const fullPrompt = BRAND_RULE + "\n\n" + withPlaybook(data.task, prompt, s.seo_playbook);

  // BUDGET GUARD: stop before spending past the monthly limit.
  const budget = Number(s.ai_monthly_budget) || 0;
  if (budget > 0) {
    const spent = await monthSpend().catch(() => null);
    if (spent && spent.total >= budget) {
      throw new Error("Monthly AI budget reached: $" + spent.total.toFixed(2) + " of $" + budget.toFixed(2) +
        " spent this month. Raise the budget in Settings > AI Spend if you want to keep going.");
    }
  }
  // Research runs on the cheap model (Haiku) unless Settings pick another.
  let model = s.ai_model || "";
  if (provider === "claude" && task === "research") model = String(s.ai_model_research || "").trim() || CHEAP_MODEL;
  // Web search only for research, capped, Claude only.
  const webSearch = provider === "claude" && task === "research"
    ? Math.max(0, Math.min(Number(data.webSearch) || 0, MAX_WEB_SEARCHES)) : 0;
  return { provider, model, task, fullPrompt, webSearch, maxTokens: Number(data.maxTokens) || 3000 };
}

// ------------------------------------------------------------
// runAI(prep, big) -- call the AI, log the cost, tidy the answer.
//   big = true for background jobs: up to 10 minutes and 20,000 tokens.
// Returns { text, provider, model, sources, usage }.
// ------------------------------------------------------------
export async function runAI(prep, big) {
  let r;
  try {
    r = await askAIFull({
      provider: prep.provider, model: prep.model, prompt: prep.fullPrompt,
      maxTokens: prep.maxTokens, webSearch: prep.webSearch,
      timeoutMs: big ? BIG_TIMEOUT_MS : undefined, bigCap: !!big,
    });
  } catch (e) {
    await logUsage({ task: prep.task, provider: prep.provider, model: prep.model || DEFAULT_MODELS[prep.provider], ok: false });
    throw e;
  }
  await logUsage({
    task: prep.task, provider: prep.provider, model: r.model, ok: true,
    input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens,
    web_searches: r.usage.web_searches, cost_usd: r.cost_usd || 0,
  });
  return {
    text: brandFix(r.text), // "TheGloveSOS.com" -> "thegloveSOS.com" (links untouched)
    provider: prep.provider, model: r.model, sources: r.sources || [],
    usage: Object.assign({}, r.usage, { cost_usd: r.cost_usd }),
  };
}

// ------------------------------------------------------------
// runJob(id) -- what the background function does with a job.
// ------------------------------------------------------------
export async function runJob(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) throw new Error("Bad job id.");
  const rows = await db.select("ai_jobs", "select=id,status,request&id=eq." + id);
  if (!rows.length) throw new Error("Job not found.");
  // Only pick up a job that's still waiting (the app may have cancelled it).
  if (rows[0].status !== "queued") return;
  await db.update("ai_jobs", "id=eq." + id + "&status=eq.queued", { status: "running", updated_at: new Date().toISOString() });
  try {
    const out = await runAI(rows[0].request, true);
    await db.update("ai_jobs", "id=eq." + id, {
      status: "done", result_text: out.text, updated_at: new Date().toISOString(),
      result: { provider: out.provider, model: out.model, sources: out.sources, usage: out.usage },
    });
  } catch (e) {
    await db.update("ai_jobs", "id=eq." + id, { status: "error", error: e.message, updated_at: new Date().toISOString() });
  }
}
