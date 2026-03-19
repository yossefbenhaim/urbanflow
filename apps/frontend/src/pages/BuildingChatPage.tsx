import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'
import BuildingLoader from '../components/BuildingLoader'

function PollCard({ pollId, currentUserId, onUnvoted }: { pollId: string; currentUserId: string; onUnvoted?: (id: string) => void }) {
  const utils = trpc.useUtils()
  const { data: poll, isLoading } = trpc.tenant.getPollDetails.useQuery({ pollId }, { refetchInterval: 5000 })
  const castVote = trpc.tenant.castVote.useMutation({
    onSuccess: () => { utils.tenant.getPollDetails.invalidate({ pollId }); setChanging(false) },
  })
  const [selectedValue, setSelectedValue] = useState('')
  const [customNumber, setCustomNumber] = useState('')
  const [changing, setChanging] = useState(false)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const p = (poll as any) ?? {}
  const isOpen = p.status === 'open'
  const hasVoted = !!p.myVote
  const isExpired = p.close_at ? new Date(p.close_at).getTime() < now : false
  const canVote = isOpen && !isExpired

  // Must be before early return — Rules of Hooks
  useEffect(() => {
    if (!isLoading && poll && isOpen && !hasVoted) onUnvoted?.(pollId)
  }, [isLoading, isOpen, hasVoted, pollId])

  // loading handled by LoadingScreen

  const isApartmentCount = p.poll_type === 'apartment_count'
  const isElection = p.poll_type === 'representative_election'
  const isCustom = !isApartmentCount && !isElection
  const options: string[] = p.options ?? []

  const handleVote = () => {
    const val = isApartmentCount ? customNumber : selectedValue
    if (!val) return
    castVote.mutate({ pollId, value: val })
  }

  return (
    <div style={{
      background: isOpen ? '#f0f9ff' : '#f8fafc', border: `1px solid ${isOpen ? '#bae6fd' : '#e2e8f0'}`,
      borderRadius: '12px', padding: '16px', margin: '4px 0',
    }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '12px' }}>
        {isOpen ? '📊' : '✅'} {p.question}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          <span>{p.voteCount} הצביעו מתוך {p.memberCount}</span>
          <span>{p.votePercent}%</span>
        </div>
        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.votePercent}%`, background: '#2563EB', borderRadius: '3px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '6px', gap: 8 }}>
            <span>נדרש {p.threshold_pct}% להכרעה</span>
            {p.close_at && (() => {
              const ms = new Date(p.close_at).getTime() - now
              if (ms <= 0) return <span style={{ color: '#ef4444', fontWeight: 700 }}>⏰ פג תוקף</span>
              const days = Math.floor(ms / 86400000)
              const hours = Math.floor((ms % 86400000) / 3600000)
              const color = days < 1 ? '#ef4444' : days < 2 ? '#f59e0b' : '#6b7280'
              return <span style={{ color, fontWeight: 700 }}>
                ⏱ {days > 0 ? `${days} ימים נותרו` : `${hours} שעות נותרו`}
              </span>
            })()}
          </div>
      </div>

      {/* Closed poll result */}
      {!isOpen && (
        <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '8px', fontSize: '13px', color: '#166534', fontWeight: 600 }}>
          {isApartmentCount && `תוצאה: ${p.result_value} דירות בבניין`}
          {isElection && p.candidates?.length > 0 && `נבחר: ${p.candidates.find((c: any) => c.id === p.result_user_id)?.full_name ?? p.result_value}`}
          {isCustom && `תוצאה: ${p.result_value}`}
        </div>
      )}

      {/* Voting UI */}
      {isOpen && !hasVoted && (
        <div>
          {isApartmentCount && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="number" min="2" placeholder="הזן מספר דירות"
                value={customNumber} onChange={e => setCustomNumber(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          {isElection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {(p.candidates ?? []).map((c: any) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', border: `2px solid ${selectedValue === c.id ? '#2563EB' : '#e2e8f0'}`,
                    background: selectedValue === c.id ? '#eff6ff' : '#fff', cursor: 'pointer',
                    textAlign: 'right', fontSize: '13px', color: '#1e293b',
                  }}>
                  👤 {c.full_name}
                  {c.id === currentUserId && ' (אני)'}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              {options.map((opt: string) => (
                <button key={opt} onClick={() => setSelectedValue(opt)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    border: `2px solid ${selectedValue === opt ? '#2563EB' : '#e2e8f0'}`,
                    background: selectedValue === opt ? '#eff6ff' : '#fff',
                    cursor: 'pointer', textAlign: 'right', fontSize: '14px', color: '#1e293b',
                    fontWeight: selectedValue === opt ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selectedValue === opt ? '#2563EB' : '#d1d5db'}`,
                    background: selectedValue === opt ? '#2563EB' : 'transparent',
                    display: 'inline-block',
                  }} />
                  {opt}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length === 0 && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text" placeholder="הכנס תשובה..."
                value={selectedValue} onChange={e => setSelectedValue(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <button onClick={handleVote} disabled={castVote.isPending || (!customNumber && !selectedValue)}
            style={{
              padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: (!customNumber && !selectedValue) ? 0.5 : 1,
            }}>
            {castVote.isPending ? 'שולח...' : 'הצבע'}
          </button>
        </div>
      )}

      {/* Expired — didn't vote */}
      {isExpired && !hasVoted && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
          ⏰ מועד ההצבעה עבר
        </div>
      )}

      {/* Already voted */}
      {(isOpen || isExpired) && hasVoted && !changing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#eff6ff', borderRadius: 8 }}>
          <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>
            ✓ הצבעת על: {isElection
              ? (p.candidates ?? []).find((c: any) => c.id === p.myVote)?.full_name ?? p.myVote
              : isApartmentCount ? `${p.myVote} דירות`
              : p.myVote}
          </span>
          <button onClick={() => { setSelectedValue(p.myVote ?? ''); setCustomNumber(p.myVote ?? ''); setChanging(true) }}
            style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            שנה ✏️
          </button>
        </div>
      )}
      {/* Change vote UI */}
      {canVote && hasVoted && changing && (
        <div>
          {isApartmentCount && (
            <div style={{ marginBottom: '8px' }}>
              <input type="number" min="2" placeholder="הזן מספר דירות" value={customNumber} onChange={e => setCustomNumber(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #bfdbfe', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          {isElection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {(p.candidates ?? []).map((c: any) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${selectedValue === c.id ? '#2563EB' : '#e2e8f0'}`, background: selectedValue === c.id ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'right', fontSize: '13px', color: '#1e293b' }}>
                  👤 {c.full_name}{c.id === currentUserId && ' (אני)'}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              {options.map((opt: string) => (
                <button key={opt} onClick={() => setSelectedValue(opt)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: `2px solid ${selectedValue === opt ? '#2563EB' : '#e2e8f0'}`, background: selectedValue === opt ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'right', fontSize: '14px', color: '#1e293b', fontWeight: selectedValue === opt ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selectedValue === opt ? '#2563EB' : '#d1d5db'}`, background: selectedValue === opt ? '#2563EB' : 'transparent', display: 'inline-block' }} />
                  {opt}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleVote} disabled={castVote.isPending || (!customNumber && !selectedValue)}
              style={{ flex: 1, padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: (!customNumber && !selectedValue) ? 0.5 : 1 }}>
              {castVote.isPending ? 'שומר...' : 'עדכן הצבעה ✓'}
            </button>
            <button onClick={() => setChanging(false)}
              style={{ padding: '8px 14px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuildingChatPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const prevMsgLen = useRef(0)
  const token = localStorage.getItem('sb-token')
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!token })
  const currentUserId = (me as any)?.id ?? ''

  const { data: messages, refetch } = trpc.tenant.getChatMessages.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId, refetchInterval: 3000 }
  )
  const sendMessage = trpc.tenant.sendChatMessage.useMutation({ onSuccess: () => { setMessage(''); refetch() } })

  const pollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [unvotedPollId, setUnvotedPollId] = useState<string | null>(null)

  // Check if there are any unvoted open polls
  const msgs = (messages ?? []) as any[]
  const openPollMsg = msgs.find((m: any) => m.message_type === 'poll' && m.poll_id)

  const scrollToPoll = (pollId: string) => {
    const el = pollRefs.current[pollId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    setNewMsgCount(0)
    setIsAtBottom(true)
  }

  // On new messages — auto-scroll if at bottom, else show badge
  useEffect(() => {
    const len = (messages ?? []).length
    if (len === 0) return
    if (prevMsgLen.current === 0) {
      scrollToBottom(false)
    } else if (len > prevMsgLen.current) {
      if (isAtBottom) {
        scrollToBottom(true)
      } else {
        setNewMsgCount(n => n + (len - prevMsgLen.current))
      }
    }
    prevMsgLen.current = len
  }, [messages])

  // Track scroll position
  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setIsAtBottom(atBottom)
    if (atBottom) setNewMsgCount(0)
  }

  // Intercept browser back button
  useEffect(() => {
    window.history.pushState({ page: 'chat' }, '')
    const handlePop = () => navigate('/dashboard', { replace: true })
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [navigate])

  if (!groupId) return null

  const handleSend = () => {
    if (!message.trim()) return
    sendMessage.mutate({ groupId, content: message.trim() })
  }

  return (
    <div style={{ height: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }} dir="rtl">
      <Navbar />
      <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px', minHeight: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14, color: '#2563EB', fontWeight: 600, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
            ‹ דף הבית
          </button>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b', flex: 1 }}>🏢 קבוצת הבניין</h1>
        </div>

        {/* Messages scroll area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, WebkitOverflowScrolling: 'touch', position: 'relative' }}
        >
          {(messages ?? []).map((msg: any) => {
            const isMe = msg.sender_id === currentUserId
            const isPoll = msg.message_type === 'poll' && msg.poll_id
            return (
              <div key={msg.id} ref={msg.message_type === 'poll' ? (el) => { pollRefs.current[msg.poll_id] = el } : undefined}
                style={{ display: 'flex', flexDirection: isPoll ? 'column' : isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: isPoll ? 'stretch' : 'flex-start' }}>
                {!isPoll && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? '#2563EB' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {msg.sender?.full_name?.[0] ?? '?'}
                  </div>
                )}
                <div style={{ maxWidth: isPoll ? '100%' : '70%', width: isPoll ? '100%' : undefined }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: isPoll ? 'right' : isMe ? 'left' : 'right' }}>
                    {isMe ? 'אני' : msg.sender?.full_name ?? 'דייר'} · {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {isPoll ? (
                    <PollCard pollId={msg.poll_id} currentUserId={currentUserId} onUnvoted={setUnvotedPollId} />
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.5, background: isMe ? '#2563EB' : '#fff', color: isMe ? '#fff' : '#1e293b', border: isMe ? 'none' : '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Unvoted poll banner — shown from PollCard callback */}
        {unvotedPollId && (
          <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
            <button
              onClick={() => { scrollToPoll(unvotedPollId); setUnvotedPollId(null) }}
              style={{
                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
                border: 'none', borderRadius: 20, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)', zIndex: 10, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              📊 יש סקר שממתין להצבעתך ↑
            </button>
          </div>
        )}

        {/* New messages floating badge */}
        {newMsgCount > 0 && (
          <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
            <button
              onClick={() => scrollToBottom(true)}
              style={{
                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                background: '#2563EB', color: '#fff', border: 'none', borderRadius: 20,
                padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)', zIndex: 10, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              ↓ {newMsgCount} הודעות חדשות
            </button>
          </div>
        )}

        {/* Input — always at bottom */}
        <div style={{ padding: '10px 0 env(safe-area-inset-bottom, 16px)', display: 'flex', gap: '8px', flexShrink: 0, background: '#f8fafc' }}>
          <input
            value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="כתוב הודעה..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#fff' }}
          />
          <button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}
            style={{ padding: '12px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', opacity: !message.trim() ? 0.5 : 1 }}>
            שלח
          </button>
        </div>
      </div>
    </div>
  )
}