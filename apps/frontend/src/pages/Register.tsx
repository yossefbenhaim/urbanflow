import { Link } from 'react-router-dom'

const roles = [
  {
    key: 'tenant',
    icon: '🏠',
    title: 'דייר',
    subtitle: 'בעל דירה בפרויקט התחדשות עירונית',
    href: '/register/tenant',
    badgeText: 'הכי פופולרי',
  },
  {
    key: 'manager',
    icon: '🏢',
    title: 'מנהל פרויקט',
    subtitle: 'ניהול מקצועי של פרויקטי התחדשות',
    href: '/register/manager',
    badgeText: null,
  },
  {
    key: 'provider',
    icon: '🔧',
    title: 'נותן שירות',
    subtitle: 'אדריכלים, עורכי דין, שמאים, קבלנים',
    href: '/register/provider',
    badgeText: null,
  },
]

export default function Register() {
  const handleGoogle = async () => {
    const SUPABASE_URL = 'https://supabase.byclick.co.il'
    const ANON_KEY = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3MDAwMDAwMDAsICJleHAiOiAyMDAwMDAwMDAwfQ.wTmOz3TCdhnx-swY9p2aHf6gvg9zgI0_TLTs8W28Ris'
    const redirectTo = encodeURIComponent('https://urbanflow.byclick.co.il/dashboard')
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&apikey=${ANON_KEY}`
  }

  return (
    <div
      className="min-h-screen bg-sc-bg flex items-center justify-center p-4 font-heebo"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.svg" alt="Silver Castle" className="h-10" />
            <span className="text-xl font-bold text-sc-dark tracking-tight">
              Silver <span className="text-amber-500">Castle</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-sc-dark">הצטרפו ל-Silver Castle</h1>
          <p className="text-sc-gray text-sm mt-1">בחרו את סוג החשבון</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => (
            <Link
              key={role.key}
              to={role.href}
              className="sc-card flex items-center gap-4 p-5 hover:border-sc-blue-light hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              {/* Icon circle */}
              <div className="w-12 h-12 bg-sc-blue-pale rounded-full flex items-center justify-center text-xl flex-shrink-0">
                {role.icon}
              </div>
              {/* Text */}
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sc-dark text-base">{role.title}</span>
                  {role.badgeText && (
                    <span className="sc-badge bg-sc-blue-pale text-sc-blue text-[11px]">
                      {role.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-sc-gray text-sm mt-0.5">{role.subtitle}</p>
              </div>
              {/* Arrow */}
              <span className="text-sc-gray-light text-xl flex-shrink-0">&#8592;</span>
            </Link>
          ))}
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-sc-gray mt-8">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-sc-blue font-semibold hover:underline">
            התחבר
          </Link>
        </p>
      </div>
    </div>
  )
}
