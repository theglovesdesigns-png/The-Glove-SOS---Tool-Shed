// ============================================================
// netlify/lib/seo.mjs  --  Tool Shed v4.3
// v4.3: THE WEBSITE NAME is always written "thegloveSOS.com".
//       - BRAND_RULE is added to every AI prompt (see toolshed.mjs).
//       - brandFix() corrects any other spelling the AI still writes,
//         without touching real web links (https://...).
// v4.0: "Use my words" (polish) now gets the FULL SEO treatment --
//       keyword placement, search-style headings, an FAQ built from
//       JB's own points, and a call to action -- while keeping his
//       words, stories and opinions. The score check expects it.
// ------------------------------------------------------------
// WHAT THIS FILE DOES (plain English):
//   1) Holds the NATIONAL SEO PLAYBOOK -- the rules every AI call
//      must follow when writing, SEO-packing, or researching blogs.
//   2) Grades a finished blog with an SEO SCORE CHECK, so JB can
//      see what to fix BEFORE it goes in the queue.
//
// WHY NATIONAL (not Central Ohio):
//   thegloveSOS.com is a NATIONAL directory. Traffic from every
//   state is what proves value to repair shops (providers) and
//   convinces new shops to list. So blogs target searches people
//   make anywhere in the US -- not one city.
//
// EDITING THE RULES:
//   Tool Shed > Settings > "National SEO Playbook". Whatever is
//   saved there REPLACES the default below. Clear the box and
//   save to go back to this default.
// ============================================================

// ------------------------------------------------------------
// THE DEFAULT PLAYBOOK
// (Plain text, so it reads well both to JB and to the AI.)
// ------------------------------------------------------------
export const DEFAULT_PLAYBOOK = `NATIONAL SEO PLAYBOOK -- thegloveSOS.com

THE WEBSITE NAME: always write it exactly as thegloveSOS.com (lowercase "the", lowercase "glove", capital "SOS", lowercase ".com"). Never TheGloveSOS.com, theglovesos.com or The Glove SOS. Web links (https://...) stay exactly as given.

WHO WE ARE: thegloveSOS.com is a NATIONAL directory that connects baseball and softball players everywhere in the United States with trusted glove repair shops. Every blog must help the site rank nationally, earn trust, and send readers to find a repair shop or list their shop.

1. NATIONAL, NOT LOCAL
- Write for players, parents, and coaches in all 50 states.
- Do NOT target Canal Winchester, Columbus, Central Ohio, or any single city or state.
- Only name a city/state when spotlighting a specific listed provider (Glove Provider Spotlight). Then use that shop's city and state once or twice, naturally.
- Use national search phrasing: "glove repair near me", "baseball glove repair", "softball glove relacing", "how to fix a baseball glove", "find a glove repair shop".

2. ONE PRIMARY KEYWORD PER BLOG
- Pick ONE primary keyword phrase that real people search nationally (2-5 words, e.g. "how to relace a baseball glove").
- Put it in: the SEO title (near the front), the slug, the meta description, the first 100 words, and at least one ## heading.
- Use 3-6 secondary/related keywords naturally (brands like Rawlings, Wilson, Mizuno, 44 Pro; positions; glove parts like palm, web, laces, pocket).
- NO keyword stuffing. Write for humans first. If it sounds forced, rewrite it.

3. SEARCH INTENT FIRST
- Answer the reader's question in the first 2-3 sentences. No long warm-ups.
- Use ## headings phrased the way people search (questions like "How long does a glove relace take?").
- Short paragraphs (2-4 sentences). Use bullet or numbered lists for steps.

4. FEATURED SNIPPETS & FAQ
- When the AI writes the blog, end with a "## Frequently Asked Questions" section: 3-4 ### questions people actually search, each answered in 2-3 sentences.
- Give at least one clear, 40-60 word direct answer near the top that Google could quote.

5. TRUST (E-E-A-T)
- Show first-hand expertise: JB is a former JUCO player with years of hands-on glove repair.
- NEVER invent statistics, prices, studies, quotes, or facts. If a number is not provided, describe it without a number.
- Be honest about what players can DIY vs. when to see a professional.

6. LINKS
- Suggest 3-4 internal links to related TheGloveSOS blog topics.
- Always include a call to action to find a trusted repair shop on thegloveSOS.com.
- When it fits, add a second call to action for repair shops: list your shop on thegloveSOS.com.
- Keep every link the writer provides, exactly as given.

7. META & TITLE RULES
- SEO title: 50-60 characters, primary keyword near the front, no clickbait.
- Meta description: 140-160 characters, includes the primary keyword, ends with a reason to click.
- Slug: lowercase-hyphenated, includes the primary keyword, 60 characters or less, no dates or filler words.

8. FORMATTING FOR OUR SITE
- Markdown only: ## and ### headings, **bold**, *italic*, bullet and numbered lists, [links](url).
- No tables, no HTML, no emojis in headings.`;

// ------------------------------------------------------------
// Which playbook is in force? Saved Settings version wins;
// an empty box means "use the default".
// ------------------------------------------------------------
export function activePlaybook(saved) {
  const s = String(saved || "").trim();
  return s || DEFAULT_PLAYBOOK;
}

// ------------------------------------------------------------
// Wrap any AI prompt with the playbook for SEO-related tasks.
//   task "blog"     -> AI writes the blog         (full rules)
//   task "polish"   -> JB's own words             (rules, but never
//                      change his wording or add facts)
//   task "seo"      -> SEO title/meta/slug/etc.   (full rules)
//   task "research" -> blog idea research         (full rules)
//   anything else   -> prompt passes through unchanged
// ------------------------------------------------------------
export function withPlaybook(task, prompt, saved) {
  const book = activePlaybook(saved);
  if (["blog", "seo", "research"].includes(task)) {
    return "FOLLOW THIS SEO PLAYBOOK ON EVERY PART OF YOUR ANSWER:\n\n" + book + "\n\n=== YOUR TASK ===\n" + prompt;
  }
  if (task === "polish") {
    // v4.0: JB's words + real SEO. The playbook applies through keyword
    // placement, headings, an FAQ made from HIS points, and a CTA --
    // never by inventing facts or replacing his stories and opinions.
    return (
      "FOLLOW THIS SEO PLAYBOOK:\n\n" + book +
      "\n\nIMPORTANT FOR THIS TASK: JB wrote this blog himself. His words, stories, opinions and voice come FIRST. " +
      "Apply the playbook through: the primary keyword placement, search-style ## headings, light rewording of his " +
      "opening so it answers the reader fast, an FAQ built ONLY from points he already made, and a closing call to action. " +
      "Never invent facts, numbers, tips or claims he didn't make." +
      "\n\n=== YOUR TASK ===\n" + prompt
    );
  }
  return prompt;
}

// ------------------------------------------------------------
// SEO SCORE CHECK
// Looks at a finished blog and reports pass / warn / fail on
// each rule. Pure code -- no AI, no cost, same answer every time.
//
// Input:  { title, slug, meta, content, primaryKeyword, mode }
// Output: { score: 0-100, grade: "A".."F", checks: [{ok, level, label, tip}] }
// ------------------------------------------------------------
const LOCAL_TERMS = [
  "canal winchester", "central ohio", "columbus", "pickerington",
  "groveport", "circleville", "lancaster, oh", "newark, oh",
];

export function checkSeo(input) {
  const title = String(input.title || "");
  const slug = String(input.slug || "");
  const meta = String(input.meta || "");
  const content = String(input.content || "");
  const kw = String(input.primaryKeyword || "").trim().toLowerCase();
  const polish = input.mode === "polish";
  const lower = content.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean);
  const first100 = words.slice(0, 100).join(" ").toLowerCase();
  const headings = content.match(/^#{2,3}\s+.+$/gm) || [];
  const h2s = content.match(/^##\s+.+$/gm) || [];

  // "relace a baseball glove" also matches "relace-a-baseball-glove"
  const kwSlug = kw.replace(/\s+/g, "-");
  const has = (text) => kw && text.toLowerCase().includes(kw);

  const checks = [];
  // weight = how many points the rule is worth
  function add(ok, weight, label, tip, softOK) {
    checks.push({ ok: !!ok, level: ok ? "pass" : softOK ? "warn" : "fail", label, tip, weight });
  }

  add(!!kw, 15, "Has one primary keyword", "Step 2 of the SEO pack must return a PRIMARY_KEYWORD. Regenerate.");
  add(has(title) && title.toLowerCase().indexOf(kw) <= 25, 10, "Keyword near the front of the SEO title",
      'Move "' + kw + '" toward the start of the SEO title.', has(title));
  add(title.length >= 45 && title.length <= 62, 5, "SEO title is about 50-60 characters (now " + title.length + ")",
      "Trim or expand the SEO title.", title.length > 0 && title.length <= 70);
  add(kw && slug.includes(kwSlug), 10, "Keyword in the slug", "Edit the slug to include: " + kwSlug);
  add(slug.length > 0 && slug.length <= 60, 3, "Slug is 60 characters or less (now " + slug.length + ")", "Shorten the slug.");
  add(has(meta), 10, "Keyword in the meta description", "Add the keyword to the meta description.");
  add(meta.length >= 140 && meta.length <= 165, 5, "Meta description 140-160 characters (now " + meta.length + ")",
      "Adjust the meta description length.", meta.length >= 110 && meta.length <= 175);
  add(has(first100), 10, "Keyword in the first 100 words", "Mention the keyword in the opening paragraph.");
  // Headings read naturally, so match on the keyword's MAIN words
  // ("relace", "baseball", "glove") instead of the exact phrase.
  const STOP = ["how", "to", "a", "an", "the", "for", "of", "in", "on", "your", "my", "is", "and", "do", "you", "what", "why"];
  const coreWords = kw.split(/\s+/).filter((w) => w && !STOP.includes(w));
  const headingHasKw = (h) => coreWords.length > 0 && coreWords.every((w) => h.toLowerCase().includes(w));
  add(h2s.some(headingHasKw), 7, "Keyword in at least one ## heading",
      "Rename one ## heading to include the keyword.", polish);
  add(headings.length >= 3, 5, "At least 3 section headings (now " + headings.length + ")", "Break the blog into more ## sections.");
  add(/##\s*(frequently asked questions|faq)/i.test(content), 8, "Has an FAQ section",
      "Click Refresh SEO Pack, regenerate, or add 2-3 FAQs (answered with your own points) in Edit.", polish);
  // Polish = JB's own length, so 600+ passes; under that is a nudge to add more of HIS story.
  add(words.length >= (polish ? 600 : 900), 5, "Length is " + (polish ? "600" : "900") + "+ words (now " + words.length + ")",
      polish ? "Short posts rank poorly. Add another story, tip or example from your own experience to the draft."
             : "Thin content ranks poorly. Add depth or pick a higher word count.", words.length >= 400);
  add(/theglovesos\.com/i.test(content) || /find (a|your) (trusted )?(glove )?repair/i.test(lower), 4,
      "Call to action to find a repair shop on TheGloveSOS", "Add a closing line pointing readers to thegloveSOS.com.");
  const localHit = LOCAL_TERMS.filter((t) => lower.includes(t) || title.toLowerCase().includes(t));
  add(localHit.length === 0 || input.category === "Glove Provider Spotlight", 3,
      "National focus (no Central Ohio targeting)",
      "Remove or soften local terms: " + localHit.join(", "));

  // Score = points earned (warnings earn half credit) / total points
  let total = 0, earned = 0;
  checks.forEach((c) => {
    total += c.weight;
    earned += c.level === "pass" ? c.weight : c.level === "warn" ? c.weight / 2 : 0;
  });
  const score = Math.round((earned / total) * 100);
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade, checks };
}

// ------------------------------------------------------------
// v4.3: THE WEBSITE NAME
// ------------------------------------------------------------
export const BRAND_NAME = "thegloveSOS.com";
export const BRAND_RULE =
  'WEBSITE NAME RULE: whenever you write the website name, write it exactly as thegloveSOS.com ' +
  '(lowercase "the", lowercase "glove", capital "SOS", lowercase ".com"). ' +
  "Never TheGloveSOS.com, theglovesos.com or The Glove SOS. Web links (https://...) stay exactly as given. " +
  "Hashtags like #TheGloveSOS are fine as they are.";

// Fix any other spelling of the website name in AI text.
//   "Visit TheGloveSOS.com"         -> "Visit thegloveSOS.com"
//   "the glove sos .com"            -> "thegloveSOS.com"
//   "https://theglovesos.com/blog"  -> unchanged (a real link -- the character
//                                      before it is "/", so we skip it)
//   "#TheGloveSOS"                  -> unchanged (no ".com")
export function brandFix(text) {
  return String(text == null ? "" : text).replace(
    /(^|[^\/\w.@-])the[ \t]*glove[ \t]*sos[ \t]*\.[ \t]*com\b/gi,
    (m, before) => before + BRAND_NAME
  );
}
