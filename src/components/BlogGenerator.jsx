// ============================================================
// TheGloveSOS Tool Shed — BLOG GENERATOR (v2)
// Updated with: deep JB voice profile, markdown support,
// Google Docs importer tab, proper Supabase markdown storage
// Drop into Lovable: src/components/BlogGenerator.jsx
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SidebarWrapper from './SidebarWrapper.jsx';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SettingsPanel from './SettingsPanel.jsx';

// ---- CONSTANTS ----
const BLOG_CATEGORIES = [
  'Glove Care','Glove Repair','Glove Provider Spotlight',
  'Behind the Scenes','Customer Stories','General Tips'
];
const UPLOAD_STATUSES = ['Pending','Review','Approved','Scheduled','Published to Site'];
const HERO_IMAGES = [
  { label: 'Diamond Dust',   url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200' },
  { label: 'Leather Close-Up', url: 'https://images.unsplash.com/photo-1612279348617-e38ca8a748c6?w=1200' },
  { label: 'Field View',     url: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=1200' },
  { label: 'Glove & Ball',   url: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=1200' },
  { label: 'Workshop Tools', url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200' },
];

// ============================================================
// JB VOICE SYSTEM — built from reading 7 real blogs
// ============================================================
const JB_VOICE_SYSTEM = `
You are ghostwriting blog posts for JB, the founder of TheGloveSOS.com — a national glove repair directory based in Canal Winchester, Ohio. JB is a straight-shooting glove expert, former JUCO baseball player (St. Catharine College, 1998–1999), and lifelong baseball guy.

═══════════════════════════════════════════
OPENING — ALWAYS start exactly like this:
═══════════════════════════════════════════
"Hey glove lovers! JB here from TheGloveSOS.com right here in Canal Winchester, Ohio."
Then immediately go into something grounding — either a thing he sees in the shop every day, a debate he's heard at a tournament, or something parents/coaches always get wrong.

═══════════════════════════════════════════
JB'S CORE BELIEFS (weave these in naturally)
═══════════════════════════════════════════
1. THE #1 RULE: The player must control the glove — the glove does NOT control the player. This is ESPECIALLY critical for youth. If a kid can't squeeze it, it's a no-go. Don't buy a glove to "grow into." Full stop.
2. KEEP YOUR HANDS OUT: Don't put your hand in someone else's glove just because. Period. Unless you are working on it or repairing it — keep your hands out. This is a sign of respect for the player and the gear.
3. NO OVENS. NO MICROWAVES. NO EXCESSIVE STEAMING. These destroy leather fibers, ruin the internal structure, and — JB has said this directly — can cause a house fire. He has zero patience for this advice online.
4. Real leather only. Synthetic/pleather/plastic is junk. When a screaming line drive hits plastic, it bends backwards. Don't waste money on it.
5. Not all lace is created equal. JB uses professional-grade alum tanned lace. Cheap thin lace snaps at the worst moment — bottom of the seventh, OHSAA playoffs.
6. A glove is an investment. Proper conditioning and care extends its life by years.
7. Straight-shooter philosophy: if a glove is past the point of safe repair, JB will tell you. He won't slap a band-aid on a lost cause and charge for it.
8. "We don't just fix gloves — we restore confidence." Every relace is a chance to make a glove better than it was brand new.

═══════════════════════════════════════════
SIGNATURE PHRASES — use these naturally, don't overuse
═══════════════════════════════════════════
- "that guy" / "look at that guy" — used when pointing out a type of player, parent, or coach the reader will recognize
- "plain and simple" — after making a direct point
- "period" — after a non-negotiable rule
- "I call BS on that" — when debunking bad advice
- "stand up to the test" / "stand up to the test of the game"
- "straight-shooter" / "I'll shoot straight with you"
- "not all lace is created equal"
- "restore confidence"
- "if you can't squeeze it, you can't control it"
- "that advice just doesn't stand up"
- "I see gloves come through my shop every single day"
- "trust the process"

═══════════════════════════════════════════
LOCAL OHIO GROUNDING — sprinkle naturally
═══════════════════════════════════════════
Towns: Canal Winchester, Pickerington, Groveport, Lancaster, Circleville, Newark, Pataskala, Westerville, Hilliard
Leagues/events: OHSAA tournaments, travel ball, local rec leagues, Fairfield County, Pickaway County, Franklin County, Hocking County
References: "I talk to parents from Pickerington to Circleville every week", "Whether you're playing at Groveport or traveling to a tournament in Newark..."

═══════════════════════════════════════════
JB'S TECHNICAL KNOWLEDGE — use correctly
═══════════════════════════════════════════
Leather types: Cowhide (durable, longer break-in, mid-high level), Kip (younger cattle, lighter, faster break-in, professional-grade), Steerhide (stiffer, competitive travel ball), Synthetic (avoid)
Lace: Alum tanned lace = professional grade. Thin stretchy lace = garbage.
Web types: Trapeze, H-web, I-web, Two-piece solid (pitcher concealment)
Pocket depth: Shallow (infielders, fast transfers), Deep (outfielders, tracking)
Repairs: Full relace (2–4 hrs), Partial relace (30–60 min), Palm adhesive restoration, Web swaps (surgical — not simple), Break-in by hand + mallet + conditioner
Brands JB knows well: Rawlings (Heart of the Hide, Pro Preferred), Wilson (A2000, A2K), Mizuno Pro, Nokona, Louisville Slugger
JB's former company: JB Gloves LLC / JB Custom Gloves — sold Mexican cowhide and Japanese/American Kip leather gloves

═══════════════════════════════════════════
WRITING STYLE & STRUCTURE
═══════════════════════════════════════════
- Conversational but expert. Like a trusted coach talking — not a professor, not a salesman.
- Short punchy sentences AFTER longer explanations. One-sentence paragraphs for emphasis.
- Doesn't hedge when he knows something is right. States opinions as facts when he's confident.
- Two modes: TEACHER mode (explaining leather, web swaps, relacing — numbered lists, clean headers) and OPINION mode (trends, debates, bad advice — fired up, direct, uses phrases like "I call BS")
- Paragraph length: 2–4 sentences normally, then occasional 1-sentence punchy follow-up
- Headers every 200–300 words using ## markdown
- Ends with a strong CTA pointing to TheGloveSOS.com
- Moderate emoji use — ⚾ is his signature, occasional 🧤, occasional 🛠️

═══════════════════════════════════════════
FORMATTING — OUTPUT IN MARKDOWN
═══════════════════════════════════════════
Use proper Markdown so it renders correctly on the website:
- ## for H2 section headers
- **bold** for emphasis on key terms
- - bullet lists for features/options
- 1. numbered lists for steps/processes
- > blockquote for key takeaways or standout quotes
- Tables using | col | col | format when comparing things (like Cowhide vs Kip)
Do NOT output HTML tags. Output clean Markdown only.

═══════════════════════════════════════════
CLOSING — always end like this pattern:
═══════════════════════════════════════════
A short punchy wrap-up of the main point, then a CTA:
"[Action phrase]. Check out TheGloveSOS.com and let's get that glove right. ⚾"
OR
"Got a glove that needs some love? Head over to TheGloveSOS.com — let's get it done right."
OR
"Don't settle for junk. Trust the process. TheGloveSOS.com has your back."

═══════════════════════════════════════════
WHAT JB NEVER DOES:
═══════════════════════════════════════════
- Never recommends ovens, microwaves, or excessive steaming (fire hazard + ruins leather)
- Never tells someone to buy a bigger glove to "grow into"
- Never recommends cheap synthetic/pleather gloves when better is affordable
- Never writes corporate/stiff language — this is a real person talking
- Never uses filler phrases like "In conclusion," "It's important to note," "At the end of the day" (too generic)
- Never exaggerates credentials — JB is honest and direct
`;

// ============================================================
// MARKDOWN ↔ HTML UTILITIES
// ============================================================

// Convert Markdown to HTML for preview/display
const markdownToHtml = (md) => {
  if (!md) return '';
  return md
    .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1} (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|o|b|l])/gm, '')
    .replace(/<p><\/p>/g, '')
    || `<p>${md}</p>`;
};

// Word count from markdown (strips syntax)
const wordCountMd = (md) => {
  if (!md) return 0;
  return md.replace(/[#*>`\[\]()_]/g, ' ').split(/\s+/).filter(Boolean).length;
};
const readTime = (wc) => Math.max(1, Math.ceil(wc / 200));

// ============================================================
// SUPABASE CLIENT
// ============================================================
const getSupabaseConfig = () => {
  const url = localStorage.getItem('override_SUPABASE_URL') || '';
  const key = localStorage.getItem('override_SUPABASE_ANON_KEY') || '';
  const sheetsUrl = localStorage.getItem('override_GOOGLE_SHEETS_URL') || '';
  return { url: url.trim(), key: key.trim(), sheetsUrl: sheetsUrl.trim() };
};

const supabaseFetch = async (endpoint, method = 'GET', body = null) => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured. Go to Settings tab.');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url + endpoint, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supabase error: ' + text);
  }
  return method === 'DELETE' ? null : res.json();
};

// ============================================================
// GEMINI AI CALLS
// ============================================================
const callGemini = async (prompt, apiKey) => {
  const model = 'gemini-2.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: JB_VOICE_SYSTEM }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.82, maxOutputTokens: 6000 }
      })
    }
  );
  if (!res.ok) throw new Error('Gemini API error: ' + res.status);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const callGeminiJSON = async (prompt, apiKey) => {
  const text = await callGemini(
    prompt + '\n\nRespond ONLY with valid JSON. No markdown fences, no backticks, no explanation.',
    apiKey
  );
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

// ============================================================
// HELPERS
// ============================================================
const makeSlug = (title) =>
  title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function BlogGenerator() {
  const [tab, setTab] = useState('ideas'); // ideas | generator | queue | importer | settings
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_key') || '');

  // Keep local apiKey in sync when Settings saves a new value
  useEffect(() => {
    const onStorage = () => setApiKey(localStorage.getItem('gemini_key') || '');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (tab === 'settings') return;
    const latest = localStorage.getItem('gemini_key') || '';
    if (latest !== apiKey) setApiKey(latest);
  }, [tab]); // re-read after leaving settings

  // IDEAS
  const [ideas, setIdeas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blog_ideas') || '[]'); } catch { return []; }
  });
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaNotes, setIdeaNotes] = useState('');
  const [ideaCategory, setIdeaCategory] = useState(BLOG_CATEGORIES[0]);
  const [rejectedIdeas, setRejectedIdeas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blog_rejected_ideas') || '[]'); } catch { return []; }
  });
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResults, setResearchResults] = useState([]);

  // GENERATOR
  const [genLoading, setGenLoading] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [generatedPost, setGeneratedPost] = useState(null);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [selectedHero, setSelectedHero] = useState(0);
  const [publishDate, setPublishDate] = useState('');
  const [uploadStatus, setUploadStatus] = useState('Pending');
  const [syncingToSupabase, setSyncingToSupabase] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // QUEUE
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');

  // IMPORTER
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importedContent, setImportedContent] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importCategory, setImportCategory] = useState(BLOG_CATEGORIES[0]);
  const [importStatus, setImportStatus] = useState('');
  const [importPublishDate, setImportPublishDate] = useState('');

  // NEWSLETTER
  const [newsletter, setNewsletter] = useState(null);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => { localStorage.setItem('blog_ideas', JSON.stringify(ideas)); }, [ideas]);
  useEffect(() => { localStorage.setItem('blog_rejected_ideas', JSON.stringify(rejectedIdeas)); }, [rejectedIdeas]);
  useEffect(() => { if (apiKey) localStorage.setItem('gemini_key', apiKey); }, [apiKey]);

  // ── RESEARCH TOPICS ────────────────────────────────────────
  const researchTopics = async () => {
    if (!apiKey) { alert('Enter your Gemini API key in Settings first.'); return; }
    setResearchLoading(true);
    setResearchResults([]);
    try {
      const month = new Date().getMonth();
      const season = month <= 1 || month === 11 ? 'off-season / winter storage / equipment prep'
        : month <= 3 ? 'spring training / new season prep / glove break-in season'
        : month <= 7 ? 'peak season / travel ball tournaments / OHSAA'
        : 'playoffs / end of season / glove restoration before storage';

      const rejectedTitles = rejectedIdeas.map(r => r.title).join(', ');

      const prompt = `You are a content strategist for TheGloveSOS.com — JB's glove repair directory in Canal Winchester, Ohio.

Current baseball/softball season context: ${season} (Month ${month + 1})

Generate 8 specific, clickable blog topic ideas. Mix evergreen and seasonal. Focus on topics parents, players, and coaches in Central Ohio actually search for.

Topics to cover (spread across):
- Glove care & maintenance (cleaning, conditioning, storage)
- Glove repair how-tos (relacing, web swaps, palm repair)
- Specific glove model comparisons (Wilson A2000 vs A2K, Rawlings HOTH vs Pro Preferred, Mizuno Pro)
- Youth glove sizing and selection (this is huge for parents)
- Position-specific glove guides
- Break-in methods (the right way vs the dangerous myths)
- OHSAA / Ohio high school baseball season angles
- Customer story angles or "before & after" repair stories

${rejectedTitles ? `AVOID these topics (already rejected): ${rejectedTitles}` : ''}

Return JSON array only:
[
  {
    "title": "Specific blog title (make it sound like JB wrote it)",
    "category": "one of: Glove Care|Glove Repair|Glove Provider Spotlight|Behind the Scenes|Customer Stories|General Tips",
    "notes": "2-3 sentences on what this blog should cover and what makes it useful",
    "seasonal_relevance": "why this topic is timely right now",
    "estimated_search_volume": "low|medium|high"
  }
]`;

      const results = await callGeminiJSON(prompt, apiKey);
      setResearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      alert('Research error: ' + e.message);
    }
    setResearchLoading(false);
  };

  const approveResearchIdea = (idea) => {
    setIdeas(prev => [{
      id: Date.now(), title: idea.title, category: idea.category,
      notes: idea.notes, addedAt: new Date().toISOString(), source: 'AI Research'
    }, ...prev]);
    setResearchResults(prev => prev.filter(r => r.title !== idea.title));
  };

  const rejectResearchIdea = (idea) => {
    setRejectedIdeas(prev => [...prev, { title: idea.title, rejectedAt: new Date().toISOString() }]);
    setResearchResults(prev => prev.filter(r => r.title !== idea.title));
  };

  const addManualIdea = () => {
    if (!ideaTitle.trim()) return;
    setIdeas(prev => [{
      id: Date.now(), title: ideaTitle.trim(), category: ideaCategory,
      notes: ideaNotes.trim(), addedAt: new Date().toISOString(), source: 'Manual'
    }, ...prev]);
    setIdeaTitle(''); setIdeaNotes('');
  };

  const removeIdea = (id) => setIdeas(prev => prev.filter(i => i.id !== id));
  const pushToGenerator = (idea) => { setSelectedIdea(idea); setTab('generator'); };

  // ── GENERATE BLOG ──────────────────────────────────────────
  const generateBlog = async () => {
    if (!apiKey) { alert('Enter your Gemini API key in Settings first.'); return; }
    if (!selectedIdea) { alert('Pick an idea from the Ideas tab first.'); return; }
    setGenLoading(true); setGenStatus('Researching topic...'); setSyncSuccess(false);
    setGeneratedPost(null);
    try {
      setGenStatus('Writing in JB\'s voice (~1500 words)...');
      const contentPrompt = `Write a complete, SEO-optimized blog post for TheGloveSOS.com.

TOPIC: ${selectedIdea.title}
CATEGORY: ${selectedIdea.category}
ADDITIONAL CONTEXT FROM JB: ${selectedIdea.notes || 'None provided'}
TARGET WORD COUNT: 1400–1600 words
CURRENT MONTH/SEASON: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

REQUIREMENTS:
- Follow the voice and style instructions in your system prompt exactly
- Include at least 2 specific Central Ohio location references
- Include at least one debunking of a common myth or bad advice
- Use ## headers every 200-300 words
- Include 1-2 lists (bullet or numbered) where appropriate
- Output in clean Markdown (##, **, -, 1.) — NO HTML tags
- End with a CTA to TheGloveSOS.com

Write the full blog post now:`;

      const content = await callGemini(contentPrompt, apiKey);

      setGenStatus('Generating SEO metadata...');
      await new Promise(r => setTimeout(r, 1500));

      const seoPrompt = `Based on this blog topic and content, generate SEO metadata for TheGloveSOS.com.

TITLE: ${selectedIdea.title}
CATEGORY: ${selectedIdea.category}
CONTENT PREVIEW: ${content.slice(0, 600)}

Return JSON only:
{
  "slug": "url-slug-max-70-chars-no-special-chars",
  "meta_description": "compelling meta description 145-160 characters — include glove repair and location angle",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "excerpt": "2-3 sentence excerpt for blog listing page — sounds like JB wrote it",
  "tags": "tag1, tag2, tag3, tag4, tag5",
  "hero_image_prompt": "Detailed prompt for generating a hero image for this blog post (describe the scene, mood, colors)",
  "inset_image_1_prompt": "Prompt for first inset image to go mid-article",
  "inset_image_2_prompt": "Prompt for second inset image to go near end of article"
}`;

      const seo = await callGeminiJSON(seoPrompt, apiKey);
      const wc = wordCountMd(content);

      setGeneratedPost({
        title: selectedIdea.title,
        slug: seo.slug || makeSlug(selectedIdea.title),
        author: 'JB',
        category: selectedIdea.category,
        tags: seo.tags || '',
        meta_description: seo.meta_description || '',
        seo_keywords: Array.isArray(seo.seo_keywords) ? seo.seo_keywords.join(', ') : (seo.seo_keywords || ''),
        hero_image_url: HERO_IMAGES[selectedHero].url,
        hero_image_prompt: seo.hero_image_prompt || '',
        inset_image_1_prompt: seo.inset_image_1_prompt || '',
        inset_image_2_prompt: seo.inset_image_2_prompt || '',
        excerpt: seo.excerpt || '',
        content: content, // stored as MARKDOWN
        word_count: wc,
        read_time: readTime(wc),
        upload_status: uploadStatus,
        publish_date: publishDate,
        published_at: '',
        supabase_id: '',
        blog_url: 'https://theglovesos.com/blog/' + (seo.slug || makeSlug(selectedIdea.title)),
        source: 'AI',
        review_status: 'Needs Review',
        created_at: new Date().toISOString()
      });
      setGenStatus('Done!');
    } catch (e) {
      setGenStatus('Error: ' + e.message);
    }
    setGenLoading(false);
  };

  // ── PUSH TO SUPABASE ───────────────────────────────────────
  const pushToSupabase = async (postData) => {
    if (!postData) return;
    setSyncingToSupabase(true);
    try {
      const payload = {
        title: postData.title, slug: postData.slug, author: postData.author,
        category: postData.category, tags: postData.tags,
        meta_description: postData.meta_description, seo_keywords: postData.seo_keywords,
        hero_image_url: postData.hero_image_url, excerpt: postData.excerpt,
        content: postData.content,  // ← stored as Markdown
        word_count: postData.word_count, read_time: postData.read_time,
        upload_status: postData.upload_status,
        publish_date: postData.publish_date || null, published_at: null,
        blog_url: postData.blog_url, source: postData.source || 'AI',
        review_status: postData.review_status || 'Needs Review', views: 0
      };
      const result = await supabaseFetch('/rest/v1/blog_posts', 'POST', payload);
      const newId = result?.[0]?.id || result?.id || '';
      if (postData === generatedPost) {
        setGeneratedPost(prev => ({ ...prev, supabase_id: String(newId) }));
        setSyncSuccess(true);
        if (selectedIdea?.id) removeIdea(selectedIdea.id);
      }
      return newId;
    } catch (e) {
      alert('Push failed: ' + e.message);
    }
    setSyncingToSupabase(false);
  };

  const pushToSheets = async (postData) => {
    const { sheetsUrl } = getSupabaseConfig();
    if (!sheetsUrl) { alert('Google Sheets URL not set in Settings.'); return; }
    if (!postData) return;
    try {
      await fetch(sheetsUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addBlog', ...postData })
      });
      alert('Sent to Google Sheets! Check your Blog_Queue tab.');
    } catch (e) { alert('Sheets push error: ' + e.message); }
  };

  // ── QUEUE ──────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true); setQueueError('');
    try {
      const data = await supabaseFetch('/rest/v1/blog_posts?order=created_at.desc&limit=50');
      setQueue(Array.isArray(data) ? data : []);
    } catch (e) { setQueueError(e.message); }
    setQueueLoading(false);
  }, []);

  useEffect(() => { if (tab === 'queue') loadQueue(); }, [tab, loadQueue]);

  const updateQueueStatus = async (id, newStatus) => {
    try {
      await supabaseFetch(`/rest/v1/blog_posts?id=eq.${id}`, 'PATCH', { upload_status: newStatus });
      setQueue(prev => prev.map(p => p.id === id ? { ...p, upload_status: newStatus } : p));
    } catch (e) { alert('Update failed: ' + e.message); }
  };

  // ── GOOGLE DOCS IMPORTER ───────────────────────────────────
  // How it works: user pastes a Google Doc URL, we fetch it
  // as plain text via the export endpoint, then use Gemini
  // to clean it up into proper Markdown and generate SEO fields
  const importFromGoogleDoc = async () => {
    if (!importUrl.trim()) { alert('Paste a Google Doc URL first.'); return; }
    if (!apiKey) { alert('Gemini API key needed to process the import.'); return; }
    setImportLoading(true); setImportStatus('Fetching document...');
    try {
      // Extract doc ID from URL
      const match = importUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) throw new Error('Could not find a Google Doc ID in that URL. Make sure it\'s a valid Google Docs link.');
      const docId = match[1];

      // Fetch as plain text (doc must be shared "Anyone with link can view")
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Could not fetch the document. Make sure the Google Doc is set to "Anyone with link can view".');
      const rawText = await res.text();
      if (!rawText || rawText.length < 100) throw new Error('Document appears empty or could not be read.');

      setImportStatus('Converting to Markdown & generating SEO...');
      await new Promise(r => setTimeout(r, 500));

      // Use Gemini to clean up and convert to proper Markdown + generate SEO
      const cleanPrompt = `I'm going to give you the raw text of a blog post that was exported from Google Docs. 
      
Your job:
1. Clean it up and convert it to proper Markdown formatting (## headers, **bold**, - bullets, etc.)
2. Keep JB's voice exactly as written — don't change the words, just format properly
3. Make sure the opening "Hey glove lovers!" is preserved
4. Remove any Google Docs formatting artifacts, extra blank lines, weird characters
5. Generate SEO metadata

RAW TEXT:
${rawText.slice(0, 8000)}

Return JSON only:
{
  "title": "The blog post title (from the first line or heading)",
  "clean_content": "The full cleaned Markdown content",
  "slug": "url-slug",
  "meta_description": "150-160 char meta description",
  "seo_keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "excerpt": "2-3 sentence excerpt",
  "tags": "tag1, tag2, tag3",
  "suggested_category": "one of: Glove Care|Glove Repair|Glove Provider Spotlight|Behind the Scenes|Customer Stories|General Tips"
}`;

      const result = await callGeminiJSON(cleanPrompt, apiKey);

      setImportedContent(result.clean_content || rawText);
      setImportTitle(result.title || 'Imported Blog Post');
      setImportCategory(result.suggested_category || BLOG_CATEGORIES[0]);

      // Store full import data for pushing
      setGeneratedPost({
        title: result.title || 'Imported Blog Post',
        slug: result.slug || makeSlug(result.title || 'imported-post'),
        author: 'JB',
        category: result.suggested_category || BLOG_CATEGORIES[0],
        tags: result.tags || '',
        meta_description: result.meta_description || '',
        seo_keywords: result.seo_keywords || '',
        hero_image_url: HERO_IMAGES[0].url,
        excerpt: result.excerpt || '',
        content: result.clean_content || rawText,
        word_count: wordCountMd(result.clean_content || rawText),
        read_time: readTime(wordCountMd(result.clean_content || rawText)),
        upload_status: importPublishDate ? 'Approved' : 'Pending',
        publish_date: importPublishDate,
        published_at: '',
        supabase_id: '',
        blog_url: 'https://theglovesos.com/blog/' + (result.slug || makeSlug(result.title || 'imported')),
        source: 'Imported from Google Docs',
        review_status: 'Needs Review',
        created_at: new Date().toISOString()
      });
      setSyncSuccess(false);
      setImportStatus('✅ Ready to push to Supabase!');
    } catch (e) {
      setImportStatus('❌ Error: ' + e.message);
    }
    setImportLoading(false);
  };

  // ── NEWSLETTER ─────────────────────────────────────────────
  const generateNewsletter = async () => {
    if (!apiKey) { alert('Enter Gemini API key first.'); return; }
    setNewsletterLoading(true);
    try {
      const published = queue.filter(p => p.upload_status === 'Published to Site').slice(0, 5);
      const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const prompt = `Write a monthly email newsletter for TheGloveSOS.com for ${month}.

Recent published blogs to feature:
${published.map((p, i) => `${i + 1}. "${p.title}" — ${p.excerpt || p.meta_description || ''}`).join('\n') || 'No published blogs yet — write a general newsletter'}

Newsletter must include:
- JB's warm "Hey glove lovers!" opening
- 2–3 blog highlights with brief descriptions and links
- A baseball calendar highlight for this time of year (MLB news, OHSAA, college ball, upcoming tournaments)
- A "Tip of the Month" from JB
- CTA to visit TheGloveSOS.com
- ~400 words, conversational JB voice
- Output in Markdown`;
      const content = await callGemini(prompt, apiKey);
      setNewsletter({ content, month, generatedAt: new Date().toISOString() });
    } catch (e) { alert('Newsletter error: ' + e.message); }
    setNewsletterLoading(false);
  };

  // ============================================================
  // STYLES (dark theme matching TheGloveSOS brand)
  // ============================================================
  const c = {
    teal: '#00CCCC', purple: '#6D3D9C', gold: '#B8860B',
    bg: '#07070f', bg2: '#0f0f1a', bg3: '#14141f', bg4: '#1c1c2e',
    border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.13)',
    muted: 'rgba(255,255,255,0.45)', white: '#fff'
  };

  const s = {
    wrap: { color: c.white, fontFamily: 'system-ui, sans-serif', fontSize: 14 },
    header: { marginBottom: 20 },
    titleText: { fontSize: 20, fontWeight: 800, fontStyle: 'italic', color: c.teal, letterSpacing: '-0.4px' },
    subtitle: { fontSize: 12, color: c.muted, marginTop: 3 },
    tabs: { display: 'flex', gap: 2, marginBottom: 20, borderBottom: `1px solid ${c.border}` },
    tab: (active) => ({
      fontSize: 12, fontWeight: 700, padding: '8px 14px',
      border: 'none', background: 'none', cursor: 'pointer',
      color: active ? c.teal : c.muted,
      borderBottom: active ? `2px solid ${c.teal}` : '2px solid transparent',
      marginBottom: -1, transition: 'all .15s', whiteSpace: 'nowrap'
    }),
    card: {
      background: c.bg2, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 12
    },
    cardTeal: {
      background: 'rgba(0,204,204,0.06)', border: `1px solid rgba(0,204,204,0.25)`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 12
    },
    cardGold: {
      background: 'rgba(184,134,11,0.08)', border: `1px solid rgba(184,134,11,0.3)`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 12
    },
    label: { fontSize: 10, fontWeight: 800, color: c.teal, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8, display: 'block' },
    inp: {
      width: '100%', background: c.bg4, border: `1px solid ${c.border2}`,
      borderRadius: 8, padding: '9px 12px', color: c.white, fontSize: 13,
      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
    },
    ta: {
      width: '100%', background: c.bg4, border: `1px solid ${c.border2}`,
      borderRadius: 8, padding: '9px 12px', color: c.white, fontSize: 13,
      outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 72, boxSizing: 'border-box'
    },
    sel: {
      background: c.bg4, border: `1px solid ${c.border2}`,
      borderRadius: 8, padding: '9px 12px', color: c.white, fontSize: 13,
      outline: 'none', cursor: 'pointer'
    },
    fieldRow: { marginBottom: 10 },
    g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    btnTeal: { background: c.teal, color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
    btnPurple: { background: c.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnGhost: { background: 'transparent', color: c.muted, border: `1px solid ${c.border2}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' },
    btnDanger: { background: 'rgba(200,16,46,0.15)', color: '#ff6b87', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
    badge: (col) => {
      const map = { teal: ['rgba(0,204,204,0.14)', c.teal], purple: ['rgba(109,61,156,0.2)', '#c084fc'], gold: ['rgba(184,134,11,0.18)', '#f0b429'], green: ['rgba(0,200,100,0.14)', '#4ade80'], gray: ['rgba(255,255,255,0.08)', c.muted] };
      const [bg, clr] = map[col] || map.gray;
      return { background: bg, color: clr, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, display: 'inline-block', letterSpacing: '.04em', textTransform: 'uppercase' };
    },
    ideaRow: { background: c.bg3, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.teal}`, borderRadius: 8, padding: '11px 13px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    qRow: { background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: '11px 13px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    div: { height: 1, background: c.border, margin: '16px 0' },
    secLabel: { fontSize: 10, fontWeight: 800, color: c.teal, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8, marginBottom: 16 },
    stat: { background: c.bg3, borderRadius: 8, padding: '11px', textAlign: 'center' },
    statN: { fontSize: 20, fontWeight: 800, color: c.teal },
    statL: { fontSize: 10, color: c.muted, marginTop: 2 },
  };

  const statusColor = (st) => ({ 'Pending':'gray','Review':'gold','Approved':'purple','Scheduled':'purple','Published to Site':'green' }[st] || 'gray');

  // ============================================================
  // RENDER TABS
  // ============================================================

  // ── IDEAS ──────────────────────────────────────────────────
  const renderIdeas = () => (
    <div>
      <div style={s.statGrid}>
        <div style={s.stat}><div style={s.statN}>{ideas.length}</div><div style={s.statL}>Ideas</div></div>
        <div style={s.stat}><div style={{...s.statN, color:'#c084fc'}}>{queue.filter(p=>p.upload_status==='Pending').length}</div><div style={s.statL}>Pending</div></div>
        <div style={s.stat}><div style={{...s.statN, color:'#4ade80'}}>{queue.filter(p=>p.upload_status==='Published to Site').length}</div><div style={s.statL}>Live</div></div>
        <div style={s.stat}><div style={{...s.statN, color:c.gold}}>{rejectedIdeas.length}</div><div style={s.statL}>Rejected</div></div>
      </div>

      {/* AI Research */}
      <div style={s.cardTeal}>
        <div style={s.secLabel}>AI Topic Research</div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 12 }}>Gemini scans for trending baseball/softball glove topics — approve or reject each suggestion.</div>
        <button style={s.btnTeal} onClick={researchTopics} disabled={researchLoading}>
          {researchLoading ? '⏳ Researching...' : '✦ Research Trending Topics'}
        </button>
      </div>

      {researchResults.length > 0 && (
        <div style={s.card}>
          <div style={s.secLabel}>{researchResults.length} Suggestions — Approve or Reject</div>
          {researchResults.map((idea, i) => (
            <div key={i} style={{ background: c.bg3, border: `1px solid ${c.border2}`, borderRadius: 8, padding: '12px', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{idea.title}</div>
              <div style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>{idea.notes}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={s.badge('purple')}>{idea.category}</span>
                <span style={s.badge(idea.estimated_search_volume === 'high' ? 'green' : idea.estimated_search_volume === 'medium' ? 'gold' : 'gray')}>{idea.estimated_search_volume} volume</span>
                {idea.seasonal_relevance && <span style={{ fontSize: 10, color: c.muted }}>{idea.seasonal_relevance}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.btnTeal} onClick={() => approveResearchIdea(idea)}>✓ Add</button>
                <button style={s.btnDanger} onClick={() => rejectResearchIdea(idea)}>✗ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual idea entry */}
      <div style={s.card}>
        <div style={s.secLabel}>Add Your Own Idea</div>
        <div style={{ ...s.fieldRow }}>
          <input style={s.inp} placeholder="Blog title or topic idea..." value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} />
        </div>
        <div style={{ ...s.g2, marginBottom: 8 }}>
          <select style={s.sel} value={ideaCategory} onChange={e => setIdeaCategory(e.target.value)}>
            {BLOG_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button style={s.btnTeal} onClick={addManualIdea}>+ Add Idea</button>
        </div>
        <textarea style={s.ta} placeholder="Notes / context — what should this blog cover? Any specific angles?" value={ideaNotes} onChange={e => setIdeaNotes(e.target.value)} />
      </div>

      {/* Ideas queue */}
      <div style={s.div} />
      <div style={s.secLabel}>Ideas Queue ({ideas.length})</div>
      {ideas.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: c.muted, padding: '2rem' }}>No ideas yet. Research topics or add your own above.</div>}
      {ideas.map(idea => (
        <div key={idea.id} style={s.ideaRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{idea.title}</div>
            {idea.notes && <div style={{ fontSize: 11, color: c.muted, marginBottom: 5 }}>{idea.notes.slice(0, 80)}...</div>}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={s.badge('teal')}>{idea.category}</span>
              <span style={s.badge('gray')}>{idea.source}</span>
              <span style={{ fontSize: 10, color: c.muted }}>{new Date(idea.addedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button style={s.btnTeal} onClick={() => pushToGenerator(idea)}>→ Generate</button>
            <button style={s.btnDanger} onClick={() => removeIdea(idea.id)}>✗</button>
          </div>
        </div>
      ))}
      {rejectedIdeas.length > 0 && <div style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>🚫 {rejectedIdeas.length} rejected topic(s) saved — AI won't suggest these again.</div>}
    </div>
  );

  // ── GENERATOR ──────────────────────────────────────────────
  const renderGenerator = () => (
    <div>
      {/* Selected idea */}
      <div style={selectedIdea ? s.cardTeal : s.card}>
        {selectedIdea ? (
          <>
            <div style={s.secLabel}>Selected Topic</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{selectedIdea.title}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={s.badge('teal')}>{selectedIdea.category}</span>
              {selectedIdea.notes && <span style={{ fontSize: 11, color: c.muted }}>{selectedIdea.notes.slice(0, 70)}</span>}
            </div>
            <button style={{ ...s.btnGhost, marginTop: 10, fontSize: 11 }} onClick={() => { setSelectedIdea(null); setTab('ideas'); }}>← Change Topic</button>
          </>
        ) : (
          <div style={{ color: c.muted, fontSize: 13 }}>
            No topic selected. <button style={{ background: 'none', border: 'none', color: c.teal, cursor: 'pointer', fontWeight: 700 }} onClick={() => setTab('ideas')}>← Go to Ideas tab</button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={s.card}>
        <div style={s.secLabel}>Blog Settings</div>
        <div style={s.g2}>
          <div>
            <label style={s.label}>Publish Date</label>
            <input type="date" style={s.inp} value={publishDate} onChange={e => setPublishDate(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Upload Status</label>
            <select style={{ ...s.sel, width: '100%' }} value={uploadStatus} onChange={e => setUploadStatus(e.target.value)}>
              {UPLOAD_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={s.label}>Hero Image</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
            {HERO_IMAGES.map((img, i) => (
              <div key={i} onClick={() => setSelectedHero(i)} style={{ cursor: 'pointer', border: selectedHero === i ? `2px solid ${c.teal}` : `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden', width: 78 }}>
                <img src={img.url} alt={img.label} style={{ width: 78, height: 50, objectFit: 'cover', display: 'block' }} />
                <div style={{ fontSize: 9, padding: '3px 4px', textAlign: 'center', color: c.muted }}>{img.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button style={{ ...s.btnTeal, padding: '14px 32px', fontSize: 15, borderRadius: 10, opacity: (!selectedIdea || genLoading) ? 0.6 : 1, width: '100%', justifyContent: 'center' }}
          onClick={generateBlog} disabled={!selectedIdea || genLoading}>
          {genLoading ? `⏳ ${genStatus}` : '✦ Generate Master Blog'}
        </button>
        {genLoading && <div style={{ marginTop: 8, fontSize: 12, color: c.muted }}>Writing ~1500 words in JB's voice via Gemini… takes 20–40 seconds.</div>}
      </div>

      {/* Generated output */}
      {generatedPost && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: c.teal, marginBottom: 12 }}>✅ Blog Package Ready!</div>

          {/* SEO Fields */}
          <div style={s.card}>
            <div style={s.secLabel}>SEO & Metadata</div>
            <div style={s.g2}>
              <div style={s.fieldRow}>
                <label style={s.label}>Title</label>
                <input style={s.inp} value={generatedPost.title} onChange={e => setGeneratedPost(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={s.fieldRow}>
                <label style={s.label}>Slug</label>
                <input style={s.inp} value={generatedPost.slug} onChange={e => setGeneratedPost(p => ({ ...p, slug: e.target.value }))} />
              </div>
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>Meta Description <span style={{ color: generatedPost.meta_description.length > 160 ? '#ff4d6d' : c.muted }}>({generatedPost.meta_description.length}/160)</span></label>
              <textarea style={s.ta} value={generatedPost.meta_description} onChange={e => setGeneratedPost(p => ({ ...p, meta_description: e.target.value }))} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>SEO Keywords</label>
              <input style={s.inp} value={generatedPost.seo_keywords} onChange={e => setGeneratedPost(p => ({ ...p, seo_keywords: e.target.value }))} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>Tags</label>
              <input style={s.inp} value={generatedPost.tags} onChange={e => setGeneratedPost(p => ({ ...p, tags: e.target.value }))} />
            </div>
            <div style={s.g2}>
              <div>
                <label style={s.label}>Publish Date</label>
                <input type="date" style={s.inp} value={generatedPost.publish_date} onChange={e => setGeneratedPost(p => ({ ...p, publish_date: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Upload Status</label>
                <select style={{ ...s.sel, width: '100%' }} value={generatedPost.upload_status} onChange={e => setGeneratedPost(p => ({ ...p, upload_status: e.target.value }))}>
                  {UPLOAD_STATUSES.map(st => <option key={st}>{st}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={s.badge('gray')}>📝 {generatedPost.word_count} words</span>
              <span style={s.badge('gray')}>⏱ {generatedPost.read_time} min read</span>
              <span style={s.badge('teal')}>By JB</span>
              <span style={s.badge('teal')}>{generatedPost.category}</span>
            </div>
          </div>

          {/* Image prompts */}
          {(generatedPost.hero_image_prompt || generatedPost.inset_image_1_prompt) && (
            <div style={s.cardGold}>
              <div style={{ ...s.secLabel, color: '#f0b429' }}>🖼 AI Image Prompts</div>
              {generatedPost.hero_image_prompt && (
                <div style={s.fieldRow}>
                  <label style={{ ...s.label, color: '#f0b429' }}>Hero Image Prompt</label>
                  <textarea style={{ ...s.ta, fontSize: 12, minHeight: 54 }} value={generatedPost.hero_image_prompt} onChange={e => setGeneratedPost(p => ({ ...p, hero_image_prompt: e.target.value }))} />
                </div>
              )}
              {generatedPost.inset_image_1_prompt && (
                <div style={s.fieldRow}>
                  <label style={{ ...s.label, color: '#f0b429' }}>Inset Image 1</label>
                  <textarea style={{ ...s.ta, fontSize: 12, minHeight: 54 }} value={generatedPost.inset_image_1_prompt} onChange={e => setGeneratedPost(p => ({ ...p, inset_image_1_prompt: e.target.value }))} />
                </div>
              )}
              {generatedPost.inset_image_2_prompt && (
                <div style={s.fieldRow}>
                  <label style={{ ...s.label, color: '#f0b429' }}>Inset Image 2</label>
                  <textarea style={{ ...s.ta, fontSize: 12, minHeight: 54 }} value={generatedPost.inset_image_2_prompt} onChange={e => setGeneratedPost(p => ({ ...p, inset_image_2_prompt: e.target.value }))} />
                </div>
              )}
              <div style={{ fontSize: 11, color: '#f0b429', opacity: 0.7 }}>Use these prompts in your image generator (Midjourney, Ideogram, etc.) then upload the images and paste the URLs into the Hero Image field.</div>
            </div>
          )}

          {/* Excerpt */}
          <div style={s.card}>
            <label style={s.label}>Excerpt (for blog listing)</label>
            <textarea style={s.ta} value={generatedPost.excerpt} onChange={e => setGeneratedPost(p => ({ ...p, excerpt: e.target.value }))} />
          </div>

          {/* Content preview toggle */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={s.secLabel}>Blog Content (Markdown)</div>
              <button style={s.btnGhost} onClick={() => setPreviewMode(!previewMode)}>{previewMode ? '< Edit' : '👁 Preview'}</button>
            </div>
            {previewMode ? (
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', maxHeight: 500, overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 8, padding: 16 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(generatedPost.content) }} />
            ) : (
              <textarea style={{ ...s.ta, minHeight: 300, fontSize: 12, fontFamily: 'monospace' }}
                value={generatedPost.content} onChange={e => setGeneratedPost(p => ({ ...p, content: e.target.value }))} />
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ ...s.btnTeal, opacity: syncingToSupabase ? 0.6 : 1 }} onClick={() => pushToSupabase(generatedPost)} disabled={syncingToSupabase || syncSuccess}>
              {syncSuccess ? '✅ Saved to Supabase!' : syncingToSupabase ? '⏳ Saving...' : '☁️ Push to Supabase'}
            </button>
            <button style={s.btnGhost} onClick={() => pushToSheets(generatedPost)}>📊 Push to Sheets</button>
            <button style={s.btnGhost} onClick={() => {
              const blob = new Blob([generatedPost.content], { type: 'text/markdown' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = generatedPost.slug + '.md'; a.click();
            }}>⬇️ Download .md</button>
          </div>
          {syncSuccess && generatedPost.supabase_id && (
            <div style={{ marginTop: 8, fontSize: 11, color: c.teal }}>✅ Supabase ID: {generatedPost.supabase_id} — Change status to "Approved" in the Queue tab to schedule it!</div>
          )}
        </div>
      )}
    </div>
  );

  // ── GOOGLE DOCS IMPORTER ───────────────────────────────────
  const renderImporter = () => (
    <div>
      <div style={s.cardTeal}>
        <div style={s.secLabel}>Import from Google Docs</div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Paste a Google Doc URL below. The doc must be set to <strong style={{ color: c.white }}>"Anyone with link can view"</strong>. Gemini will convert it to clean Markdown and generate all SEO fields automatically.
        </div>
        <div style={{ fontSize: 11, background: 'rgba(0,204,204,0.06)', border: `1px solid rgba(0,204,204,0.2)`, borderRadius: 7, padding: '8px 12px', marginBottom: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          📋 <strong style={{ color: c.teal }}>How to share your doc:</strong> In Google Docs → File → Share → Change to "Anyone with the link" → Copy link → Paste below.
        </div>
        <div style={{ ...s.fieldRow }}>
          <label style={s.label}>Google Doc URL</label>
          <input style={s.inp} placeholder="https://docs.google.com/document/d/..." value={importUrl} onChange={e => setImportUrl(e.target.value)} />
        </div>
        <div style={s.g2}>
          <div>
            <label style={s.label}>Category</label>
            <select style={{ ...s.sel, width: '100%' }} value={importCategory} onChange={e => setImportCategory(e.target.value)}>
              {BLOG_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Publish Date (optional)</label>
            <input type="date" style={s.inp} value={importPublishDate} onChange={e => setImportPublishDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button style={{ ...s.btnTeal, opacity: importLoading ? 0.6 : 1 }} onClick={importFromGoogleDoc} disabled={importLoading}>
            {importLoading ? '⏳ Importing...' : '📥 Import & Convert to Markdown'}
          </button>
          {importStatus && <div style={{ fontSize: 12, color: importStatus.startsWith('✅') ? c.teal : importStatus.startsWith('❌') ? '#ff6b87' : c.muted }}>{importStatus}</div>}
        </div>
      </div>

      {importedContent && generatedPost && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: c.teal, marginBottom: 12 }}>✅ Import Ready — Review & Push</div>

          <div style={s.card}>
            <div style={s.secLabel}>Imported & Cleaned</div>
            <div style={s.g2}>
              <div style={s.fieldRow}>
                <label style={s.label}>Title</label>
                <input style={s.inp} value={generatedPost.title} onChange={e => setGeneratedPost(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={s.fieldRow}>
                <label style={s.label}>Category</label>
                <select style={{ ...s.sel, width: '100%' }} value={generatedPost.category} onChange={e => setGeneratedPost(p => ({ ...p, category: e.target.value }))}>
                  {BLOG_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>Meta Description</label>
              <textarea style={s.ta} value={generatedPost.meta_description} onChange={e => setGeneratedPost(p => ({ ...p, meta_description: e.target.value }))} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>SEO Keywords</label>
              <input style={s.inp} value={generatedPost.seo_keywords} onChange={e => setGeneratedPost(p => ({ ...p, seo_keywords: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={s.badge('gray')}>📝 {generatedPost.word_count} words</span>
              <span style={s.badge('gray')}>⏱ {generatedPost.read_time} min read</span>
              <span style={s.badge('teal')}>Imported</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={s.secLabel}>Content Preview (Markdown)</div>
              <button style={s.btnGhost} onClick={() => setPreviewMode(!previewMode)}>{previewMode ? '< Edit' : '👁 Preview'}</button>
            </div>
            {previewMode ? (
              <div style={{ fontSize: 14, lineHeight: 1.75, maxHeight: 400, overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 8, padding: 14, color: 'rgba(255,255,255,0.85)' }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(generatedPost.content) }} />
            ) : (
              <textarea style={{ ...s.ta, minHeight: 250, fontSize: 12, fontFamily: 'monospace' }}
                value={generatedPost.content} onChange={e => setGeneratedPost(p => ({ ...p, content: e.target.value }))} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ ...s.btnTeal, opacity: syncingToSupabase ? 0.6 : 1 }} onClick={() => pushToSupabase(generatedPost)} disabled={syncingToSupabase || syncSuccess}>
              {syncSuccess ? '✅ Saved to Supabase!' : syncingToSupabase ? '⏳ Saving...' : '☁️ Push to Supabase'}
            </button>
            <button style={s.btnGhost} onClick={() => pushToSheets(generatedPost)}>📊 Push to Sheets</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── QUEUE ──────────────────────────────────────────────────
  const renderQueue = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Blog Queue ({queue.length})</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={s.btnGhost} onClick={loadQueue} disabled={queueLoading}>{queueLoading ? '⏳' : '↻ Refresh'}</button>
          <button style={{ ...s.btnTeal, opacity: newsletterLoading ? 0.6 : 1 }} onClick={generateNewsletter} disabled={newsletterLoading}>
            {newsletterLoading ? '⏳ Writing...' : '📧 Generate Newsletter'}
          </button>
        </div>
      </div>

      <div style={s.statGrid}>
        {UPLOAD_STATUSES.map(st => (
          <div key={st} style={s.stat}>
            <div style={{ ...s.statN, fontSize: 18, color: st === 'Published to Site' ? '#4ade80' : st === 'Approved' || st === 'Scheduled' ? '#c084fc' : st === 'Review' ? '#f0b429' : c.muted }}>
              {queue.filter(p => p.upload_status === st).length}
            </div>
            <div style={s.statL}>{st.replace(' to Site', '')}</div>
          </div>
        ))}
      </div>

      {queueError && <div style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', color: '#ff6b87', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{queueError}</div>}
      {queue.length === 0 && !queueLoading && <div style={{ ...s.card, textAlign: 'center', color: c.muted, padding: '2rem' }}>No blog posts yet. Generate some from the Generator tab!</div>}

      {queue.map(post => (
        <div key={post.id} style={s.qRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={s.badge(statusColor(post.upload_status))}>{post.upload_status}</span>
              <span style={s.badge('teal')}>{post.category}</span>
              {post.word_count > 0 && <span style={s.badge('gray')}>{post.word_count} words</span>}
              {post.publish_date && <span style={{ fontSize: 10, color: c.muted }}>📅 {post.publish_date}</span>}
            </div>
          </div>
          <select style={{ ...s.sel, fontSize: 11, flexShrink: 0 }} value={post.upload_status} onChange={e => updateQueueStatus(post.id, e.target.value)}>
            {UPLOAD_STATUSES.map(st => <option key={st}>{st}</option>)}
          </select>
        </div>
      ))}

      {newsletter && (
        <div style={{ ...s.card, marginTop: 16, borderColor: 'rgba(109,61,156,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ ...s.secLabel, color: '#c084fc' }}>📧 Newsletter — {newsletter.month}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={s.btnGhost} onClick={() => { navigator.clipboard.writeText(newsletter.content); alert('Copied!'); }}>Copy MD</button>
              <button style={s.btnGhost} onClick={() => setNewsletter(null)}>✕</button>
            </div>
          </div>
          <textarea style={{ ...s.ta, minHeight: 300, fontSize: 12, fontFamily: 'monospace' }} value={newsletter.content} readOnly />
        </div>
      )}
    </div>
  );

// ── MAIN RENDER ────────────────────────────────────────────
  return (
    <SidebarWrapper currentTab={tab} onTabChange={setTab}>
      <div style={s.wrap}>

      {!apiKey && (
        <div style={{ background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.3)', color: '#f0b429', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
          ⚠️ No Gemini API key set.{' '}
          <button
            style={{ background: 'none', border: 'none', color: '#f0b429', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}
            onClick={() => setTab('settings')}
          >
            Open Settings
          </button>{' '}
          to add your key.
        </div>
      )}

      
      {tab === 'ideas'     && renderIdeas()}
      {tab === 'generator' && renderGenerator()}
      {tab === 'importer'  && renderImporter()}
      {tab === 'queue'     && renderQueue()}
      {tab === 'settings'  && <SettingsPanel onSignOut={() => { window.location.hash = '#/'; window.location.reload(); }} />}
    </div>
    </SidebarWrapper>
  );
}
