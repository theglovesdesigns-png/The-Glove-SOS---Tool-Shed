// ============================================================
// netlify/lib/ai.mjs  --  Tool Shed v3.8
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
  const limit = Math.min(Number(maxTokens) || 3000, 8000);

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
  if (status === 401 || /invalid x-api-key|api key not valid|authentication/i.test(m)) {
    plain = who + " rejected the API key. Check " + (who === "Claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY") +
      " in Netlify > Environment variables, then redeploy. (" + m + ")";
  } else if (/credit balance|billing|insufficient|quota/i.test(m)) {
    plain = who + " says the account is out of credit or over quota. Add credit at " +
      (who === "Claude" ? "console.anthropic.com > Billing" : "aistudio.google.com") + ". (" + m + ")";
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // NOTE: no "dangerous-direct-browser-access" header anymore --
      // we're on a server now, which is how it's meant to be done.
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    // v3.8: plain-English message + "busy" flag so askAI can retry.
    throw aiError("Claude", res.status, (data.error && data.error.message) || "HTTP " + res.status);
  }
  // Claude returns a list of content blocks; join all the text ones.
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
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
  return (cand.content.parts || []).map((p) => p.text || "").join("");
}
