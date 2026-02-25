import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser, ROLE_LABELS } from '../hooks/useUser'

export default function Navbar() {
  const { profile, loading, signOut } = useUser()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const roleInfo = profile?.role ? ROLE_LABELS[profile.role] : null
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  const dashboardLink =
    profile?.role === 'manager'  ? '/manager'  :
    profile?.role === 'provider' ? '/provider' : '/dashboard'

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link to={dashboardLink} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">UF</span>
          </div>
          <span className="font-semibold text-gray-900 hidden sm:block">UrbanFlow</span>
        </Link>

        {/* User menu */}
        {!loading && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {profile?.fullName || profile?.email?.split('@')[0] || 'משתמש'}
                </p>
                {roleInfo && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleInfo.color}`}>
                    {roleInfo.icon} {roleInfo.label}
                  </span>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{profile?.fullName || 'משתמש'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[140px]">{profile?.email}</p>
                      {roleInfo && (
                        <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.color}`}>
                          {roleInfo.icon} {roleInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <Link to="/profile" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <span>👤</span> הפרופיל שלי
                  </Link>
                  <Link to={dashboardLink} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <span>🏠</span> לוח הבקרה
                  </Link>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button onClick={signOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 transition-colors font-medium">
                    <span>🚪</span> התנתקות
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
