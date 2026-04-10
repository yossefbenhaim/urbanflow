import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS, type UserProfile } from '../hooks/useUser'
import { trpc } from '../lib/trpc'
import { getSidebarItems, getCommitteeSidebarItems } from './Sidebar'

// ── Notification Bell ─────────────────────────────────────────────────────────
type Notification = { id: string; is_read: boolean; type?: string; title?: string; message?: string; created_at: string; action_url?: string }

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
  const unread = (notifications as Notification[]).filter(n => !n.is_read).length

  useEffect(() => {
    const h = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markRead.mutate() }}
        className="relative w-[30px] h-[30px] rounded-full border-none bg-white/15 cursor-pointer flex items-center justify-center text-sm transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-white">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold w-[15px] h-[15px] rounded-full flex items-center justify-center border-[1.5px] border-[#1e3a5f]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-14 left-2 right-2 w-[300px] bg-white rounded-[14px] shadow-lg border border-[#eeeeee] z-[9999]">
          <div className="px-4 py-3 border-b border-[#eeeeee] font-bold text-[13px] text-[#212121]">
            🔔 התראות {unread > 0 && <span className="text-[#5a5a6e] font-normal text-[11px]">({unread} חדשות)</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(notifications as Notification[]).length === 0 ? (
              <div className="py-5 px-4 text-center text-[#8e8e9e] text-[13px]">
                🎉 אין התראות חדשות
              </div>
            ) : (
              (notifications as Notification[]).map((n) => (
                <div key={n.id}
                  onClick={() => { if (n.action_url) { setOpen(false); navigate(n.action_url) } }}
                  className={`px-3.5 py-2.5 border-b border-[#eeeeee]/50 ${n.is_read ? 'bg-white' : 'bg-[#ebf1f7]'} ${n.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex gap-2 items-start">
                    <span className="text-base flex-shrink-0">
                      {n.type === 'message' ? '💬' : n.type?.includes('meeting') ? '📅' : n.type?.includes('signature') ? '✍️' : '🔔'}
                    </span>
                    <div>
                      <p className={`m-0 text-[13px] text-[#212121] ${n.is_read ? 'font-normal' : 'font-semibold'}`}>{n.title}</p>
                      {n.message && <p className="m-0 mt-0.5 text-[11px] text-[#5a5a6e]">{n.message}</p>}
                      <p className="m-0 mt-[3px] text-[10px] text-[#8e8e9e]">
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

// ── Right Drawer (Mobile) ─────────────────────────────────────────────────────
function RightDrawer({ open, onClose, profile, isRepresentative, signOut }: {
  open: boolean; onClose: () => void
  profile: UserProfile | null; isRepresentative: boolean
  signOut: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const roleInfo = ROLE_LABELS[profile?.role ?? ''] ?? { label: '', icon: '👤' }

  const dashLink =
    profile?.role === 'organizer' ? '/organizer' :
    profile?.role === 'provider'  ? '/provider'  :
    profile?.role === 'manager'   ? '/manager'   : '/dashboard'

  const navItems = getSidebarItems(profile?.role ?? '', isRepresentative)

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
      )}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[201] shadow-[-8px_0_32px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        dir="rtl"
      >
        <div className="px-4 pt-5 pb-4 bg-[#1e3a5f] text-white">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white rounded-[9px] flex items-center justify-center text-[#1e3a5f] font-extrabold text-[11px]">SC</div>
              <span className="font-bold text-[15px] text-white">Silver Castle</span>
            </div>
            <button onClick={onClose} className="bg-white/20 border-none rounded-lg w-8 h-8 cursor-pointer text-white text-base flex items-center justify-center">✕</button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center font-bold text-[11px] text-[#1e3a5f] flex-shrink-0">
              {(profile?.fullName || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-[13px] text-white">{profile?.fullName || profile?.email}</div>
              <div className="text-[11px] text-white/80 mt-0.5">{roleInfo.icon} {roleInfo.label}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.to)
            return (
              <Link key={item.to} to={item.to} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] no-underline mb-0.5 text-[13px] transition-colors ${
                  active ? 'bg-[#ebf1f7] text-[#3b6b9c] font-semibold' : 'bg-transparent text-[#5a5a6e] font-normal hover:bg-[#f8f9fa]'
                }`}>
                <span className="text-lg w-6 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-2.5 border-t border-[#eeeeee]">
          <button onClick={() => { signOut(); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] border-none bg-red-50 cursor-pointer text-red-600 text-[13px] font-medium">
            <span className="text-lg w-6 text-center">🚪</span>
            <span>התנתק</span>
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
  const isRepresentative = (myRole as { isRepresentative?: boolean } | undefined)?.isRepresentative || false

  const dashLink =
    profile?.role === 'organizer' ? '/organizer' :
    profile?.role === 'provider'  ? '/provider'  :
    profile?.role === 'manager'   ? '/manager'   : '/dashboard'

  // Public pages use white navbar
  const isPublic = ['/', '/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/register/')
  const isLoggedIn = !loading && profile

  return (
    <>
      <nav className={`sticky top-0 z-50 ${isPublic ? 'bg-white shadow-sm' : 'bg-[#1e3a5f]'}`} dir="rtl">
        <div className="max-w-[960px] mx-auto px-4 h-[54px] flex items-center justify-between">

          {/* Right side: hamburger + logo */}
          <div className="flex items-center gap-2.5">
            {isLoggedIn && (
              <button onClick={() => setDrawerOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 border-none cursor-pointer text-white"
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <Link to={isLoggedIn ? dashLink : '/'} className="flex items-center gap-2 no-underline">
              <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center font-extrabold text-[11px] ${isPublic ? 'bg-[#1e3a5f] text-white' : 'bg-white text-[#1e3a5f]'}`}>
                SC
              </div>
              <span className={`font-bold text-[15px] hidden sm:block ${isPublic ? 'text-[#212121]' : 'text-white'}`}>Silver Castle</span>
            </Link>
          </div>

          {/* Left side: bell + avatar */}
          <div className="flex items-center gap-2">
            {isLoggedIn && <NotificationBell />}
            {isLoggedIn && (
              <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center text-[#1e3a5f] font-bold text-[11px] flex-shrink-0">
                {(profile.fullName || profile.email || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </nav>

      {isLoggedIn && (
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
