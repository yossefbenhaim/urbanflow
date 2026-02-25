import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('sb-token', data.accessToken)
      const role = data.user.role
      if (role === 'manager') navigate('/manager')
      else if (role === 'provider') navigate('/provider')
      else navigate('/dashboard')
    },
    onError: (err) => setError(err.message || 'אימייל או סיסמה שגויים'),
  })

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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">UF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UrbanFlow</h1>
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
