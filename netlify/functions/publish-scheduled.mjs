// ============================================================
// netlify/functions/publish-scheduled.mjs  --  Tool Shed v3.4
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   An alarm clock. Netlify wakes this up at the top of every
//   hour. It looks for blogs with status "Scheduled" whose
//   upload day has arrived, and publishes them.
//
//   Rule:  a Scheduled blog goes live at 7 AM Eastern on its
//          upload day. (Missed days get caught up right away.)
//
// NOTE: scheduled functions can't be opened in a browser --
//   Netlify runs them for you. You can see each run under
//   Netlify > Logs > Functions > publish-scheduled.
//
// Uses the same env vars as toolshed.mjs:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import { supabaseConfigured } from "../lib/supabase.mjs";
import { publishDueScheduled } from "../lib/publish.mjs";

export default async () => {
  if (!supabaseConfigured()) {
    console.error("[publish-scheduled] Supabase env vars missing -- nothing published.");
    return;
  }
  try {
    const report = await publishDueScheduled();
    // This line shows up in Netlify's function logs every hour.
    console.log(
      "[publish-scheduled]", report.shopDate, report.shopHour + ":00 ET",
      "| published:", report.published.length ? report.published.join(" | ") : "none",
      report.failed.length ? "| FAILED: " + report.failed.join(" | ") : ""
    );
  } catch (e) {
    console.error("[publish-scheduled] error:", e.message);
  }
};

// "@hourly" = run at minute 0 of every hour (Netlify uses UTC,
// which is why the 7 AM Eastern math lives in publish.mjs).
export const config = { schedule: "@hourly" };
