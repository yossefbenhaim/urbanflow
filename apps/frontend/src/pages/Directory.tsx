import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import PageLayout, { PageTitle } from '../components/PageLayout'

type FilterType = 'all' | 'developer' | 'provider' | 'lawyer'

function QuoteModal({ recipientId, recipientName, onClose }: { recipientId: string; recipientName: string; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const sendRequest = trpc.quotes.sendRequest.useMutation({
    onSuccess: () => { toast.success('הצעת המחיר נשלחה בהצלחה!'); onClose() },
    onError: (e) => toast.error(e.message || 'שגיאה בשליחת הבקשה'),
  })
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" dir="rtl">
      <div className="sc-card rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#212121]">📋 הצעת מחיר — {recipientName}</h2>
          <button onClick={onClose} className="text-[#5a5a6e] text-xl leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#212121]">תיאור הפרויקט *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="תאר את הפרויקט בפירוט..."
              className="sc-input mt-1 resize-none"/>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">טווח תקציב</label>
            <input value={budget} onChange={e => setBudget(e.target.value)}
              placeholder="לדוגמה: 500,000–800,000 ₪"
              className="sc-input mt-1"/>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">ציר זמן</label>
            <input value={timeline} onChange={e => setTimeline(e.target.value)}
              placeholder="לדוגמה: 12–18 חודשים"
              className="sc-input mt-1"/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => sendRequest.mutate({ recipientId, projectDescription: desc, budgetRange: budget || undefined, timeline: timeline || undefined })}
            disabled={desc.length < 10 || sendRequest.isPending}
            className="sc-btn-primary flex-1 active:scale-95 disabled:opacity-50">
            {sendRequest.isPending ? 'שולח...' : 'שלח בקשה'}
          </button>
          <button onClick={onClose} className="sc-btn-secondary flex-1">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Directory() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sb-token') : null
  const { data: myRole, isLoading: roleLoading } = trpc.tenant.getMyRole.useQuery(undefined, { enabled: !!token })
  const navigate = useNavigate()
  const { profile } = useUser()

  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [quoteModal, setQuoteModal] = useState<{ id: string; name: string } | null>(null)
  const [convsOpen, setConvsOpen] = useState(false)

  const { data: providers = [] } = trpc.directory.getProviders.useQuery(
    filter === 'all' ? undefined : { role: filter === 'lawyer' ? 'provider' : filter }
  )
  const { data: conversations = [] } = trpc.chat.getConversations.useQuery()
  const startConversation = trpc.chat.startConversation.useMutation({
    onSuccess: ({ conversationId }: { conversationId: string }) => navigate(`/chat/${conversationId}`)
  })

  if (!roleLoading && !(myRole as { isRepresentative?: boolean })?.isRepresentative) {
    return (
      <PageLayout>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-[18px] font-bold text-[#212121] mb-2">גישה לנציגי ועד בלבד</h2>
            <p className="text-[#5a5a6e] mb-6 text-[13px]">רק נציגי ועד הבניין יכולים לגשת לספריית השירותים</p>
            <button onClick={() => navigate('/dashboard')} className="sc-btn-primary">חזרה לדשבורד</button>
          </div>
        </div>
      </PageLayout>
    )
  }

  const meId = profile?.id
  const filtered = providers
    .filter((p: { role?: string }) => {
      if (filter === 'developer') return p.role === 'developer'
      if (filter === 'provider') return p.role === 'provider'
      return true
    })
    .filter((p: { full_name?: string }) => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: { role?: string }, b: { role?: string }) => (a.role === 'developer' ? -1 : b.role === 'developer' ? 1 : 0))

  const filterBtns: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'developer', label: '👑 יזמים' },
    { key: 'provider', label: '🔧 קבלנים' },
    { key: 'lawyer', label: '⚖️ עו"ד' },
  ]

  return (
    <PageLayout>
        <PageTitle>🏢 ספריית שירותים</PageTitle>

        {/* ── Conversations collapsible ── */}
        <div className="sc-card mb-5 overflow-hidden">
          <button
            onClick={() => setConvsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-right active:bg-[#f8f9fa] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#212121]">💬 השיחות שלי</span>
              {conversations.length > 0 && (
                <span className="sc-badge bg-[#3b6b9c] text-white">
                  {conversations.length}
                </span>
              )}
            </div>
            <span className={`text-[#5a5a6e] text-lg transition-transform duration-200 ${convsOpen ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </button>

          {convsOpen && (
            <div className="border-t border-[#eeeeee]">
              {conversations.length === 0 ? (
                <p className="text-[#5a5a6e] text-sm text-center py-6">אין שיחות עדיין</p>
              ) : (
                conversations.map((conv: { id: string; participant_a?: string; pb?: { full_name?: string }; pa?: { full_name?: string }; last_message?: string }) => {
                  const other = conv.participant_a === meId ? conv.pb : conv.pa
                  return (
                    <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                      className="w-full text-right px-4 py-3 hover:bg-[#f8f9fa] active:bg-sc-border border-b border-[#eeeeee]/50 last:border-0 transition-colors flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#3b6b9c] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#212121] truncate">{other?.full_name || 'משתמש'}</p>
                        <p className="text-xs text-[#5a5a6e] truncate">{conv.last_message || 'אין הודעות'}</p>
                      </div>
                      <span className="text-sc-border text-lg flex-shrink-0">›</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ── Search + filters ── */}
        <div className="mb-4 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 חיפוש לפי שם..."
            className="sc-input"/>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterBtns.map(btn => (
              <button key={btn.key} onClick={() => setFilter(btn.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
                  filter === btn.key ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#8e8e9e]'
                }`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Provider cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((p: { id: string; role?: string; full_name?: string; developer_profiles?: Record<string, unknown> | Record<string, unknown>[]; provider_profiles?: Record<string, unknown> | Record<string, unknown>[] }) => {
            const isDev = p.role === 'developer'
            const profile_data = isDev ? p.developer_profiles : p.provider_profiles
            const pd = Array.isArray(profile_data) ? profile_data[0] : profile_data
            const bio = (pd?.about as string | undefined) || (pd?.bio as string | undefined)
            const company = pd?.company as string | undefined
            const regions = pd?.operating_regions as string[] | undefined
            const serviceTypes = pd?.service_types as string[] | undefined
            const photoUrl = pd?.photo_url as string | undefined

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/providers/${p.id}`)}
                className={`sc-card p-5 border-2 transition-shadow active:scale-[0.99] cursor-pointer ${
                  isDev ? 'border-[#8b6f47]' : 'border-[#eeeeee]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl flex-shrink-0 ${
                      isDev ? 'bg-[#8b6f47]/10' : 'bg-[#ebf1f7]'
                    }`}>
                      {photoUrl
                        ? <img src={photoUrl} alt={p.full_name} className="w-full h-full object-cover" />
                        : (isDev ? '🏗️' : '🔧')}
                    </div>
                    <div>
                      <p className="font-semibold text-[#212121] text-sm">{p.full_name}</p>
                      {company && <p className="text-xs text-[#5a5a6e]">{company}</p>}
                    </div>
                  </div>
                  {isDev && (
                    <span className="sc-badge bg-[#8b6f47]/10 text-[#8b6f47]">
                      👑 יזם
                    </span>
                  )}
                </div>

                {bio
                  ? <p className="text-sm text-[#5a5a6e] mb-3 leading-relaxed line-clamp-2">{bio}</p>
                  : <p className="text-xs text-[#5a5a6e] mb-3 italic">לא הוזן תיאור</p>
                }

                {serviceTypes && serviceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {serviceTypes.slice(0, 3).map((s: string) => (
                      <span key={s} className="sc-badge bg-[#ebf1f7] text-[#3b6b9c]">{s}</span>
                    ))}
                  </div>
                )}
                {regions && regions.length > 0 && (
                  <p className="text-xs text-[#5a5a6e] mb-3">📍 {regions.slice(0, 2).join(', ')}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={e => { e.stopPropagation(); startConversation.mutate({ recipientId: p.id }) }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#ebf1f7] text-[#3b6b9c] rounded-xl py-2.5 text-sm font-medium hover:bg-[#ebf1f7]/70 active:scale-95 transition-all">
                    💬 הודעה
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setQuoteModal({ id: p.id, name: p.full_name ?? '' }) }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#4a8c5c]/10 text-[#4a8c5c] rounded-xl py-2.5 text-sm font-medium hover:bg-[#4a8c5c]/20 active:scale-95 transition-all">
                    📋 הצעה
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-[#5a5a6e] text-sm">לא נמצאו תוצאות</p>
            </div>
          )}
        </div>

      {quoteModal && (
        <QuoteModal
          recipientId={quoteModal.id}
          recipientName={quoteModal.name}
          onClose={() => setQuoteModal(null)}
        />
      )}
    </PageLayout>
  )
}
