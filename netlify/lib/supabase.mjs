// ============================================================
// netlify/lib/supabase.mjs  --  Tool Shed v3.4
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   This is the "phone line" from our back office to Supabase.
//   It runs ONLY on Netlify's servers, never in the browser,
//   so it can safely use the powerful SERVICE ROLE key.
//
// WHY WE NEED IT:
//   The browser only has the public "anon" key, and Supabase's
//   security rules (RLS) block the anon key from saving blogs,
//   ideas, and settings. The service role key is allowed to do
//   those things, but it must stay secret -- so it lives here,
//   hidden in Netlify's environment variables.
//
// WHERE THE SECRETS COME FROM:
//   Netlify > Site configuration > Environment variables
//     SUPABASE_URL               e.g. https://blnmltwmusgfxjwwnegp.supabase.co
//     SUPABASE_SERVICE_ROLE_KEY  Supabase > Project Settings > API keys
// ============================================================

// Read the two secrets once when the function starts up.
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, ""); // strip any trailing "/"
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Quick check other files can call to give a friendly error
// instead of a confusing crash when a secret is missing.
export function supabaseConfigured() {
  return Boolean(SB_URL && SB_KEY);
}

// The headers Supabase wants on every request.
// Supabase has TWO kinds of admin key, and they go in different places:
//   - classic "service_role" key (starts with eyJ...)  -> apikey + Authorization
//   - newer "secret" key       (starts with sb_secret_) -> apikey ONLY
//     (Supabase rejects sb_ keys in the Authorization header as "Invalid JWT")
// This handles both, so whichever one you paste into Netlify just works.
function authHeaders() {
  const h = { apikey: SB_KEY };
  if (SB_KEY.startsWith("eyJ")) h.Authorization = "Bearer " + SB_KEY;
  return h;
}
function headers(extra) {
  return Object.assign(authHeaders(), { "Content-Type": "application/json" }, extra || {});
}

// Turn a failed Supabase response into a readable error message.
async function fail(res, what) {
  let msg = "HTTP " + res.status;
  try {
    const body = await res.json();
    msg = body.message || body.error || msg;
  } catch (e) {
    /* body wasn't JSON -- keep the HTTP code message */
  }
  const err = new Error(what + " failed: " + msg);
  err.status = res.status;
  throw err;
}

// ------------------------------------------------------------
// SELECT rows.  Example:  select("blog_ideas", "select=*&order=created_at.desc")
// ------------------------------------------------------------
export async function select(table, query) {
  const res = await fetch(SB_URL + "/rest/v1/" + table + "?" + (query || "select=*"), {
    headers: headers(),
  });
  if (!res.ok) await fail(res, "Reading " + table);
  return res.json();
}

// ------------------------------------------------------------
// INSERT one row and get it back (so we know its new id).
// ------------------------------------------------------------
export async function insert(table, row) {
  const res = await fetch(SB_URL + "/rest/v1/" + table, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) await fail(res, "Saving to " + table);
  const rows = await res.json();
  return rows[0];
}

// ------------------------------------------------------------
// UPDATE rows that match a filter.  Example filter: "id=eq.<uuid>"
// Returns the updated rows so we can confirm something changed.
// ------------------------------------------------------------
export async function update(table, filter, changes) {
  const res = await fetch(SB_URL + "/rest/v1/" + table + "?" + filter, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(changes),
  });
  if (!res.ok) await fail(res, "Updating " + table);
  return res.json();
}

// ------------------------------------------------------------
// DELETE rows that match a filter.
// ------------------------------------------------------------
export async function remove(table, filter) {
  const res = await fetch(SB_URL + "/rest/v1/" + table + "?" + filter, {
    method: "DELETE",
    headers: headers({ Prefer: "return=representation" }),
  });
  if (!res.ok) await fail(res, "Deleting from " + table);
  return res.json();
}

// ------------------------------------------------------------
// UPSERT settings rows (insert, or overwrite if the key exists).
// app_settings uses "key" as its unique column.
// ------------------------------------------------------------
export async function upsertSettings(rows) {
  const res = await fetch(SB_URL + "/rest/v1/app_settings?on_conflict=key", {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) await fail(res, "Saving settings");
  return res.json();
}

// ------------------------------------------------------------
// UPLOAD a file (image) to Supabase Storage.
//   bucket  e.g. "blog-images"
//   path    e.g. "hero/wilson-relace-1727700000.jpg"
//   bytes   a Buffer of the file
// Returns the PUBLIC url the website can show.
// ------------------------------------------------------------
export async function uploadFile(bucket, path, bytes, contentType) {
  const res = await fetch(SB_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: Object.assign(authHeaders(), {
      "Content-Type": contentType,
      "x-upsert": "true", // overwrite if a file with that name exists
    }),
    body: bytes,
  });
  if (!res.ok) await fail(res, "Uploading image");
  return SB_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}

