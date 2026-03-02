import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://supabase.byclick.co.il',
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3MDAwMDAwMDAsICJleHAiOiAyMDAwMDAwMDAwfQ.wTmOz3TCdhnx-swY9p2aHf6gvg9zgI0_TLTs8W28Ris'
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('sb-token', data.accessToken)
      const role = data.user.role
      if (role === 'manager') window.location.replace('/manager')
      else if (role === 'provider') window.location.replace('/provider')
      else if (role === 'companion') window.location.replace('/manager')
      else window.location.replace('/dashboard')
    },
    onError: (err) => setError(err.message || 'אימייל או סיסמה שגויים'),
  })

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://urbanflow.byclick.co.il/dashboard' }
    })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    signIn.mutate({ email, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="Silver Castle" className="w-16 h-16 rounded-2xl mb-4 shadow-lg object-cover mx-auto block" />
          <h1 className="text-2xl font-bold text-gray-900">Silver Castle</h1>
          <p className="text-gray-500 text-sm mt-1">פלטפורמת ניהול התחדשות עירונית</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">כניסה למערכת</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                placeholder="אימייל@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={signIn.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {signIn.isPending ? 'מתחבר...' : 'כניסה'}
            </button>
            <div className="mt-4">
                <div className="relative flex items-center justify-center text-sm text-gray-400 mb-3">
                  <span className="bg-white px-2">או</span>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                </div>
                <button type="button" onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                  המשך עם Google
                </button>
              </div>
</form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          אין לך חשבון?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  )
}
