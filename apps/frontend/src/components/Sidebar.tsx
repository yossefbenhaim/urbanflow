import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS, clearTokens } from '../hooks/useUser'
import { trpc } from '../lib/trpc'

// ── Bell / Notifications ──────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('sb-token')

  const { data: notifications = [], refetch } = trpc.tenant.getNotifications.useQuery(undefined, {
    enabled: !!token,
    refetchInterval: 15000,
    staleTime: 10000,
  })
  const markRead = trpc.tenant.markNotificationsRead.useMutation({ onSuccess: () => refetch() })

  const unread = (notifications as any[]).filter(n => !n.is_read).length

  useEffect(() => {
    const h = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) {
      markRead.mutate()
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`relative w-11 h-11 rounded-[12px] border-none cursor-pointer flex items-center justify-center text-xl transition-colors ${open ? 'bg-sc-light-blue' : 'bg-transparent hover:bg-sc-bg'}`}
        title="התראות"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        🔔
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-sc-error text-white text-[10px] font-extrabold leading-none w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-sc-border z-[9999] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-sc-border/50 flex items-center justify-between">
            <span className="font-bold text-[15px] text-sc-text">🔔 התראות</span>
            {unread > 0 && <span className="text-xs text-sc-text-light">{unread} חדשות</span>}
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {(notifications as any[]).length === 0 ? (
              <div className="py-6 px-4 text-center text-sc-text-light">
                <div className="text-[28px] mb-2">🎉</div>
                <p className="text-[13px] m-0">אין התראות חדשות</p>
              </div>
            ) : (
              (notifications as any[]).map((n: any) => (
                <div key={n.id} className={`px-4 py-3 border-b border-sc-border/30 transition-colors ${n.is_read ? 'bg-white' : 'bg-sc-light-blue'}`}>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-lg flex-shrink-0">
                      {n.type === 'message' ? '💬' : n.type === 'poll' ? '🗳️' : n.type === 'meeting' ? '📅' : n.type === 'document' ? '📄' : '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`m-0 text-[13px] text-sc-text ${n.is_read ? 'font-normal' : 'font-semibold'}`}>{n.title}</p>
                      {n.message && <p className="m-0 mt-0.5 text-xs text-sc-text-light">{n.message}</p>}
                      <p className="m-0 mt-1 text-[11px] text-sc-text-light">
                        {new Date(n.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-sc-primary flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { profile, loading, signOut } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sb-token') : null

  const { data: myRole } = trpc.tenant.getMyRole.useQuery(undefined, {
    enabled: !!token && profile?.role === 'tenant',
  })
  const isRepresentative = (myRole as any)?.isRepresentative || false

  if (loading || !profile) return null

  const roleInfo = ROLE_LABELS[profile.role ?? ''] ?? { label: '', icon: '👤', color: '' }
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  const dashLink =
    profile.role === 'organizer' ? '/organizer' :
    profile.role === 'provider'  ? '/provider'  :
    profile.role === 'manager'   ? '/manager'   : '/dashboard'

  type NavItem = { to: string; icon: string; label: string }

  const navItems: NavItem[] = [
    { to: dashLink, icon: '🏠', label: 'ראשי' },
  ]

  if (profile.role === 'tenant') {
    navItems.push({ to: '/onboarding', icon: '📄', label: 'מסמכים' })
    if (isRepresentative) {
      navItems.push({ to: '/committee-actions', icon: '🏛️', label: 'פעולות ועד' })
      navItems.push({ to: '/directory', icon: '📋', label: 'ספרייה' })
    }
  }
  if (profile.role === 'organizer') {
    navItems.push({ to: '/organizer', icon: '📊', label: 'הפרויקטים שלי' })
  }
  if (profile.role === 'provider') {
    navItems.push({ to: '/quotes', icon: '📋', label: 'הצעות מחיר' })
  }
  navItems.push({ to: '/chat', icon: '💬', label: 'צ\'אט' })
  navItems.push({ to: '/profile', icon: '👤', label: 'פרופיל' })

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.to)
    return (
      <Link
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3.5 py-[11px] rounded-[10px] no-underline text-[15px] transition-all ${
          active
            ? 'bg-sc-light-blue text-sc-primary font-bold'
            : 'bg-transparent text-sc-text-light font-medium hover:bg-sc-bg'
        }`}
      >
        <span className="text-xl w-[26px] text-center">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col py-4 px-3">

      {/* Logo */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Silver Castle" className="w-9 h-9 rounded-[10px]" />
          <div>
            <div className="text-[15px] font-extrabold text-sc-text">Silver Castle</div>
            <div className="text-[11px] text-sc-text-light">טירת כסף</div>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* User card */}
      <div className="bg-sc-light-blue rounded-2xl px-3.5 py-3 mb-5 border border-sc-light-blue">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-sc-primary text-white font-extrabold text-base flex items-center justify-center flex-shrink-0">
            {(profile.fullName || profile.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-sc-text overflow-hidden text-ellipsis whitespace-nowrap">
              {profile.fullName || profile.email}
            </div>
            <div className="text-xs text-sc-text-light mt-0.5">
              {roleInfo.icon} {roleInfo.label}
              {isRepresentative && <span className="mr-1.5 text-sc-gold-dark font-semibold">• ועד 🏛️</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        <div className="text-[11px] font-semibold text-sc-text-light px-3.5 mb-1 tracking-wider">ניווט</div>
        {navItems.map(item => <NavLink key={item.to} item={item} />)}
      </nav>

      {/* Sign out */}
      <div className="border-t border-sc-border pt-3 mt-2">
        <button
          onClick={() => { signOut(); setMobileOpen(false) }}
          className="w-full flex items-center gap-3 px-3.5 py-[11px] rounded-[12px] border-none bg-transparent cursor-pointer text-sc-error text-sm font-medium transition-colors hover:bg-sc-error/10"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="text-xl w-[26px] text-center">🚪</span>
          <span>התנתק</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (fixed right) ─────────────────────────────────── */}
      <div className="sidebar-desktop fixed top-0 right-0 bottom-0 w-[220px] bg-white border-l border-sc-border z-[100] flex flex-col">
        <SidebarContent />
      </div>

      {/* ── Mobile bottom bar ─────────────────────────────────────────────── */}
      <div className="sidebar-mobile fixed bottom-0 left-0 right-0 bg-white border-t border-sc-border py-2 px-1 pb-3 flex items-center justify-around z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {navItems.slice(0, 4).map(item => {
          const active = isActive(item.to)
          return (
            <Link key={item.to} to={item.to} className="no-underline flex flex-col items-center gap-[3px] flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-sc-light-blue' : ''}`}>
                <span className="text-[22px]">{item.icon}</span>
              </div>
              <span className={`text-[10px] ${active ? 'text-sc-primary font-bold' : 'text-sc-text-light font-normal'}`}>
                {item.label.split(' ')[0]}
              </span>
            </Link>
          )
        })}
        {/* Bell in mobile bar */}
        <div className="flex-1 flex flex-col items-center gap-[3px]">
          <NotificationBell />
          <span className="text-[10px] text-sc-text-light">התראות</span>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
        }
      `}</style>
    </>
  )
}
