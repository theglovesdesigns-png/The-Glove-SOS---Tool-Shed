import React from 'react'

const c = {
  teal: '#00CCCC',
  gold: '#B8860B',
  bg: '#07070f',
  bg2: '#0f0f1a',
  bg3: '#14141f',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.13)',
  muted: 'rgba(255,255,255,0.55)',
  white: '#fff',
}

const s = {
  page: {
    minHeight: '100vh',
    background: `radial-gradient(1200px 600px at 15% -10%, rgba(0,204,204,0.12), transparent 60%),
                 radial-gradient(900px 500px at 110% 10%, rgba(109,61,156,0.15), transparent 60%),
                 ${c.bg}`,
    color: c.white,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', borderBottom: `1px solid ${c.border}`,
    position: 'sticky', top: 0, zIndex: 10,
    background: 'rgba(7,7,15,0.72)', backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  navBrand: {
    display: 'flex', alignItems: 'baseline', gap: 8,
    fontFamily: "'Bebas Neue', system-ui", letterSpacing: 2,
  },
  navBrandSOS: { fontSize: 22, color: c.white, lineHeight: 1 },
  navBrandShed: { fontSize: 12, color: c.teal, letterSpacing: '0.25em' },
  navLinks: { display: 'flex', gap: 8, alignItems: 'center' },
  navLink: {
    color: c.muted, fontSize: 13, fontWeight: 600, padding: '8px 12px',
    borderRadius: 8, textDecoration: 'none', cursor: 'pointer',
    background: 'none', border: 'none', fontFamily: 'inherit',
  },
  navCta: {
    background: c.teal, color: '#000', border: 'none',
    borderRadius: 9, padding: '10px 18px',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  hero: {
    maxWidth: 1100, margin: '0 auto',
    padding: '88px 24px 56px', textAlign: 'center',
  },
  eyebrow: {
    display: 'inline-block',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: c.teal,
    padding: '6px 12px', borderRadius: 999,
    background: 'rgba(0,204,204,0.08)',
    border: '1px solid rgba(0,204,204,0.25)',
    marginBottom: 28,
  },
  logoThe: {
    fontFamily: "'Nunito', sans-serif", fontStyle: 'italic',
    fontWeight: 900, fontSize: 22, color: c.white, display: 'block',
  },
  logoSOS: {
    fontFamily: "'Bebas Neue', system-ui",
    fontSize: 'clamp(72px, 12vw, 132px)',
    color: c.white, letterSpacing: 4, lineHeight: 0.95, display: 'block',
  },
  logoShed: {
    fontFamily: "'Bebas Neue', system-ui",
    fontSize: 'clamp(16px, 1.6vw, 20px)',
    color: c.teal, letterSpacing: '0.35em', display: 'block',
    marginTop: 6, marginBottom: 32,
  },
  tagline: {
    fontSize: 'clamp(18px, 2.1vw, 22px)',
    color: 'rgba(255,255,255,0.82)',
    maxWidth: 680, margin: '0 auto 14px', lineHeight: 1.5,
  },
  sub: {
    fontSize: 14, color: c.muted,
    maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.6,
  },
  ctaRow: {
    display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
  },
  btnPrimary: {
    background: c.teal, color: '#000', border: 'none',
    borderRadius: 10, padding: '14px 26px',
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  btnGhost: {
    background: 'transparent', color: c.white,
    border: `1px solid ${c.border2}`,
    borderRadius: 10, padding: '14px 22px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  statsRow: {
    display: 'flex', gap: 28, justifyContent: 'center',
    flexWrap: 'wrap', marginTop: 40,
    color: c.muted, fontSize: 12, letterSpacing: '0.18em',
    textTransform: 'uppercase', fontWeight: 600,
  },
  stat: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 999, background: c.teal },
  features: {
    maxWidth: 1100, margin: '0 auto',
    padding: '40px 24px 80px',
    display: 'grid', gap: 18,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  card: {
    background: c.bg2, border: `1px solid ${c.border}`,
    borderRadius: 14, padding: 22,
    transition: 'border-color 150ms ease, transform 150ms ease',
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,204,204,0.08)',
    border: '1px solid rgba(0,204,204,0.25)',
    fontSize: 20, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: 800, marginBottom: 6, color: c.white },
  cardBody: { fontSize: 13, color: c.muted, lineHeight: 1.55 },
  cta: {
    maxWidth: 980, margin: '0 auto 72px',
    padding: 32,
    border: `1px solid ${c.border2}`,
    borderRadius: 18,
    background: `linear-gradient(135deg, rgba(0,204,204,0.06), rgba(109,61,156,0.08))`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 20, flexWrap: 'wrap',
  },
  ctaText: { fontSize: 18, fontWeight: 700, maxWidth: 560, lineHeight: 1.4 },
  ctaSub: { fontSize: 13, color: c.muted, marginTop: 6 },
  footer: {
    borderTop: `1px solid ${c.border}`,
    padding: '24px 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
    color: c.muted, fontSize: 12,
  },
  footerLinks: { display: 'flex', gap: 18, flexWrap: 'wrap' },
  footerLink: { color: c.muted, textDecoration: 'none' },
}

const FEATURES = [
  { icon: '💡', title: 'Topic Ideation', body: 'Gemini-backed topic research tuned to the season and to topics JB has not rejected before.' },
  { icon: '✨', title: 'Blog Generator', body: 'One-click long-form drafts in JB’s voice, with SEO, tags, excerpt, and hero-image prompts.' },
  { icon: '📥', title: 'Google Docs Import', body: 'Paste a shared Doc URL; the AI cleans the text into Markdown and fills in metadata.' },
  { icon: '📋', title: 'Editorial Queue', body: 'Review, schedule, and push content to Supabase or a Google Sheet without leaving the app.' },
]

export default function LandingPage({ onEnterAdmin }) {
  const goAdmin = (e) => {
    e?.preventDefault?.()
    onEnterAdmin?.()
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <span style={s.navBrandSOS}>GLOVE SOS</span>
          <span style={s.navBrandShed}>TOOL SHED</span>
        </div>
        <div style={s.navLinks}>
          <a style={s.navLink} href="https://theglovesos.com" target="_blank" rel="noreferrer">Main site ↗</a>
          <button style={s.navCta} onClick={goAdmin}>Admin Login</button>
        </div>
      </nav>

      <section style={s.hero}>
        <span style={s.eyebrow}>Internal content workbench</span>
        <div>
          <span style={s.logoThe}>The Glove</span>
          <span style={s.logoSOS}>SOS</span>
          <span style={s.logoShed}>Tool Shed</span>
        </div>
        <p style={s.tagline}>
          JB’s in-house workshop for drafting, importing, and shipping blog content for
          TheGloveSOS.com — without fighting a CMS.
        </p>
        <p style={s.sub}>
          AI-assisted writing in JB’s voice, a clean editorial queue, Google Docs import,
          and direct push to Supabase and Google Sheets. One dark room. No distractions.
        </p>
        <div style={s.ctaRow}>
          <button style={s.btnPrimary} onClick={goAdmin}>Enter the Tool Shed</button>
          <a style={s.btnGhost} href="https://theglovesos.com" target="_blank" rel="noreferrer">
            Visit TheGloveSOS.com ↗
          </a>
        </div>
        <div style={s.statsRow}>
          <div style={s.stat}><span style={s.dot} /> Canal Winchester, OH</div>
          <div style={s.stat}><span style={s.dot} /> Gemini · Supabase · Sheets</div>
          <div style={s.stat}><span style={s.dot} /> Admin-only tooling</div>
        </div>
      </section>

      <section style={s.features}>
        {FEATURES.map((f) => (
          <div key={f.title} style={s.card}>
            <div style={s.cardIcon}>{f.icon}</div>
            <div style={s.cardTitle}>{f.title}</div>
            <div style={s.cardBody}>{f.body}</div>
          </div>
        ))}
      </section>

      <section style={{ padding: '0 24px' }}>
        <div style={s.cta}>
          <div>
            <div style={s.ctaText}>Ready to get a post out the door?</div>
            <div style={s.ctaSub}>Sign in with the admin password to open the workbench.</div>
          </div>
          <button style={s.btnPrimary} onClick={goAdmin}>Admin Login →</button>
        </div>
      </section>

      <footer style={s.footer}>
        <div>© {new Date().getFullYear()} TheGloveSOS. Internal tooling.</div>
        <div style={s.footerLinks}>
          <a style={s.footerLink} href="https://theglovesos.com" target="_blank" rel="noreferrer">theglovesos.com</a>
          <button style={{ ...s.footerLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }} onClick={goAdmin}>Admin</button>
        </div>
      </footer>
    </div>
  )
}
