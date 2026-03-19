import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import Navbar from '../components/Navbar'

type FilterType = 'all' | 'developer' | 'provider' | 'lawyer'

function QuoteModal({ recipientId, recipientName, onClose }: { recipientId: string; recipientName: string; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const sendRequest = trpc.quotes.sendRequest.useMutation({
    onSuccess: () => { alert('הצעת המחיר נשלחה בהצלחה!'); onClose() }
  })
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">📋 הצעת מחיר — {recipientName}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">תיאור הפרויקט *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="תאר את הפרויקט בפירוט..."
              className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">טווח תקציב</label>
            <input value={budget} onChange={e => setBudget(e.target.value)}
              placeholder="לדוגמה: 500,000–800,000 ₪"
              className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ציר זמן</label>
            <input value={timeline} onChange={e => setTimeline(e.target.value)}
              placeholder="לדוגמה: 12–18 חודשים"
              className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => sendRequest.mutate({ recipientId, projectDescription: desc, budgetRange: budget || undefined, timeline: timeline || undefined })}
            disabled={desc.length < 10 || sendRequest.isPending}
            className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors active:scale-95">
            {sendRequest.isPending ? 'שולח...' : 'שלח בקשה'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
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

  if (!roleLoading && !(myRole as any)?.isRepresentative) {
    return (
      <div className="min-h-screen page-content bg-gray-50 flex flex-col" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">גישה לנציגי ועד בלבד</h2>
            <p className="text-gray-500 mb-6 text-sm">רק נציגי ועד הבניין יכולים לגשת לספריית השירותים</p>
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors active:scale-95">
              חזרה לדשבורד
            </button>
          </div>
        </div>
      </div>
    )
  }

  const meId = profile?.id
  const filtered = providers
    .filter((p: any) => {
      if (filter === 'developer') return p.role === 'developer'
      if (filter === 'provider') return p.role === 'provider'
      return true
    })
    .filter((p: any) => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => (a.role === 'developer' ? -1 : b.role === 'developer' ? 1 : 0))

  const filterBtns: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'developer', label: '👑 יזמים' },
    { key: 'provider', label: '🔧 קבלנים' },
    { key: 'lawyer', label: '⚖️ עו"ד' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Page title */}
        <h1 className="text-xl font-bold text-gray-900 mb-4">🏢 ספריית שירותים</h1>

        {/* ── Conversations collapsible ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
          <button
            onClick={() => setConvsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-right active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-800">💬 השיחות שלי</span>
              {conversations.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                  {conversations.length}
                </span>
              )}
            </div>
            <span className={`text-gray-400 text-lg transition-transform duration-200 ${convsOpen ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </button>

          {convsOpen && (
            <div className="border-t border-gray-100">
              {conversations.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">אין שיחות עדיין</p>
              ) : (
                conversations.map((conv: any) => {
                  const other = conv.participant_a === meId ? conv.pb : conv.pa
                  return (
                    <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{other?.full_name || 'משתמש'}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.last_message || 'אין הודעות'}</p>
                      </div>
                      <span className="text-gray-300 text-lg flex-shrink-0">›</span>
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white shadow-sm"/>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterBtns.map(btn => (
              <button key={btn.key} onClick={() => setFilter(btn.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors active:scale-95 ${
                  filter === btn.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'
                }`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Provider cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((p: any) => {
            const isDev = p.role === 'developer'
            const profile_data = isDev ? p.developer_profiles : p.provider_profiles
            const pd = Array.isArray(profile_data) ? profile_data[0] : profile_data
            const bio = pd?.bio
            const company = pd?.company
            const regions = pd?.operating_regions
            const serviceTypes = pd?.service_types

            return (
              <div key={p.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-shadow active:scale-[0.99] ${
                isDev ? 'border-yellow-400' : 'border-gray-100'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                      isDev ? 'bg-yellow-100' : 'bg-blue-50'
                    }`}>
                      {isDev ? '🏗️' : '🔧'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.full_name}</p>
                      {company && <p className="text-xs text-gray-500">{company}</p>}
                    </div>
                  </div>
                  {isDev && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
                      👑 יזם
                    </span>
                  )}
                </div>

                {bio
                  ? <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-2">{bio}</p>
                  : <p className="text-xs text-gray-400 mb-3 italic">לא הוזן תיאור</p>
                }

                {serviceTypes && serviceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {serviceTypes.slice(0, 3).map((s: string) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
                {regions && regions.length > 0 && (
                  <p className="text-xs text-gray-400 mb-3">📍 {regions.slice(0, 2).join(', ')}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startConversation.mutate({ recipientId: p.id })}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-100 active:scale-95 transition-all">
                    💬 הודעה
                  </button>
                  <button
                    onClick={() => setQuoteModal({ id: p.id, name: p.full_name })}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 rounded-xl py-2.5 text-sm font-medium hover:bg-green-100 active:scale-95 transition-all">
                    📋 הצעה
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-gray-400 text-sm">לא נמצאו תוצאות</p>
            </div>
          )}
        </div>
      </div>

      {quoteModal && (
        <QuoteModal
          recipientId={quoteModal.id}
          recipientName={quoteModal.name}
          onClose={() => setQuoteModal(null)}
        />
      )}
    </div>
  )
}
