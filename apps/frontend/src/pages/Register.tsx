import { Link } from 'react-router-dom'

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
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">UF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">הרשמה ל-UrbanFlow</h1>
          <p className="text-gray-500 text-sm mt-1">בחר את סוג המשתמש שלך להמשך</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => (
            <Link
              key={role.key}
              to={role.href}
              className={`flex items-center gap-4 p-5 bg-white rounded-2xl border-2 ${role.border} ${role.hover} hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 ${role.iconBg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {role.icon}
              </div>

              {/* Text */}
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

              {/* Arrow */}
              <span className="text-gray-300 text-xl flex-shrink-0">‹</span>
            </Link>
          ))}
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          כבר יש לך חשבון?{' '}
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            כניסה למערכת
          </Link>
        </p>
      </div>
    </div>
  )
}
