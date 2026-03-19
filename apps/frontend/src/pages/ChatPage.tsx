import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import Navbar from '../components/Navbar'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { profile } = useUser()
  const [message, setMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [] } = trpc.chat.getConversations.useQuery()
  const { data: buildingGroup } = trpc.tenant.getMyBuildingGroup.useQuery(undefined, {
    enabled: profile?.role === 'tenant',
  })
  const { data: messages = [], refetch } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, refetchInterval: 3000 }
  )
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => { setMessage(''); refetch() }
  })
  const markRead = trpc.chat.markRead.useMutation()

  useEffect(() => {
    if (conversationId) markRead.mutate({ conversationId })
  }, [conversationId, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close sidebar on mobile when a conversation is selected
  useEffect(() => {
    if (conversationId) setSidebarOpen(false)
  }, [conversationId])

  const meId = profile?.id
  const activeConv = conversations.find((c: any) => c.id === conversationId)
  const activeOther = activeConv
    ? (activeConv.participant_a === meId ? activeConv.pb : activeConv.pa)
    : null

  const handleSend = () => {
    if (!message.trim() || !conversationId) return
    sendMessage.mutate({ conversationId, content: message.trim() })
  }

  const roleLabel: Record<string, string> = {
    tenant: 'דייר', manager: 'מנהל', provider: 'ספק', organizer: 'מארגן', developer: 'יזם'
  }

  const ConvList = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Building group chat */}
      {buildingGroup && (
        <button
          onClick={() => navigate(`/building-chat/${(buildingGroup as any).id}`)}
          className="w-full text-right px-4 py-3.5 border-b border-gray-100 hover:bg-purple-50 active:bg-purple-100 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">🏢</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">קבוצת הבניין</p>
              <p className="text-xs text-purple-500 font-medium mt-0.5">שיחת קבוצה • סקרים</p>
            </div>
            <span className="text-purple-400 text-lg">←</span>
          </div>
        </button>
      )}
      {buildingGroup && <div className="px-4 py-1.5 text-xs text-gray-400 font-medium bg-gray-50">שיחות פרטיות</div>}
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-gray-400 text-sm">אין שיחות עדיין</p>
        </div>
      ) : (
        conversations.map((conv: any) => {
          const other = conv.participant_a === meId ? conv.pb : conv.pa
          const isActive = conv.id === conversationId
          return (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`w-full text-right px-4 py-3.5 border-b border-gray-50 transition-all ${
                isActive
                  ? 'bg-blue-50 border-r-4 border-r-blue-500'
                  : 'hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{other?.full_name || 'משתמש'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message || 'אין הודעות'}</p>
                </div>
                {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
              </div>
            </button>
          )
        })
      )}
    </div>
  )

  return (
    <div className="h-screen page-content bg-gray-50 flex flex-col" dir="rtl">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Desktop sidebar (always visible ≥ md) ── */}
        <aside className="hidden md:flex w-72 flex-shrink-0 bg-white border-l border-gray-200 flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">💬 הודעות</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{conversations.length}</span>
          </div>
          <ConvList />
        </aside>

        {/* ── Mobile: no conversation selected → show list ── */}
        {!conversationId && (
          <div className="flex flex-col flex-1 md:hidden bg-white">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">💬 הודעות</h2>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{conversations.length}</span>
            </div>
            <ConvList />
          </div>
        )}

        {/* ── Chat area ── */}
        <main className={`flex-col flex-1 ${conversationId ? 'flex' : 'hidden md:flex'}`}>
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-3">💬</p>
                <p className="text-lg font-medium text-gray-500">בחר שיחה להתחיל</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                {/* Back button on mobile */}
                <button
                  onClick={() => navigate('/chat')}
                  className="md:hidden text-blue-600 text-lg pl-1"
                  aria-label="חזור"
                >
                  ‹
                </button>
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {activeOther?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{activeOther?.full_name || 'משתמש'}</p>
                  {activeOther?.role && (
                    <p className="text-xs text-gray-400">{roleLabel[activeOther.role] || activeOther.role}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                {messages.map((msg: any) => {
                  const isMe = msg.sender_id === meId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-bl-sm'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-br-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0 active:scale-95"
                >
                  ↩
                </button>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="כתוב הודעה..."
                  rows={1}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-400 outline-none bg-gray-50"
                  style={{ maxHeight: 120 }}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
