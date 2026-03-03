import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://supabase.byclick.co.il',
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3MDAwMDAwMDAsICJleHAiOiAyMDAwMDAwMDAwfQ.wTmOz3TCdhnx-swY9p2aHf6gvg9zgI0_TLTs8W28Ris'
)

const roles = [
  {
    key: 'tenant',
    icon: '🏠',
    title: 'דייר',
    subtitle: 'אני גר בבניין המיועד לפינוי-בינוי',
    href: '/register/tenant',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:shadow-blue-100',
    iconBg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    badgeText: 'הכי נפוץ',
  },
  {
    key: 'manager',
    icon: '🏢',
    title: 'מנהל פרויקט',
    subtitle: 'יזם / עו"ד / מנהל פרויקט המלווה פינוי-בינוי',
    href: '/register/manager',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400 hover:shadow-purple-100',
    iconBg: 'bg-purple-50',
    badge: null,
    badgeText: null,
  },
  {
    key: 'provider',
    icon: '🔧',
    title: 'נותן שירות',
    subtitle: 'אדריכל / קבלן / שמאי / עו"ד ומומחים נוספים',
    href: '/register/provider',
    border: 'border-green-200',
    hover: 'hover:border-green-400 hover:shadow-green-100',
    iconBg: 'bg-green-50',
    badge: null,
    badgeText: null,
  },
]

export default function Register() {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://urbanflow.byclick.co.il/dashboard' },
    })
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="Silver Castle" className="w-16 h-16 rounded-2xl mb-4 shadow-lg object-cover mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">הרשמה ל-Silver Castle</h1>
          <p className="text-gray-500 text-sm mt-1">בחר את סוג המשתמש שלך להמשך</p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all duration-200 mb-5"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span className="text-gray-700 font-medium text-sm">המשך עם Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">או הירשם עם אימייל</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => (
            <Link
              key={role.key}
              to={role.href}
              className={`flex items-center gap-4 p-5 bg-white rounded-2xl border-2 ${role.border} ${role.hover} hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              <div className={`w-14 h-14 ${role.iconBg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                {role.icon}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <div className="font-semibold text-gray-900 text-lg">{role.title}</div>
                  {role.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.badge}`}>
                      {role.badgeText}
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-sm mt-0.5">{role.subtitle}</div>
              </div>
              <span className="text-gray-300 text-xl flex-shrink-0">‹</span>
            </Link>
          ))}
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            כניסה למערכת
          </Link>
        </p>
      </div>
    </div>
  )
}
