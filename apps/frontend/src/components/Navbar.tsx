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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markRead.mutate() }}
        style={{
          position: 'relative', width: 40, height: 40, borderRadius: 10,
          border: 'none', background: open ? '#eff6ff' : '#f8fafc',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, transition: 'background 0.15s', WebkitTapHighlightColor: 'transparent',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
            width: 15, height: 15, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 56, left: 8, right: 8,
          width: 300, background: '#fff', borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 9999,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
            🔔 התראות {unread > 0 && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 12 }}>({unread} חדשות)</span>}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {(notifications as any[]).length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                🎉 אין התראות חדשות
              </div>
            ) : (
              (notifications as any[]).map((n: any) => (
                <div key={n.id}
                  onClick={() => { if (n.action_url) { setOpen(false); navigate(n.action_url) } }}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid #f9fafb',
                    background: n.is_read ? '#fff' : '#eff6ff',
                    cursor: n.action_url ? 'pointer' : 'default',
                  }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {n.type === 'message' ? '💬' : n.type?.includes('meeting') ? '📅' : n.type?.includes('signature') ? '✍️' : '🔔'}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#111827' }}>{n.title}</p>
                      {n.message && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{n.message}</p>}
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>
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
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 280,
        background: '#fff', zIndex: 201,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }} dir="rtl">

        {/* Header */}
        <div style={{
          padding: '20px 16px 16px',
          background: 'linear-gradient(135deg, #1e3a8a, #2563EB)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.svg" alt="logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>Silver Castle</span>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* User card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0,
            }}>
              {(profile?.fullName || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{profile?.fullName || profile?.email}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {roleInfo.icon} {roleInfo.label}
                {isRepresentative && <span style={{ marginRight: 6 }}>• ועד 🏛️</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '0 8px', marginBottom: 6, letterSpacing: 1 }}>תפריט</div>
          {navItems.map(item => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 12px', borderRadius: 12, textDecoration: 'none',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#2563EB' : '#374151',
                  fontWeight: active ? 700 : 500, fontSize: 15,
                  marginBottom: 2, transition: 'background 0.12s',
                  borderRight: active ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={() => { window.dispatchEvent(new Event('open-faqbot')); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 12px', borderRadius: 12, border: 'none', marginBottom: 6,
              background: '#f0fdf4', cursor: 'pointer', color: '#15803d',
              fontSize: 14, fontWeight: 600, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>💬</span>
            שאלות נפוצות
          </button>
          <button
            onClick={() => { window.dispatchEvent(new Event('open-accessibility')); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 12px', borderRadius: 12, border: 'none', marginBottom: 6,
              background: '#fefce8', cursor: 'pointer', color: '#a16207',
              fontSize: 14, fontWeight: 600, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>♿</span>
            נגישות
          </button>
          <button
            onClick={() => { signOut(); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 12px', borderRadius: 12, border: 'none',
              background: '#fef2f2', cursor: 'pointer', color: '#ef4444',
              fontSize: 14, fontWeight: 600, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🚪</span>
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
      <nav style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }} dir="rtl">
        <div style={{
          maxWidth: 960, margin: '0 auto', padding: '0 16px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Right side: hamburger menu */}
          {!loading && profile && (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
                fontSize: 14, color: '#374151', fontWeight: 600,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              תפריט
            </button>
          )}

          {/* Center: Logo + back button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isHome && (
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 9,
                  padding: '6px 12px', cursor: 'pointer', color: '#2563EB',
                  fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ‹ חזרה
              </button>
            )}
            <Link to={dashLink} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Silver Castle" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }} className="hidden sm:block">Silver Castle</span>
            </Link>
          </div>

          {/* Left side: bell */}
          {!loading && profile && <NotificationBell />}
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
