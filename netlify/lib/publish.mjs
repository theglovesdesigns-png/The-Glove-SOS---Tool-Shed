// ============================================================
// netlify/lib/publish.mjs  --  Tool Shed v3.4
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   Holds the ONE correct way to publish (and unpublish) a blog.
//   Both the "Publish Now" button and the 7 AM auto-publisher
//   use this same code, so they can never drift apart.
//
// THE KEY LESSON FROM v3.3:
//   theglovesos.com only shows a post when   is_published = true
//   and it sorts posts by                    published_at
//   and it shows the hero picture from       featured_image_url
//   v3.3 only changed a status LABEL, so nothing ever went live.
// ============================================================

import { select, update } from "./supabase.mjs";

// The time zone the shop lives in. Scheduling uses Eastern time.
export const SHOP_TZ = "America/New_York";
// Scheduled blogs go live at this hour (24-hour clock) on their day.
export const PUBLISH_HOUR = 7; // 7 AM Eastern

// ------------------------------------------------------------
// What is today's date and hour in Ohio right now?
// Returns e.g. { date: "2026-09-30", hour: 8 }
// ------------------------------------------------------------
export function nowInShopTZ(d) {
  const when = d || new Date();
  // "en-CA" formats dates as YYYY-MM-DD, which is exactly what we want.
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(when);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, hour: "numeric", hourCycle: "h23" }).format(when)
  );
  return { date, hour };
}

// ------------------------------------------------------------
// Publish one blog right now.
// Returns the updated row, or throws if the blog wasn't found.
// ------------------------------------------------------------
export async function publishPost(id) {
  const now = new Date().toISOString();
  const today = nowInShopTZ().date;

  // Look the post up first so we can keep an existing publish date.
  const found = await select("blog_posts", "select=id,publish_date,published_at&id=eq." + id);
  if (!found.length) throw new Error("Blog not found (it may have been deleted).");
  const post = found[0];

  const rows = await update("blog_posts", "id=eq." + id, {
    is_published: true,                          // <-- the switch the website reads
    published_at: post.published_at || now,      // keep original date if re-publishing
    upload_status: "Published to Site",          // keep Tool Shed's label in sync
    publish_date: post.publish_date || today,    // fill in the date if it was blank
  });
  return rows[0];
}

// ------------------------------------------------------------
// Take a blog back OFF the website (e.g. you spot a typo).
// It stays in the queue with whatever status you choose.
// ------------------------------------------------------------
export async function unpublishPost(id, newStatus) {
  const rows = await update("blog_posts", "id=eq." + id, {
    is_published: false,
    upload_status: newStatus || "Review",
  });
  if (!rows.length) throw new Error("Blog not found (it may have been deleted).");
  return rows[0];
}

// ------------------------------------------------------------
// Find every Scheduled blog whose day has come, and publish it.
// Used by the hourly auto-publisher.
//   - Blogs dated BEFORE today publish immediately (catch-up).
//   - Blogs dated TODAY publish once it's 7 AM Eastern or later.
// Returns a small report: which titles went live, which failed.
// ------------------------------------------------------------
export async function publishDueScheduled(d) {
  const { date, hour } = nowInShopTZ(d);

  // If it's before 7 AM, only catch up on days already passed.
  const op = hour >= PUBLISH_HOUR ? "lte" : "lt";
  const due = await select(
    "blog_posts",
    "select=id,title,publish_date" +
      "&upload_status=eq.Scheduled" +
      "&is_published=is.false" +
      "&publish_date=" + op + "." + date +
      "&order=publish_date.asc"
  );

  const report = { checkedAt: new Date().toISOString(), shopDate: date, shopHour: hour, published: [], failed: [] };
  for (const post of due) {
    try {
      await publishPost(post.id);
      report.published.push(post.title);
    } catch (e) {
      report.failed.push(post.title + ": " + e.message);
    }
  }
  return report;
}
