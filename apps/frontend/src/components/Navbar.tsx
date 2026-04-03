import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS } from '../hooks/useUser'
import { trpc } from '../lib/trpc'

// ── Notification Bell ─────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('sb-token')

  const { data: notifications = [], refetch } = trpc.tenant.getNotifications.useQuery(undefined, {
    enabled: !!token,
    refetchInterval: 15000,
    staleTime: 10000,
  })
  const markRead = trpc.tenant.markNotificationsRead.useMutation({ onSuccess: () => refetch() })
  const unread = (notifications as any[]).filter((n: any) => !n.is_read).length

  useEffect(() => {
    const h = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markRead.mutate() }}
        className="relative w-10 h-10 rounded-[10px] border-none bg-white/15 cursor-pointer flex items-center justify-center text-lg transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-white">🔔</span>
        {unread > 0 && (
          <span className="absolute top-[5px] right-[5px] bg-sc-error text-white text-[9px] font-extrabold w-[15px] h-[15px] rounded-full flex items-center justify-center border-[1.5px] border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-14 left-2 right-2 w-[300px] bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-sc-border z-[9999]">
          <div className="px-4 py-3 border-b border-sc-border/50 font-bold text-sm text-sc-text">
            🔔 התראות {unread > 0 && <span className="text-sc-text-light font-normal text-xs">({unread} חדשות)</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(notifications as any[]).length === 0 ? (
              <div className="py-5 px-4 text-center text-sc-text-light text-[13px]">
                🎉 אין התראות חדשות
              </div>
            ) : (
              (notifications as any[]).map((n: any) => (
                <div key={n.id}
                  onClick={() => { if (n.action_url) { setOpen(false); navigate(n.action_url) } }}
                  className={`px-3.5 py-2.5 border-b border-sc-border/30 ${n.is_read ? 'bg-white' : 'bg-sc-light-blue'} ${n.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex gap-2 items-start">
                    <span className="text-base flex-shrink-0">
                      {n.type === 'message' ? '💬' : n.type?.includes('meeting') ? '📅' : n.type?.includes('signature') ? '✍️' : '🔔'}
                    </span>
                    <div>
                      <p className={`m-0 text-[13px] text-sc-text ${n.is_read ? 'font-normal' : 'font-semibold'}`}>{n.title}</p>
                      {n.message && <p className="m-0 mt-0.5 text-[11px] text-sc-text-light">{n.message}</p>}
                      <p className="m-0 mt-[3px] text-[10px] text-sc-text-light">
                        {new Date(n.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
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

// ── Right Drawer ──────────────────────────────────────────────────────────────
function RightDrawer({ open, onClose, profile, isRepresentative, signOut }: {
  open: boolean; onClose: () => void
  profile: any; isRepresentative: boolean
  signOut: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const roleInfo = ROLE_LABELS[profile?.role ?? ''] ?? { label: '', icon: '👤' }

  const dashLink =
    profile?.role === 'organizer' ? '/organizer' :
    profile?.role === 'provider'  ? '/provider'  :
    profile?.role === 'manager'   ? '/manager'   : '/dashboard'

  const navItems = [
    { to: dashLink, icon: '🏠', label: 'דף הבית' },
    { to: '/chat', icon: '💬', label: 'הודעות שלי' },
    ...(profile?.role === 'tenant' && isRepresentative ? [
      { to: '/committee-actions', icon: '🏛️', label: 'פעולות ועד' },
      { to: '/directory', icon: '🔨', label: 'ספריית שירותים' },
    ] : []),
    ...(profile?.role === 'provider' ? [
      { to: '/quotes', icon: '📋', label: 'הצעות מחיר' },
    ] : []),
    { to: '/profile', icon: '👤', label: 'הפרופיל שלי' },
  ]

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[201] shadow-[-8px_0_32px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 bg-gradient-to-br from-sc-navy to-sc-primary text-white">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="logo" className="w-8 h-8 rounded-lg" />
              <span className="font-extrabold text-base">Silver Castle</span>
            </div>
            <button onClick={onClose} className="bg-white/20 border-none rounded-lg w-8 h-8 cursor-pointer text-white text-base flex items-center justify-center">
              ✕
            </button>
          </div>

          {/* User card */}
          <div className="flex items-center gap-2.5">
            <div className="w-[42px] h-[42px] rounded-full bg-white/25 flex items-center justify-center font-extrabold text-lg text-white flex-shrink-0">
              {(profile?.fullName || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm text-white">{profile?.fullName || profile?.email}</div>
              <div className="text-xs text-white/80 mt-0.5">
                {roleInfo.icon} {roleInfo.label}
                {isRepresentative && <span className="mr-1.5">• ועד 🏛️</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-[11px] font-semibold text-sc-text-light px-2 mb-1.5 tracking-wider">תפריט</div>
          {navItems.map(item => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-[12px] no-underline mb-0.5 transition-colors border-r-[3px] ${
                  active
                    ? 'bg-sc-light-blue text-sc-primary font-bold border-r-sc-primary'
                    : 'bg-transparent text-sc-text font-medium border-r-transparent hover:bg-sc-bg'
                }`}
                style={{ fontSize: 15 }}
              >
                <span className="text-xl w-7 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2.5 border-t border-sc-border">
          <button
            onClick={() => { window.dispatchEvent(new Event('open-faqbot')); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[12px] border-none mb-1.5 bg-sc-success/10 cursor-pointer text-sc-success text-sm font-semibold"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-xl w-7 text-center">💬</span>
            שאלות נפוצות
          </button>
          <button
            onClick={() => { window.dispatchEvent(new Event('open-accessibility')); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[12px] border-none mb-1.5 bg-sc-gold/10 cursor-pointer text-sc-gold-dark text-sm font-semibold"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-xl w-7 text-center">♿</span>
            נגישות
          </button>
          <button
            onClick={() => { signOut(); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[12px] border-none bg-sc-error/10 cursor-pointer text-sc-error text-sm font-semibold"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-xl w-7 text-center">🚪</span>
            התנתק
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const { profile, loading, signOut } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sb-token') : null

  const { data: myRole } = trpc.tenant.getMyRole.useQuery(undefined, {
    enabled: !!token && profile?.role === 'tenant',
  })
  const isRepresentative = (myRole as any)?.isRepresentative || false

  const dashLink =
    profile?.role === 'organizer' ? '/organizer' :
    profile?.role === 'provider'  ? '/provider'  :
    profile?.role === 'manager'   ? '/manager'   : '/dashboard'

  // Back button logic
  const isHome = location.pathname === dashLink || location.pathname === '/'

  return (
    <>
      <nav className="bg-sc-navy sticky top-0 z-50 shadow-[0_1px_8px_rgba(0,0,0,0.1)]" dir="rtl">
        <div className="max-w-[960px] mx-auto px-4 h-[54px] flex items-center justify-between">

          {/* Right side: SC badge + text */}
          <div className="flex items-center gap-2.5">
            {!loading && profile && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 border-none cursor-pointer text-white"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <Link to={dashLink} className="flex items-center gap-2 no-underline">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <img src="/logo.svg" alt="SC" className="w-5 h-5" />
              </div>
              <span className="font-bold text-[15px] text-white hidden sm:block">Silver Castle</span>
            </Link>
          </div>

          {/* Center: back button */}
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              className="bg-white/15 border-none rounded-[9px] px-3 py-1.5 cursor-pointer text-white text-sm font-bold flex items-center gap-1"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              ‹ חזרה
            </button>
          )}

          {/* Left side: notification bell + avatar */}
          <div className="flex items-center gap-2">
            {!loading && profile && <NotificationBell />}
            {!loading && profile && (
              <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(profile.fullName || profile.email || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Right Drawer */}
      {!loading && profile && (
        <RightDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          profile={profile}
          isRepresentative={isRepresentative}
          signOut={signOut}
        />
      )}
    </>
  )
}
