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
    <div dir="rtl" className="min-h-screen flex font-heebo">
      {/* LEFT SIDE — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">
          <h2 className="text-2xl font-bold text-sc-dark mb-1">ברוכים השבים</h2>
          <p className="text-sc-gray text-sm mb-8">התחברו לחשבון שלכם</p>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sc-dark text-sm font-medium mb-1.5">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="sc-input"
              />
            </div>

            <div>
              <label className="block text-sc-dark text-sm font-medium mb-1.5">סיסמה</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="sc-input pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-sc-gray cursor-pointer text-base p-0"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-sc-error/30 rounded-[10px] px-4 py-3 text-sc-error text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={signIn.isPending}
              className="sc-btn-primary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signIn.isPending ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-sc-gray-light" />
            <span className="text-sc-gray text-sm">או</span>
            <div className="flex-1 h-px bg-sc-gray-light" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-sc-gray-light rounded-lg hover:bg-sc-bg transition-colors text-sm font-medium text-sc-dark cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            המשך עם Google
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-sc-gray mt-8">
            אין לך חשבון?{' '}
            <Link to="/register" className="text-sc-blue font-semibold hover:underline">
              הירשם עכשיו
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE — Branding Panel */}
      <div className="hidden lg:flex flex-col items-center justify-center w-[480px] bg-sc-blue-deep text-white px-10 py-12 relative">
        {/* Logo + Badge */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.svg" alt="SC" className="h-10" />
          <span className="text-xl font-bold tracking-tight">
            Silver <span className="text-amber-400">Castle</span>
          </span>
        </div>

        {/* Headlines */}
        <h2 className="text-2xl font-bold text-center leading-relaxed mb-3">
          הפלטפורמה שמלווה את<br />ההתחדשות העירונית
        </h2>
        <p className="text-white/70 text-center text-sm mb-12">
          מהדייר הראשון ועד המפתח
        </p>

        {/* Stats */}
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-3xl font-extrabold">500+</div>
            <div className="text-white/60 text-xs mt-1">פרויקטים</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">12K</div>
            <div className="text-white/60 text-xs mt-1">דיירים</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">98%</div>
            <div className="text-white/60 text-xs mt-1">שביעות רצון</div>
          </div>
        </div>
      </div>
    </div>
  )
}
