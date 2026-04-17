import React, { useState, useEffect } from 'react'

const c = {
  teal: '#00CCCC',
  gold: '#B8860B',
  bg2: '#0f0f1a',
  bg3: '#14141f',
  bg4: '#1c1c2e',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.13)',
  muted: 'rgba(255,255,255,0.45)',
  white: '#fff',
  danger: '#ff6b87',
  success: '#3ddc97',
}

const s = {
  card: {
    background: c.bg2, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: 18, marginBottom: 14,
  },
  cardTeal: {
    background: 'rgba(0,204,204,0.04)',
    border: `1px solid rgba(0,204,204,0.25)`,
    borderRadius: 12, padding: 18, marginBottom: 14,
  },
  secLabel: {
    fontSize: 11, fontWeight: 800, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: c.teal, marginBottom: 12,
  },
  row: { marginBottom: 14 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'rgba(255,255,255,0.72)', marginBottom: 6,
  },
  help: { fontSize: 11, color: c.muted, marginTop: 6, lineHeight: 1.5 },
  inp: {
    width: '100%', background: c.bg3,
    border: `1px solid ${c.border2}`, borderRadius: 8,
    padding: '10px 12px', color: c.white, fontSize: 13,
    fontFamily: "'Space Grotesk', system-ui", outline: 'none',
  },
  btnTeal: {
    background: c.teal, color: '#000', border: 'none',
    borderRadius: 9, padding: '10px 18px',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui",
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  btnGhost: {
    background: 'transparent', color: c.white,
    border: `1px solid ${c.border2}`,
    borderRadius: 9, padding: '10px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui",
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  btnDanger: {
    background: 'rgba(255,107,135,0.1)',
    color: c.danger,
    border: '1px solid rgba(255,107,135,0.35)',
    borderRadius: 9, padding: '10px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui",
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  statusOk: { fontSize: 12, color: c.success, fontWeight: 700 },
  statusWarn: { fontSize: 12, color: '#f0b429', fontWeight: 700 },
  inputWithToggle: { position: 'relative' },
  toggleBtn: {
    position: 'absolute', right: 8, top: 7,
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${c.border2}`,
    color: c.muted, fontSize: 10, fontWeight: 700,
    padding: '5px 9px', borderRadius: 6, cursor: 'pointer',
    fontFamily: "'Space Grotesk', system-ui",
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
}

const FIELDS = [
  {
    key: 'gemini_key',
    label: 'Gemini API Key',
    placeholder: 'AIza…',
    help: 'Used for topic research, blog writing, Doc cleanup, and newsletter generation. Get one at aistudio.google.com.',
    secret: true,
  },
  {
    key: 'override_SUPABASE_URL',
    label: 'Supabase REST URL',
    placeholder: 'https://your-project.supabase.co/rest/v1',
    help: 'REST endpoint for the blog posts table. Include the /rest/v1 suffix.',
    secret: false,
  },
  {
    key: 'override_SUPABASE_ANON_KEY',
    label: 'Supabase Anon Key',
    placeholder: 'eyJhbGciOi…',
    help: 'Anon public key. Row-level security in Supabase controls what it can do.',
    secret: true,
  },
  {
    key: 'override_GOOGLE_SHEETS_URL',
    label: 'Google Sheets Web App URL',
    placeholder: 'https://script.google.com/macros/s/…/exec',
    help: 'Apps Script web app endpoint for the editorial queue sheet. Optional — only needed if pushing to Sheets.',
    secret: false,
  },
]

const masked = (val) => {
  if (!val) return ''
  if (val.length <= 8) return '•'.repeat(val.length)
  return val.slice(0, 4) + '•'.repeat(Math.max(4, val.length - 8)) + val.slice(-4)
}

export default function SettingsPanel({ onSignOut }) {
  const [values, setValues] = useState(() => {
    const next = {}
    for (const f of FIELDS) next[f.key] = localStorage.getItem(f.key) || ''
    return next
  })
  const [shown, setShown] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2200)
    return () => clearTimeout(t)
  }, [saved])

  const update = (key, val) => setValues((v) => ({ ...v, [key]: val }))

  const save = () => {
    for (const f of FIELDS) {
      const v = (values[f.key] || '').trim()
      if (v) localStorage.setItem(f.key, v)
      else localStorage.removeItem(f.key)
    }
    setSaved(true)
  }

  const clearField = (key) => {
    update(key, '')
    localStorage.removeItem(key)
  }

  const signOut = () => {
    if (!confirm('Sign out of the Tool Shed? Your saved API keys stay on this device.')) return
    localStorage.removeItem('toolshed_auth')
    onSignOut?.()
  }

  return (
    <div>
      <div style={s.cardTeal}>
        <div style={s.secLabel}>API Credentials</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, marginBottom: 6 }}>
          These keys are stored only in this browser (localStorage). They never leave your machine
          except when the Tool Shed calls the matching API directly.
        </div>
      </div>

      {FIELDS.map((f) => {
        const val = values[f.key] || ''
        const show = !f.secret || shown[f.key]
        const current = localStorage.getItem(f.key) || ''
        return (
          <div style={s.card} key={f.key}>
            <div style={s.row}>
              <label style={s.label}>{f.label}</label>
              <div style={s.inputWithToggle}>
                <input
                  style={{ ...s.inp, paddingRight: f.secret ? 74 : 12 }}
                  type={show ? 'text' : 'password'}
                  placeholder={f.placeholder}
                  value={val}
                  onChange={(e) => update(f.key, e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {f.secret && (
                  <button
                    type="button"
                    style={s.toggleBtn}
                    onClick={() => setShown((p) => ({ ...p, [f.key]: !p[f.key] }))}
                  >
                    {show ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <div style={s.help}>
                {f.help}
                {current && (
                  <>
                    <br />
                    <span style={{ color: c.success }}>
                      ✓ Stored {f.secret ? `(${masked(current)})` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
            {current && (
              <button style={s.btnGhost} onClick={() => clearField(f.key)}>Clear</button>
            )}
          </div>
        )
      })}

      <div style={s.card}>
        <div style={s.actionRow}>
          <button style={s.btnTeal} onClick={save}>💾 Save Settings</button>
          {saved && <span style={s.statusOk}>✓ Saved locally</span>}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.secLabel}>Session</div>
        <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.55, marginBottom: 12 }}>
          The admin session lasts 24 hours on this browser. Sign out to force the password gate again.
        </div>
        <button style={s.btnDanger} onClick={signOut}>Sign out</button>
      </div>

      <div style={s.card}>
        <div style={s.secLabel}>About</div>
        <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6 }}>
          TheGloveSOS Tool Shed · React + Vite · Gemini · Supabase · Google Sheets.
          Password and API keys are managed client-side; this is admin-only tooling and not a public surface.
        </div>
      </div>
    </div>
  )
}
