import React, { useState, useEffect } from 'react'
import BlogGenerator from './components/BlogGenerator.jsx'
import LandingPage from './components/LandingPage.jsx'

// ── Simple password gate so only JB can access ──────────────
// Change this password to whatever you want
const ACCESS_PASSWORD = 'glovesos2026'

const s = {
  loginWrap: {
    minHeight: '100vh', background: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Space Grotesk', system-ui, sans-serif", padding: 24
  },
  loginBox: {
    background: '#111', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 380,
    textAlign: 'center'
  },
  logoThe: {
    fontFamily: "'Nunito', sans-serif", fontStyle: 'italic',
    fontWeight: 900, fontSize: 16, color: '#fff', display: 'block'
  },
  logoSOS: {
    fontFamily: "'Bebas Neue', system-ui", fontSize: 48,
    color: '#fff', letterSpacing: 2, lineHeight: 1, display: 'block'
  },
  logoShed: {
    fontFamily: "'Bebas Neue', system-ui", fontSize: 14,
    color: '#00CCCC', letterSpacing: '0.25em', display: 'block', marginBottom: 32
  },
  inp: {
    width: '100%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 9, padding: '11px 14px', color: '#fff', fontSize: 14,
    fontFamily: "'Space Grotesk', system-ui", outline: 'none', marginBottom: 12
  },
  btn: {
    width: '100%', background: '#00CCCC', color: '#000',
    border: 'none', borderRadius: 9, padding: '12px 20px',
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui",
    letterSpacing: '0.06em', textTransform: 'uppercase'
  },
  backLink: {
    marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.55)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui", letterSpacing: '0.06em',
  },
  err: { fontSize: 12, color: '#ff6b87', marginTop: 8 }
}

function LoginScreen({ onLogin, onBack }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const attempt = () => {
    if (pw === ACCESS_PASSWORD) { onLogin(); setErr('') }
    else { setErr('Wrong password. Try again.'); setPw('') }
  }

  return (
    <div style={s.loginWrap}>
      <div style={s.loginBox}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <span style={s.logoThe}>The Glove</span>
          <span style={s.logoSOS}>SOS</span>
          <span style={s.logoShed}>Tool Shed</span>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Admin Access Only</div>
        </div>
        <input
          style={s.inp} type="password"
          placeholder="Enter access password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          autoFocus
        />
        <button style={s.btn} onClick={attempt}>Enter Tool Shed</button>
        {err && <div style={s.err}>{err}</div>}
        {onBack && (
          <button style={s.backLink} onClick={onBack}>← Back to landing page</button>
        )}
      </div>
    </div>
  )
}

// ── Hash-based route: '#/' = landing, '#/admin' = admin gate/app ──
const readRoute = () => (window.location.hash === '#/admin' ? 'admin' : 'landing')

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    // Stay logged in for 24 hours
    const saved = localStorage.getItem('toolshed_auth')
    if (saved) {
      try {
        const { ts } = JSON.parse(saved)
        if (Date.now() - ts < 24 * 60 * 60 * 1000) setAuthed(true)
        else localStorage.removeItem('toolshed_auth')
      } catch {
        localStorage.removeItem('toolshed_auth')
      }
    }
  }, [])

  const goAdmin = () => { window.location.hash = '#/admin' }
  const goLanding = () => { window.location.hash = '#/' }

  const handleLogin = () => {
    setAuthed(true)
    localStorage.setItem('toolshed_auth', JSON.stringify({ ts: Date.now() }))
  }

  if (route === 'landing') {
    return <LandingPage onEnterAdmin={goAdmin} />
  }

  // route === 'admin'
  if (!authed) return <LoginScreen onLogin={handleLogin} onBack={goLanding} />
  return <BlogGenerator />
}
