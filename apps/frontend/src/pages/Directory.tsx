import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import Navbar from '../components/Navbar'

type FilterType = 'all' | 'developer' | 'provider' | 'lawyer'

interface QuoteModalProps {
  recipientId: string
  recipientName: string
  onClose: () => void
}

function QuoteModal({ recipientId, recipientName, onClose }: QuoteModalProps) {
  const [desc, setDesc] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const sendRequest = trpc.quotes.sendRequest.useMutation({
    onSuccess: () => { alert('הצעת המחיר נשלחה בהצלחה!'); onClose() }
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">בקשת הצעת מחיר — {recipientName}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">תיאור הפרויקט *</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={4}
              placeholder="תאר את הפרויקט בפירוט..."
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">טווח תקציב</label>
            <input
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="לדוגמה: 500,000–800,000 ₪"
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ציר זמן</label>
            <input
              value={timeline}
              onChange={e => setTimeline(e.target.value)}
              placeholder="לדוגמה: 12–18 חודשים"
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => sendRequest.mutate({ recipientId, projectDescription: desc, budgetRange: budget || undefined, timeline: timeline || undefined })}
            disabled={desc.length < 10 || sendRequest.isPending}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sendRequest.isPending ? 'שולח...' : 'שלח בקשה'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Directory() {
  const navigate = useNavigate()
  const { profile } = useUser()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [quoteModal, setQuoteModal] = useState<{ id: string; name: string } | null>(null)

  const { data: providers = [] } = trpc.directory.getProviders.useQuery(
    filter === 'all' ? undefined : { role: filter === 'lawyer' ? 'provider' : filter }
  )
  const { data: conversations = [] } = trpc.chat.getConversations.useQuery()
  const startConversation = trpc.chat.startConversation.useMutation({
    onSuccess: ({ conversationId }: { conversationId: string }) => navigate(`/chat/${conversationId}`)
  })

  const meId = profile?.id
  const filtered = providers
    .filter((p: any) => {
      if (filter === 'developer') return p.role === 'developer'
      if (filter === 'provider') return p.role === 'provider'
      return true
    })
    .filter((p: any) => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      if (a.role === 'developer' && b.role !== 'developer') return -1
      if (b.role === 'developer' && a.role !== 'developer') return 1
      return 0
    })

  const filterBtns: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'developer', label: 'יזמים' },
    { key: 'provider', label: 'קבלנים' },
    { key: 'lawyer', label: "עו\"ד" },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left sidebar - conversations */}
        <aside className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">💬 השיחות שלי</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">אין שיחות עדיין</p>
            ) : (
              conversations.map((conv: any) => {
                const other = conv.participant_a === meId ? conv.pb : conv.pa
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="w-full text-right px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{other?.full_name || 'משתמש'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message || 'אין הודעות'}</p>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search + filter */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">🏢 ספריית נותני שירות</h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 חיפוש לפי שם..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex gap-2">
                {filterBtns.map(btn => (
                  <button
                    key={btn.key}
                    onClick={() => setFilter(btn.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filter === btn.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p: any) => {
              const isDev = p.role === 'developer'
              const profile_data = isDev ? p.developer_profiles : p.provider_profiles
              const bio = Array.isArray(profile_data) ? profile_data[0]?.bio : profile_data?.bio
              const company = Array.isArray(profile_data) ? profile_data[0]?.company : profile_data?.company
              const regions = Array.isArray(profile_data) ? profile_data[0]?.operating_regions : profile_data?.operating_regions

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-shadow hover:shadow-md ${
                    isDev ? 'border-yellow-400' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{isDev ? '🏗️' : '🔧'}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{p.full_name}</p>
                        {company && <p className="text-xs text-gray-500">{company}</p>}
                      </div>
                    </div>
                    {isDev && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                        יזם 👑
                      </span>
                    )}
                  </div>

                  {bio && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{bio}</p>}
                  {regions && regions.length > 0 && (
                    <p className="text-xs text-gray-400 mb-3">📍 {regions.join(', ')}</p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => startConversation.mutate({ recipientId: p.id })}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      💬 שלח הודעה
                    </button>
                    <button
                      onClick={() => setQuoteModal({ id: p.id, name: p.full_name })}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-700 rounded-lg py-2 text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      📋 הצעת מחיר
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="col-span-3 text-center text-gray-400 py-12">לא נמצאו תוצאות</p>
            )}
          </div>
        </main>
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
