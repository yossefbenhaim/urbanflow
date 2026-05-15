import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, ROLE_LABELS, clearTokens } from '../hooks/useUser'
import { trpc } from '../lib/trpc'

// ── Bell / Notifications ──────────────────────────────────────────────────────
type Notification = { id: string; is_read: boolean; type?: string; title?: string; message?: string; action_url?: string | null; created_at: string }

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('sb-token')
  const navigate = useNavigate()

  const { data: notifications = [], refetch } = trpc.tenant.getNotifications.useQuery(undefined, {
    enabled: !!token,
    refetchInterval: 15000,
    staleTime: 10000,
  })
  const markRead = trpc.tenant.markNotificationsRead.useMutation({ onSuccess: () => refetch() })
  const markOne = trpc.tenant.markNotificationRead.useMutation({ onSuccess: () => refetch() })
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
        className={`relative w-10 h-10 rounded-[10px] border-none cursor-pointer flex items-center justify-center text-lg transition-colors ${open ? 'bg-[#ebf1f7]' : 'bg-transparent hover:bg-[#f8f9fa]'}`}
        title="התראות"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        🔔
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-80 bg-white rounded-[14px] shadow-lg border border-[#eeeeee] z-[9999] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#eeeeee] flex items-center justify-between">
            <span className="font-bold text-[13px] text-[#212121]">🔔 התראות</span>
            {unread > 0 && <span className="text-[11px] text-[#8e8e9e]">{unread} חדשות</span>}
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {(notifications as Notification[]).length === 0 ? (
              <div className="py-6 px-4 text-center text-[#8e8e9e]">
                <div className="text-[28px] mb-2">🎉</div>
                <p className="text-[13px] m-0">אין התראות חדשות</p>
              </div>
            ) : (
              (notifications as Notification[]).map((n) => {
                const iconFor = (t?: string) => {
                  if (t?.startsWith('negotiation')) return '🤝'
                  if (t === 'message') return '💬'
                  if (t === 'poll' || t === 'poll_reminder') return '🗳️'
                  if (t === 'meeting') return '📅'
                  if (t === 'quote_request' || t === 'quote_response') return '💰'
                  return '🔔'
                }
                const handleClick = () => {
                  if (!n.is_read) markOne.mutate({ notificationId: n.id })
                  if (n.action_url) {
                    setOpen(false)
                    navigate(n.action_url)
                  }
                }
                return (
                  <button
                    key={n.id}
                    onClick={handleClick}
                    className={`w-full text-right px-4 py-3 border-b border-[#eeeeee]/50 transition-colors ${n.is_read ? 'bg-white hover:bg-[#f8f9fa]' : 'bg-[#ebf1f7] hover:bg-[#dde9f5]'} ${n.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <span className="text-lg flex-shrink-0">{iconFor(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`m-0 text-[13px] text-[#212121] ${n.is_read ? 'font-normal' : 'font-semibold'}`}>{n.title}</p>
                        {n.message && <p className="m-0 mt-0.5 text-[11px] text-[#5a5a6e]">{n.message}</p>}
                        <p className="m-0 mt-1 text-[10px] text-[#8e8e9e]">
                          {new Date(n.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sidebar Items by Role ─────────────────────────────────────────────────────
type NavItem = { to: string; icon: string; label: string }

function getSidebarItems(role: string, isRepresentative: boolean, providerType?: string | null): NavItem[] {
  switch (role) {
    case 'tenant':
      return [
        { to: '/dashboard', icon: '🏠', label: 'ראשי' },
        { to: '/project-progress', icon: '📊', label: 'התקדמות פרויקט' },
        { to: '/apartment-wishes', icon: '🏗️', label: 'דירה חדשה' },
        { to: '/documents', icon: '📄', label: 'מסמכים' },
        { to: '/chat', icon: '💬', label: 'צ\'אט' },
        { to: '/directory', icon: '📋', label: 'ספריית מומחים' },
        // Committee representatives (ועד) can open tenders and run negotiations.
        ...(isRepresentative ? [{ to: '/tenders', icon: '📋', label: 'מכרזים' }] : []),
        ...(isRepresentative ? [{ to: '/negotiations', icon: '🤝', label: 'משאים ומתנים' }] : []),
        ...(isRepresentative ? [{ to: '/meetings', icon: '📅', label: 'פגישות' }] : []),
        ...(isRepresentative ? [{ to: '/my-tasks', icon: '📝', label: 'המשימות שלי' }] : []),
        { to: '/join-project', icon: '🔗', label: 'שיוך לפרויקט' },
        { to: '/profile', icon: '👤', label: 'פרופיל' },
      ]
    case 'manager':
    case 'companion':
      return [
        { to: '/manager', icon: '🏠', label: 'ראשי' },
        { to: '/manager', icon: '📊', label: 'פרויקטים' },
        { to: '/manager', icon: '👥', label: 'דיירים' },
        { to: '/tenders', icon: '📋', label: 'מכרזים' },
        { to: '/profile', icon: '👤', label: 'פרופיל' },
      ]
    case 'provider': {
      // בדיקות is the professional inspection flow — only אדריכל + שמאי
      // submit those. Lawyers and developers don't need to see the tab.
      const showInspections = providerType === 'architect' || providerType === 'appraiser'
      return [
        { to: '/provider', icon: '🏠', label: 'ראשי' },
        ...(showInspections ? [{ to: '/inspections', icon: '🔍', label: 'בדיקות' }] : []),
        { to: '/negotiations', icon: '🤝', label: 'משאים ומתנים' },
        { to: '/my-tasks', icon: '📝', label: 'המשימות שלי' },
        { to: '/chat', icon: '💬', label: 'צ\'אט' },
        { to: '/quotes', icon: '💰', label: 'הצעות מחיר' },
        { to: '/provider/preferences', icon: '⚙️', label: 'העדפות' },
        { to: '/provider/profile', icon: '👤', label: 'פרופיל' },
      ]
    }
    case 'organizer':
      return [
        { to: '/organizer', icon: '🏠', label: 'ראשי' },
        { to: '/organizer', icon: '📊', label: 'פרויקט' },
        { to: '/organizer', icon: '👥', label: 'דיירים' },
        { to: '/tenders', icon: '📋', label: 'מכרזים' },
        { to: '/chat', icon: '💬', label: 'קבוצה' },
        { to: '/organizer', icon: '📄', label: 'חוזה' },
      ]
    default:
      return [
        { to: '/dashboard', icon: '🏠', label: 'ראשי' },
        { to: '/profile', icon: '👤', label: 'פרופיל' },
      ]
  }
}

function getCommitteeSidebarItems(): NavItem[] {
  return [
    { to: '/committee', icon: '🏠', label: 'ראשי' },
    { to: '/votes-tracker', icon: '📊', label: 'מעקב הצבעות' },
    { to: '/committee-actions', icon: '📢', label: 'שידורים' },
    { to: '/committee', icon: '📝', label: 'פרוטוקולים' },
    { to: '/committee', icon: '👥', label: 'דיירים' },
  ]
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
export default function Sidebar({ overrideItems }: { overrideItems?: NavItem[] } = {}) {
  const { profile, loading, signOut } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const deleteAccount = trpc.auth.deleteMyAccount.useMutation({
    onSuccess: () => {
      clearTokens()
      navigate('/', { replace: true })
      window.location.reload()
    },
    onError: (e) => setDeleteError(e.message || 'שגיאה במחיקה'),
  })

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sb-token') : null

  const { data: myRole } = trpc.tenant.getMyRole.useQuery(undefined, {
    enabled: !!token && profile?.role === 'tenant',
  })
  const isRepresentative = (myRole as { isRepresentative?: boolean } | undefined)?.isRepresentative || false

  // Needed to decide whether to show בדיקות — only architect/appraiser.
  const { data: onboarding } = trpc.provider.getOnboardingStatus.useQuery(undefined, {
    enabled: !!token && profile?.role === 'provider',
  })
  const providerType = (onboarding as { role?: string | null } | undefined)?.role ?? null

  if (loading || !profile) return null

  const roleInfo = ROLE_LABELS[profile.role ?? ''] ?? { label: '', icon: '👤', color: '' }

  const navItems = overrideItems || getSidebarItems(profile.role ?? '', isRepresentative, providerType)

  // Pick the nav item whose path is the LONGEST prefix of the current URL.
  // This prevents both /provider and /provider/preferences from highlighting
  // when the user is on /provider/preferences.
  const activePath = navItems
    .map(i => i.to)
    .filter(p => location.pathname === p || location.pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  const isActive = (path: string) => path === activePath

  const SidebarContent = () => (
    <div className="h-full flex flex-col py-4 px-3" dir="rtl">
      {/* Logo area */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white border border-[#eeeeee] rounded-[10px] flex items-center justify-center text-[#1e3a5f] font-extrabold text-[11px]">SC</div>
          <div>
            <div className="text-[15px] font-bold text-[#212121]">Silver Castle</div>
            <div className="text-[11px] text-[#8e8e9e]">טירת כסף</div>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* User card */}
      <div className="bg-[#ebf1f7] rounded-[14px] px-3.5 py-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0">
            {(profile.fullName || profile.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] text-[#212121] overflow-hidden text-ellipsis whitespace-nowrap">
              {profile.fullName || profile.email}
            </div>
            <div className="text-[11px] text-[#5a5a6e] mt-0.5">
              {roleInfo.icon} {roleInfo.label}
              {isRepresentative && <span className="mr-1.5 text-[#8b6f47] font-semibold">• ועד 🏛️</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to + item.label}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-[9px] rounded-[10px] no-underline text-[13px] transition-all ${
                active
                  ? 'bg-[#ebf1f7] text-[#3b6b9c] font-semibold'
                  : 'bg-transparent text-[#5a5a6e] font-normal hover:bg-[#f8f9fa]'
              }`}
            >
              <span className="text-lg w-[22px] text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-[#eeeeee] pt-3 mt-2 space-y-1">
        <button
          onClick={() => { signOut(); setMobileOpen(false) }}
          className="w-full flex items-center gap-3 px-3 py-[9px] rounded-[10px] border-none bg-transparent cursor-pointer text-[#5a5a6e] text-[13px] font-medium transition-colors hover:bg-[#f8f9fa]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="text-lg w-[22px] text-center">🚪</span>
          <span>התנתק</span>
        </button>
        <button
          onClick={() => { setShowDeleteDialog(true); setMobileOpen(false) }}
          className="w-full flex items-center gap-3 px-3 py-[9px] rounded-[10px] border-none bg-transparent cursor-pointer text-red-500 text-[13px] font-medium transition-colors hover:bg-red-50"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="text-lg w-[22px] text-center">🗑️</span>
          <span>מחיקת חשבון</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar-desktop fixed top-0 right-0 bottom-0 w-[220px] bg-white border-l border-[#eeeeee] z-[100] flex flex-col">
        <SidebarContent />
      </div>

      <style>{`
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
        }
      `}</style>

      {/* Delete account confirmation */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center px-4"
          onClick={() => !deleteAccount.isPending && setShowDeleteDialog(false)}
        >
          <div
            dir="rtl"
            className="bg-white rounded-[14px] max-w-md w-full p-6 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h2 className="font-extrabold text-[#212121] text-[17px] mb-1">מחיקת חשבון</h2>
                <p className="text-[13px] text-[#5a5a6e]">
                  הפעולה תמחק את החשבון שלך לצמיתות, כולל כל הפרופיל, המסמכים, הבדיקות,
                  ההצעות וכל הנתונים הקשורים. לא ניתן לשחזר.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 mb-4 text-[12px] text-red-700">
              לאישור, הקלד את כתובת האימייל שלך:
              <div className="font-semibold mt-1">{profile?.email}</div>
            </div>

            <input
              type="email"
              value={confirmEmail}
              onChange={e => { setConfirmEmail(e.target.value); setDeleteError('') }}
              placeholder="הקלד אימייל לאישור"
              className="sc-input w-full mb-3"
              disabled={deleteAccount.isPending}
              autoComplete="off"
            />

            {deleteError && (
              <p className="text-red-500 text-[12px] mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteDialog(false); setConfirmEmail(''); setDeleteError('') }}
                disabled={deleteAccount.isPending}
                className="flex-1 py-3 rounded-[10px] bg-[#f8f9fa] text-[#212121] font-semibold text-[13px] disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  setDeleteError('')
                  deleteAccount.mutate({ confirmEmail: confirmEmail.trim() })
                }}
                disabled={deleteAccount.isPending || !confirmEmail.trim()}
                className="flex-1 py-3 rounded-[10px] bg-red-500 text-white font-semibold text-[13px] disabled:opacity-50 hover:bg-red-600"
              >
                {deleteAccount.isPending ? 'מוחק...' : 'מחק חשבון לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { getSidebarItems, getCommitteeSidebarItems }
export type { NavItem }
