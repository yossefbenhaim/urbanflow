import { Link } from 'react-router-dom'

const roles = [
  {
    key: 'tenant',
    icon: '🏠',
    title: 'דייר',
    subtitle: 'בעל דירה בפרויקט התחדשות עירונית',
    href: '/register/tenant',
    badgeText: 'הכי פופולרי',
    iconBg: 'bg-[#f5f0e8]',
  },
  {
    key: 'manager',
    icon: '🏢',
    title: 'מנהל פרויקט',
    subtitle: 'ניהול מקצועי של פרויקטי התחדשות',
    href: '/register/manager',
    badgeText: null,
    iconBg: 'bg-[#ebf1f7]',
  },
  {
    key: 'provider',
    icon: '🔧',
    title: 'נותן שירות',
    subtitle: 'אדריכלים, עורכי דין, שמאים, קבלנים',
    href: '/register/provider',
    badgeText: null,
    iconBg: 'bg-[#ebf1f7]',
  },
]

export default function Register() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-heebo" dir="rtl">
      <div className="w-full max-w-[500px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-[9px] flex items-center justify-center text-white font-extrabold text-sm">SC</div>
            <span className="text-xl font-bold text-[#212121] tracking-tight">
              Silver <span className="text-[#8b6f47]">Castle</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#212121]">הצטרפו ל-Silver Castle</h1>
          <p className="text-[#8e8e9e] text-sm mt-1">בחרו את סוג החשבון</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => (
            <Link
              key={role.key}
              to={role.href}
              className="bg-white rounded-[14px] shadow-card border border-[#eeeeee] flex items-center gap-4 p-5 hover:shadow-lg transition-all duration-200 cursor-pointer no-underline"
            >
              {/* Icon circle */}
              <div className={`w-12 h-12 ${role.iconBg} rounded-[12px] flex items-center justify-center text-xl flex-shrink-0`}>
                {role.icon}
              </div>
              {/* Text */}
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#212121] text-base">{role.title}</span>
                  {role.badgeText && (
                    <span className="bg-[#8b6f47] text-white text-[10px] rounded-full px-2.5 py-0.5 font-semibold">
                      {role.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-[#5a5a6e] text-[13px] mt-0.5">{role.subtitle}</p>
              </div>
              {/* Arrow */}
              <span className="text-[#8e8e9e] text-xl flex-shrink-0">←</span>
            </Link>
          ))}
        </div>

        {/* Login link */}
        <p className="text-center text-[13px] text-[#8e8e9e] mt-8">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-[#3b6b9c] font-semibold hover:underline">התחבר</Link>
        </p>
      </div>
    </div>
  )
}
