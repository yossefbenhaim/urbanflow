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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', width: 44, height: 44, borderRadius: 12,
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
          background: open ? '#eff6ff' : 'transparent',
          transition: 'background 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        title="התראות"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 800, lineHeight: 1,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          width: 320, background: '#fff', borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
          zIndex: 9999, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>🔔 התראות</span>
            {unread > 0 && <span style={{ fontSize: 12, color: '#6b7280' }}>{unread} חדשות</span>}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {(notifications as any[]).length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                <p style={{ fontSize: 13, margin: 0 }}>אין התראות חדשות</p>
              </div>
            ) : (
              (notifications as any[]).map((n: any) => (
                <div key={n.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid #f9fafb',
                  background: n.is_read ? '#fff' : '#eff6ff',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {n.type === 'message' ? '💬' : n.type === 'poll' ? '🗳️' : n.type === 'meeting' ? '📅' : n.type === 'document' ? '📄' : '🔔'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#111827' }}>{n.title}</p>
                      {n.message && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{n.message}</p>}
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {new Date(n.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: 4 }} />}
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
    { to: dashLink, icon: '🏠', label: 'דף הבית' },
  ]

  if (profile.role === 'tenant') {
    navItems.push({ to: '/onboarding', icon: '📝', label: 'הפרופיל שלי' })
    if (isRepresentative) {
      navItems.push({ to: '/committee-actions', icon: '🏛️', label: 'פעולות ועד' })
      navItems.push({ to: '/directory', icon: '🏢', label: 'שירותים' })
    }
  }
  if (profile.role === 'organizer') {
    navItems.push({ to: '/organizer', icon: '📊', label: 'הפרויקטים שלי' })
  }
  if (profile.role === 'provider') {
    navItems.push({ to: '/quotes', icon: '📋', label: 'הצעות מחיר' })
  }
  navItems.push({ to: '/chat', icon: '💬', label: 'הודעות' })

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.to)
    return (
      <Link
        to={item.to}
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', borderRadius: 12, textDecoration: 'none',
          background: active ? '#eff6ff' : 'transparent',
          color: active ? '#2563EB' : '#374151',
          fontWeight: active ? 700 : 500,
          fontSize: 15, transition: 'all 0.15s',
          borderRight: active ? '3px solid #2563EB' : '3px solid transparent',
        }}
      >
        <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{item.icon}</span>
        <span>{item.label}</span>
        {active && <span style={{ marginRight: 'auto', color: '#2563EB', fontSize: 12 }}>●</span>}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 12px' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.svg" alt="Silver Castle" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Silver Castle</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>טירת כסף</div>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* User card */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
        borderRadius: 14, padding: '12px 14px', marginBottom: 20,
        border: '1px solid #dbeafe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#2563EB',
            color: '#fff', fontWeight: 800, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {(profile.fullName || profile.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.fullName || profile.email}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {roleInfo.icon} {roleInfo.label}
              {isRepresentative && <span style={{ marginRight: 6, color: '#d97706', fontWeight: 600 }}>• ועד 🏛️</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '0 14px', marginBottom: 4, letterSpacing: 1 }}>ניווט</div>
        {navItems.map(item => <NavLink key={item.to} item={item} />)}
      </nav>

      {/* Sign out */}
      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 8 }}>
        <button
          onClick={() => { signOut(); setMobileOpen(false) }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 12, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#ef4444',
            fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
          onPointerEnter={e => (e.currentTarget.style.background = '#fef2f2')}
          onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>🚪</span>
          <span>התנתק</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (fixed right) ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 240,
        background: '#fff', borderLeft: '1px solid #e5e7eb',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
      }} className="sidebar-desktop">
        <SidebarContent />
      </div>

      {/* ── Mobile bottom bar ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e5e7eb',
        padding: '8px 4px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }} className="sidebar-mobile">
        {navItems.slice(0, 4).map(item => {
          const active = isActive(item.to)
          return (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: active ? '#2563EB' : '#9ca3af', fontWeight: active ? 700 : 400 }}>
                {item.label.split(' ')[0]}
              </span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2563EB' }} />}
            </Link>
          )
        })}
        {/* Bell in mobile bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <NotificationBell />
          <span style={{ fontSize: 10, color: '#9ca3af' }}>התראות</span>
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
