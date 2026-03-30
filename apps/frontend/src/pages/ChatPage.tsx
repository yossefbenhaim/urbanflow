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
          className="w-full text-right px-4 py-3.5 border-b border-sc-gray-light hover:bg-sc-blue-pale active:bg-sc-blue-pale/70 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sc-blue-deep rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">🏢</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sc-dark">קבוצת הבניין</p>
              <p className="text-xs text-sc-blue font-medium mt-0.5">שיחת קבוצה • סקרים</p>
            </div>
            <span className="text-sc-blue text-lg">←</span>
          </div>
        </button>
      )}
      {buildingGroup && <div className="px-4 py-1.5 text-xs text-sc-gray font-medium bg-sc-bg">שיחות פרטיות</div>}
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sc-gray text-sm">אין שיחות עדיין</p>
        </div>
      ) : (
        conversations.map((conv: any) => {
          const other = conv.participant_a === meId ? conv.pb : conv.pa
          const isActive = conv.id === conversationId
          return (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`w-full text-right px-4 py-3.5 border-b border-sc-gray-light/50 transition-all ${
                isActive
                  ? 'bg-sc-blue-pale border-r-4 border-r-sc-blue'
                  : 'hover:bg-sc-bg active:bg-sc-gray-light'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sc-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sc-dark truncate">{other?.full_name || 'משתמש'}</p>
                  <p className="text-xs text-sc-gray truncate mt-0.5">{conv.last_message || 'אין הודעות'}</p>
                </div>
                {isActive && <div className="w-2 h-2 bg-sc-blue rounded-full flex-shrink-0" />}
              </div>
            </button>
          )
        })
      )}
    </div>
  )

  return (
    <div className="h-screen page-content bg-sc-bg flex flex-col" dir="rtl">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Desktop sidebar (always visible >= md) ── */}
        <aside className="hidden md:flex w-72 flex-shrink-0 bg-white border-l border-sc-gray-light flex-col">
          <div className="px-4 py-3 border-b border-sc-gray-light flex items-center justify-between">
            <h2 className="font-semibold text-sc-dark text-sm">💬 הודעות</h2>
            <span className="text-xs text-sc-gray bg-sc-gray-light rounded-full px-2 py-0.5">{conversations.length}</span>
          </div>
          <ConvList />
        </aside>

        {/* ── Mobile: no conversation selected -> show list ── */}
        {!conversationId && (
          <div className="flex flex-col flex-1 md:hidden bg-white">
            <div className="px-4 py-3 border-b border-sc-gray-light flex items-center justify-between">
              <h2 className="font-semibold text-sc-dark">💬 הודעות</h2>
              <span className="text-xs text-sc-gray bg-sc-gray-light rounded-full px-2 py-0.5">{conversations.length}</span>
            </div>
            <ConvList />
          </div>
        )}

        {/* ── Chat area ── */}
        <main className={`flex-col flex-1 ${conversationId ? 'flex' : 'hidden md:flex'}`}>
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-sc-gray">
              <div className="text-center">
                <p className="text-5xl mb-3">💬</p>
                <p className="text-lg font-medium text-sc-gray">בחר שיחה להתחיל</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-sc-gray-light px-4 py-3 flex items-center gap-3">
                {/* Back button on mobile */}
                <button
                  onClick={() => navigate('/chat')}
                  className="md:hidden text-sc-blue text-lg pl-1"
                  aria-label="חזור"
                >
                  ‹
                </button>
                <div className="w-9 h-9 bg-sc-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {activeOther?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-sc-dark text-sm">{activeOther?.full_name || 'משתמש'}</p>
                  {activeOther?.role && (
                    <p className="text-xs text-sc-gray">{roleLabel[activeOther.role] || activeOther.role}</p>
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
                          ? 'bg-sc-blue text-white rounded-bl-sm'
                          : 'bg-white text-sc-dark shadow-sm border border-sc-gray-light rounded-br-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-sc-blue-pale' : 'text-sc-gray'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-sc-gray-light px-3 py-3 flex gap-2 items-end">
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="sc-btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-40 flex-shrink-0 active:scale-95"
                >
                  ↩
                </button>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="כתוב הודעה..."
                  rows={1}
                  className="sc-input flex-1 resize-none bg-sc-bg"
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
