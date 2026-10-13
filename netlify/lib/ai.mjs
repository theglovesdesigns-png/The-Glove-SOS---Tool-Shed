// ============================================================
// netlify/lib/ai.mjs  --  Tool Shed v4.0
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

const AI_TIMEOUT_MS = 50000; // 50 seconds
const MAX_TOKENS_CAP = 12000; // v4.0: room for long blogs (you only pay for what's used)

// v4.0: Which thinking setting to send each Claude model.
//   Sonnet 5.5 thinks by default and REJECTS {type:"disabled"}; the docs say
//   {type:"between_tools"} turns off the up-front thinking (with no tools in
//   play, the answer is just text). Other models: leave it alone.
//   If a model ever rejects this setting, askClaude retries once without it.
function thinkingFor(model) {
  return /^claude-sonnet-5-5/.test(model) ? { type: "between_tools" } : null;
}

// ------------------------------------------------------------
// askAI({ provider, model, prompt, maxTokens })
//   provider  "claude" or "gemini"
//   model     optional -- falls back to DEFAULT_MODELS
//   prompt    the text we want the AI to respond to
//   maxTokens roughly how long the answer is allowed to be
//             (1 token is about 3/4 of a word)
// ------------------------------------------------------------
export async function askAI({ provider, model, prompt, maxTokens }) {
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
        if (which === "gemini") return await askGemini(useModel, prompt, limit, stopper.signal);
        return await askClaude(useModel, prompt, limit, stopper.signal);
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
        "The AI took longer than 50 seconds. Try a shorter word count, or switch AI provider in Settings."
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
async function askClaude(model, prompt, maxTokens, signal) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is missing in Netlify environment variables.");

  // v4.0: turn off the hidden up-front thinking (see thinkingFor above).
  const thinking = thinkingFor(model);
  try {
    return await callClaude(key, model, prompt, maxTokens, signal, thinking);
  } catch (e) {
    // Safety valve: if Claude says it doesn't accept that thinking
    // setting, try once more without it instead of failing.
    if (thinking && e.status === 400 && /thinking|between_tools/i.test(e.message)) {
      console.log("[ai] model rejected thinking setting -- retrying without it");
      return await callClaude(key, model, prompt, maxTokens, signal, null);
    }
    throw e;
  }
}

async function callClaude(key, model, prompt, maxTokens, signal, thinking) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (thinking) body.thinking = thinking;

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
  if (data.stop_reason === "max_tokens") {
    throw aiError("Claude", "cutoff", "stop_reason max_tokens" + used);
  }
  if (data.stop_reason === "refusal") {
    throw new Error("Claude declined to answer this one. Try rewording the title or notes.");
  }
  if (!text.trim()) {
    throw new Error("Claude sent back an empty answer" + used + ". Click Generate again.");
  }
  return text;
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
  return text;
}
