# TheGloveSOS Tool Shed

Admin blog generation app for TheGloveSOS.com.

## Stack
- React + Vite
- Gemini AI (blog writing)
- Supabase (blog storage)
- Google Sheets (editorial queue)

## Local Development
```
npm install
npm run dev
```

## Deploy
Connected to Netlify via GitHub. Every push to `main` auto-deploys.

## Access
Password protected. Default: `glovesos2026`
Change in `src/App.jsx` line 6.

## Environment Variables (set in Netlify dashboard)
- `VITE_GEMINI_KEY` — Gemini API key (aistudio.google.com)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_KEY` — Supabase anon key
