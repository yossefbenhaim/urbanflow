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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [] } = trpc.chat.getConversations.useQuery()
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">
        {/* Conversations list */}
        <aside className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">💬 שיחות</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">אין שיחות</p>
            ) : (
              conversations.map((conv: any) => {
                const other = conv.participant_a === meId ? conv.pb : conv.pa
                const isActive = conv.id === conversationId
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className={`w-full text-right px-4 py-3 border-b border-gray-50 transition-colors ${
                      isActive ? 'bg-blue-50 border-r-4 border-r-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{other?.full_name || 'משתמש'}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.last_message || 'אין הודעות'}</p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-lg font-medium">בחר שיחה להתחיל</p>
                <p className="text-sm mt-1">או עבור לספריית שירותים ליצור שיחה חדשה</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {activeOther?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{activeOther?.full_name || 'משתמש'}</p>
                  {activeOther?.role && (
                    <p className="text-xs text-gray-500">{roleLabel[activeOther.role] || activeOther.role}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.map((msg: any) => {
                  const isMe = msg.sender_id === meId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMe ? 'bg-blue-600 text-white rounded-bl-sm' : 'bg-white text-gray-800 shadow-sm rounded-br-sm'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 items-end">
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  שלח ↩
                </button>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="כתוב הודעה..."
                  rows={1}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
