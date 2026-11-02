// ============================================================
// netlify/functions/ai-background.mjs  --  Tool Shed v4.6  (NEW FILE)
// ------------------------------------------------------------
// A BACKGROUND function (the "-background" at the end of the file
// name is what makes it one). Netlify answers the caller right away
// with "202 Accepted", then lets this keep running for up to 15
// minutes -- long enough for any blog, proofread or fact check.
//
// It's started by toolshed.mjs (action "ai.start") with { jobId }.
// It does the AI work and writes the answer into the ai_jobs table;
// the app checks that row (action "ai.job") until it's done.
// ============================================================

import { runJob, passcodeOK } from "../lib/aijobs.mjs";

export default async (req) => {
  if (!passcodeOK(req.headers.get("x-toolshed-passcode"))) {
    console.error("[ai-background] wrong or missing passcode -- ignored");
    return;
  }
  let body = {};
  try { body = await req.json(); } catch (e) { /* handled below */ }
  try {
    await runJob(body.jobId);
    console.log("[ai-background] job finished:", body.jobId);
  } catch (e) {
    console.error("[ai-background]", body.jobId, e.message);
  }
};
