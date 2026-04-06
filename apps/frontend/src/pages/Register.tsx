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
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 bg-[#ebf1f7] rounded-[9px] flex items-center justify-center text-[#1e3a5f] font-bold text-sm">SC</div>
            <span className="text-[16px] font-bold text-[#212121] tracking-tight">Silver Castle</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#212121]">הצטרפו ל-Silver Castle</h1>
          <p className="text-[#8e8e9e] text-[14px] mt-1">בחרו את סוג החשבון</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.key} className="relative">
              {/* Popular badge positioned above the card */}
              {role.badgeText && (
                <span className="absolute -top-2.5 left-4 z-10 bg-[#8b6f47] text-white text-[10px] rounded-full px-2.5 py-0.5 font-bold">
                  {role.badgeText}
                </span>
              )}
              <Link
                to={role.href}
                className="bg-white rounded-[14px] border-[1.5px] border-[#eeeeee] flex items-center gap-4 px-5 h-[76px] hover:shadow-md transition-all duration-200 cursor-pointer no-underline"
              >
                {/* Icon */}
                <div className={`w-[50px] h-[50px] ${role.iconBg} rounded-[13px] flex items-center justify-center text-xl flex-shrink-0`}>
                  {role.icon}
                </div>
                {/* Text */}
                <div className="flex-1 text-right">
                  <span className="font-bold text-[#212121] text-[16px]">{role.title}</span>
                  <p className="text-[#8e8e9e] text-[12px] mt-0.5">{role.subtitle}</p>
                </div>
                {/* Arrow */}
                <span className="text-[#8e8e9e] text-[16px] flex-shrink-0">←</span>
              </Link>
            </div>
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
