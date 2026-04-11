import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import PageLayout from '../components/PageLayout'
import Navbar from '../components/Navbar'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { profile } = useUser()
  const [message, setMessage] = useState('')
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

  const meId = profile?.id
  const activeConv = conversations.find((c: { id: string }) => c.id === conversationId)
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
          onClick={() => navigate(`/building-chat/${(buildingGroup as { id?: string }).id}`)}
          className="w-full text-right px-4 py-3.5 border-b border-[#eeeeee] hover:bg-[#ebf1f7] active:bg-[#ebf1f7]/70 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">🏢</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#212121]">קבוצת הבניין</p>
              <p className="text-xs text-[#3b6b9c] font-medium mt-0.5">שיחת קבוצה • סקרים</p>
            </div>
            <span className="text-[#3b6b9c] text-lg">←</span>
          </div>
        </button>
      )}
      {buildingGroup && <div className="px-4 py-1.5 text-xs text-[#5a5a6e] font-medium bg-[#f8f9fa]">שיחות פרטיות</div>}
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-[#5a5a6e] text-sm">אין שיחות עדיין</p>
        </div>
      ) : (
        conversations.map((conv: { id: string; participant_a?: string; pb?: { full_name?: string }; pa?: { full_name?: string }; last_message?: string }) => {
          const other = conv.participant_a === meId ? conv.pb : conv.pa
          const isActive = conv.id === conversationId
          return (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`w-full text-right px-4 py-3.5 border-b border-[#eeeeee]/50 transition-all ${
                isActive
                  ? 'bg-[#ebf1f7] border-r-4 border-r-sc-primary'
                  : 'hover:bg-[#f8f9fa] active:bg-sc-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3b6b9c] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#212121] truncate">{other?.full_name || 'משתמש'}</p>
                  <p className="text-xs text-[#5a5a6e] truncate mt-0.5">{conv.last_message || 'אין הודעות'}</p>
                </div>
                {isActive && <div className="w-2 h-2 bg-[#3b6b9c] rounded-full flex-shrink-0" />}
              </div>
            </button>
          )
        })
      )}
    </div>
  )

  /* ── Mobile: full-screen chat (no PageLayout wrapper) ── */
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Mobile layout — standalone, no sidebar/navbar wrapper
  if (isMobile) {
    // Mobile: conversation list
    if (!conversationId) {
      return (
        <div className="h-[100dvh] flex flex-col bg-[#f8f9fa]" dir="rtl">
          <Navbar />
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-[#eeeeee] flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-[#212121]">💬 הודעות</h2>
              <span className="text-xs text-[#5a5a6e] bg-sc-border rounded-full px-2 py-0.5">{conversations.length}</span>
            </div>
            <ConvList />
          </div>
        </div>
      )
    }

    // Mobile: active conversation
    return (
      <div className="h-[100dvh] flex flex-col bg-[#f8f9fa]" dir="rtl">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/chat')}
            className="text-white text-xl bg-white/15 rounded-lg w-9 h-9 flex items-center justify-center border-none cursor-pointer"
            aria-label="חזור"
          >
            ›
          </button>
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#1e3a5f] text-sm font-bold flex-shrink-0">
            {activeOther?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{activeOther?.full_name || 'משתמש'}</p>
            {activeOther?.role && (
              <p className="text-xs text-white/70">{roleLabel[activeOther.role] || activeOther.role}</p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {messages.map((msg: { id: string; sender_id: string; content: string; created_at: string }) => {
            const isMe = msg.sender_id === meId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                  isMe
                    ? 'bg-[#3b6b9c] text-white rounded-bl-sm'
                    : 'bg-white text-[#212121] shadow-sm border border-[#eeeeee] rounded-br-sm'
                }`}>
                  <p className="text-[13px] leading-relaxed break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-[#5a5a6e]'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-[#eeeeee] px-3 py-2.5 pb-[env(safe-area-inset-bottom,12px)] flex gap-2 items-end flex-shrink-0">
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
            className="sc-input flex-1 resize-none bg-[#f8f9fa]"
            style={{ maxHeight: 100 }}
          />
        </div>
      </div>
    )
  }

  // Desktop layout — with PageLayout
  return (
    <PageLayout>
      <div className="flex overflow-hidden rounded-[14px] border border-[#eeeeee]" style={{ height: 'calc(100vh - 140px)' }}>

        {/* ── Desktop contacts ── */}
        <aside className="flex w-[300px] flex-shrink-0 bg-white border-l border-[#eeeeee] flex-col">
          <div className="px-4 py-3 border-b border-[#eeeeee] flex items-center justify-between">
            <h2 className="font-semibold text-[#212121] text-[13px]">💬 הודעות</h2>
            <span className="text-xs text-[#5a5a6e] bg-sc-border rounded-full px-2 py-0.5">{conversations.length}</span>
          </div>
          <ConvList />
        </aside>

        {/* ── Chat area ── */}
        <main className="flex flex-col flex-1">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-[#5a5a6e]">
              <div className="text-center">
                <p className="text-5xl mb-3">💬</p>
                <p className="text-lg font-medium text-[#5a5a6e]">בחר שיחה להתחיל</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-[#eeeeee] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#3b6b9c] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {activeOther?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-[#212121] text-sm">{activeOther?.full_name || 'משתמש'}</p>
                  {activeOther?.role && (
                    <p className="text-xs text-[#5a5a6e]">{roleLabel[activeOther.role] || activeOther.role}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                {messages.map((msg: { id: string; sender_id: string; content: string; created_at: string }) => {
                  const isMe = msg.sender_id === meId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-[#3b6b9c] text-white rounded-bl-sm'
                          : 'bg-white text-[#212121] shadow-sm border border-[#eeeeee] rounded-br-sm'
                      }`}>
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-[#5a5a6e]'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-[#eeeeee] px-3 py-3 flex gap-2 items-end">
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
                  className="sc-input flex-1 resize-none bg-[#f8f9fa]"
                  style={{ maxHeight: 120 }}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </PageLayout>
  )
}
