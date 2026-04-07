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
      if (role === 'manager') navigate('/manager', { replace: true })
      else if (role === 'provider') navigate('/provider', { replace: true })
      else if (role === 'companion') navigate('/manager', { replace: true })
      else if (role === 'organizer') navigate('/organizer', { replace: true })
      else navigate('/dashboard', { replace: true })
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
    signIn.mutate({ email, password, deviceInfo: getDeviceInfo() })
  }

  return (
    <div dir="rtl" className="min-h-screen flex font-heebo">
      {/* LEFT SIDE — Login Form (appears on right in RTL) */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa] px-6 py-12">
        <div className="w-[340px]">
          <h2 className="text-[26px] font-extrabold text-[#212121] mb-1">ברוכים השבים</h2>
          <p className="text-[14px] text-[#8e8e9e] mb-8">התחברו לחשבון שלכם</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="sc-label">אימייל</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="your@email.com"
                className="sc-input h-[40px] w-[340px]"
              />
            </div>

            <div>
              <label className="sc-label">סיסמה</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="sc-input h-[40px] w-[340px] pl-10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#8e8e9e] cursor-pointer text-base p-0">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-red-600 text-[12px]">{error}</div>
            )}

            <button type="submit" disabled={signIn.isPending}
              className="bg-[#4a8c5c] text-white rounded-[10px] h-[44px] w-[340px] text-[15px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 2px 8px rgba(74,140,92,0.2)' }}>
              {signIn.isPending ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 w-[340px]">
            <div className="flex-1 h-px bg-[#eeeeee]" />
            <span className="text-[#8e8e9e] text-[13px]">או</span>
            <div className="flex-1 h-px bg-[#eeeeee]" />
          </div>

          <button onClick={handleGoogle}
            className="flex items-center justify-center gap-3 bg-white border border-[#eeeeee] rounded-[10px] h-[42px] w-[340px] hover:bg-[#f0f0f0] transition-colors text-[14px] font-medium text-[#212121] cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            התחברות עם Google
          </button>

          <p className="text-center text-[13px] text-[#8e8e9e] mt-8 w-[340px]">
            אין לך חשבון?{' '}
            <Link to="/register" className="text-[#3b6b9c] font-semibold hover:underline">הירשם עכשיו</Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE — Dark navy panel (appears on left in RTL) */}
      <div className="hidden lg:flex relative w-[480px] flex-shrink-0">
        {/* Gold gradient border on the left edge (visual right in RTL) */}
        <div className="absolute top-0 right-0 bottom-0 w-[3px]"
          style={{ background: 'linear-gradient(to bottom, #A6895F, #8B6F47)' }} />

        <div className="flex-1 flex flex-col items-center justify-center bg-[#1e3a5f] text-white px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white/15 rounded-[9px] flex items-center justify-center text-white font-extrabold text-sm">SC</div>
            <span className="text-xl font-bold tracking-tight">
              Silver <span className="text-[#d4b876]">Castle</span>
            </span>
          </div>

          {/* Gold divider */}
          <div className="w-[50px] h-[2px] bg-[#A6895F] mb-8" />

          {/* Tagline */}
          <p className="text-[22px] text-white/85 text-center leading-relaxed mb-1">הפלטפורמה שמלווה</p>
          <p className="text-[22px] text-white/85 text-center leading-relaxed mb-3">את ההתחדשות העירונית</p>
          <p className="text-[22px] text-white font-bold text-center mb-12">מהדייר הראשון ועד המפתח</p>

          {/* Stats row */}
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-[22px] font-extrabold">500+</div>
              <div className="text-white/45 text-[11px] mt-1">בניינים</div>
            </div>
            <div>
              <div className="text-[22px] font-extrabold">12K</div>
              <div className="text-white/45 text-[11px] mt-1">דיירים</div>
            </div>
            <div>
              <div className="text-[22px] font-extrabold">98%</div>
              <div className="text-white/45 text-[11px] mt-1">שביעות רצון</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
