// ============================================================
// netlify/lib/ai.mjs  --  Tool Shed v3.4
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

  try {
    if (which === "gemini") return await askGemini(useModel, prompt, limit, stopper.signal);
    return await askClaude(useModel, prompt, limit, stopper.signal);
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
    throw new Error("Claude error: " + ((data.error && data.error.message) || "HTTP " + res.status));
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
    // Billing is the #1 Gemini gotcha -- call it out plainly.
    if (/billing|quota|exceeded/i.test(msg)) {
      throw new Error("Gemini says: " + msg + " (check billing at aistudio.google.com)");
    }
    throw new Error("Gemini error: " + msg);
  }

  const cand = (data.candidates || [])[0];
  if (!cand || !cand.content) {
    // Usually a safety block or empty answer.
    const why = (cand && cand.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason) || "no answer";
    throw new Error("Gemini returned nothing (" + why + "). Try rewording, or switch to Claude.");
  }
  return (cand.content.parts || []).map((p) => p.text || "").join("");
}
