import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { getDeviceInfo } from '../lib/deviceInfo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  const joinByCode = trpc.organizer.joinByCode.useMutation()

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: async (data) => {
      localStorage.setItem('sb-token', data.accessToken)
      if ((data as any).refreshToken) localStorage.setItem('sb-refresh-token', (data as any).refreshToken)
      const pendingCode = localStorage.getItem('pending_join_code')
      if (pendingCode) {
        localStorage.removeItem('pending_join_code')
        try { await joinByCode.mutateAsync({ code: pendingCode }) } catch {}
      }
      const role = data.user.role
      if (role === 'manager') window.location.replace('/manager')
      else if (role === 'provider') window.location.replace('/provider')
      else if (role === 'companion') window.location.replace('/manager')
      else if (role === 'organizer') window.location.replace('/organizer')
      else window.location.replace('/dashboard')
    },
    onError: (err) => setError(err.message || 'אימייל או סיסמה שגויים'),
  })

  const handleGoogle = () => {
    const SUPABASE_URL = 'https://supabase.byclick.co.il'
    const ANON_KEY = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3MDAwMDAwMDAsICJleHAiOiAyMDAwMDAwMDAwfQ.wTmOz3TCdhnx-swY9p2aHf6gvg9zgI0_TLTs8W28Ris'
    const redirectTo = encodeURIComponent('https://urbanflow.byclick.co.il/dashboard')
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&apikey=${ANON_KEY}`
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    signIn.mutate({
      email,
      password,
      deviceInfo: getDeviceInfo(),
    })
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#020817', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Background glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.svg" alt="SC" style={{ height: 52, marginBottom: 12, filter: 'drop-shadow(0 0 16px rgba(37,99,235,0.4))' }} />
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
              Silver <span style={{ color: '#F59E0B' }}>Castle</span>
            </div>
            <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>פלטפורמת ניהול התחדשות עירונית</div>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '36px 32px', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 24px', textAlign: 'center' }}>כניסה למערכת</h2>

          {/* Google */}
          <button onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 0', color: '#E2E8F0', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 20, transition: 'all .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            המשך עם Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#475569', fontSize: 13 }}>או</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>אימייל</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>סיסמה</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', paddingLeft: 44, color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#FCA5A5', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={signIn.isPending} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: signIn.isPending ? '#1E3A5F' : 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: signIn.isPending ? 'not-allowed' : 'pointer', boxShadow: signIn.isPending ? 'none' : '0 6px 24px rgba(37,99,235,0.35)', transition: 'all .2s' }}>
              {signIn.isPending ? '⏳ מתחבר...' : 'כניסה ←'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: '#475569', fontSize: 14 }}>אין לך חשבון? </span>
          <Link to="/register" style={{ color: '#3B82F6', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>הרשמה חינם</Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" style={{ color: '#334155', fontSize: 12, textDecoration: 'none' }}>← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  )
}
