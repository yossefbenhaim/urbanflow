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
    <div className={`sc-card p-4 my-1 border-t-4 ${isOpen ? 'border-t-sc-primary bg-sc-light-blue/30' : 'border-t-sc-border'}`}>
      <div className="font-bold text-sm text-sc-text mb-3">
        {isOpen ? '📊' : '✅'} {p.question}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-sc-text-light mb-1">
          <span>{p.voteCount} הצביעו מתוך {p.memberCount}</span>
          <span>{p.votePercent}%</span>
        </div>
        <div className="h-1.5 bg-sc-border rounded-full overflow-hidden">
          <div className="h-full bg-sc-primary rounded-full transition-all duration-500" style={{ width: `${p.votePercent}%` }} />
        </div>
        <div className="flex justify-between items-center text-[11px] text-sc-text-light mt-1.5 gap-2">
            <span>נדרש {p.threshold_pct}% להכרעה</span>
            {p.close_at && (() => {
              const ms = new Date(p.close_at).getTime() - now
              if (ms <= 0) return <span className="text-sc-error font-bold">⏰ פג תוקף</span>
              const days = Math.floor(ms / 86400000)
              const hours = Math.floor((ms % 86400000) / 3600000)
              return <span className={`font-bold ${days < 1 ? 'text-sc-error' : days < 2 ? 'text-sc-gold-dark' : 'text-sc-text-light'}`}>
                ⏱ {days > 0 ? `${days} ימים נותרו` : `${hours} שעות נותרו`}
              </span>
            })()}
          </div>
      </div>

      {/* Closed poll result */}
      {!isOpen && (
        <div className="p-2.5 bg-sc-success/15 rounded-lg text-[13px] text-sc-success font-semibold">
          {isApartmentCount && `תוצאה: ${p.result_value} דירות בבניין`}
          {isElection && p.candidates?.length > 0 && `נבחר: ${p.candidates.find((c: any) => c.id === p.result_user_id)?.full_name ?? p.result_value}`}
          {isCustom && `תוצאה: ${p.result_value}`}
        </div>
      )}

      {/* Voting UI */}
      {isOpen && !hasVoted && (
        <div>
          {isApartmentCount && (
            <div className="mb-2">
              <input
                type="number" min="2" placeholder="הזן מספר דירות"
                value={customNumber} onChange={e => setCustomNumber(e.target.value)}
                className="sc-input"
              />
            </div>
          )}
          {isElection && (
            <div className="flex flex-col gap-1.5 mb-2">
              {(p.candidates ?? []).map((c: any) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  className={`p-2 rounded-lg border-2 text-right text-[13px] text-sc-text cursor-pointer transition-colors ${
                    selectedValue === c.id ? 'border-sc-primary bg-sc-light-blue' : 'border-sc-border bg-white'
                  }`}>
                  👤 {c.full_name}
                  {c.id === currentUserId && ' (אני)'}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length > 0 && (
            <div className="flex flex-col gap-2 mb-2.5">
              {options.map((opt: string) => (
                <button key={opt} onClick={() => setSelectedValue(opt)}
                  className={`p-2.5 rounded-[10px] border-2 text-right text-sm text-sc-text cursor-pointer flex items-center gap-2 transition-colors ${
                    selectedValue === opt ? 'border-sc-primary bg-sc-light-blue font-bold' : 'border-sc-border bg-white'
                  }`}>
                  <span className={`w-[18px] h-[18px] rounded-full flex-shrink-0 border-2 inline-block ${
                    selectedValue === opt ? 'border-sc-primary bg-sc-primary' : 'border-sc-border bg-transparent'
                  }`} />
                  {opt}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length === 0 && (
            <div className="mb-2">
              <input
                type="text" placeholder="הכנס תשובה..."
                value={selectedValue} onChange={e => setSelectedValue(e.target.value)}
                className="sc-input"
              />
            </div>
          )}
          <button onClick={handleVote} disabled={castVote.isPending || (!customNumber && !selectedValue)}
            className="sc-btn-primary px-4 py-2 text-[13px] disabled:opacity-50">
            {castVote.isPending ? 'שולח...' : 'הצבע'}
          </button>
        </div>
      )}

      {/* Expired — didn't vote */}
      {isExpired && !hasVoted && (
        <div className="p-2.5 bg-sc-error/10 rounded-lg text-[13px] text-sc-error font-semibold">
          ⏰ מועד ההצבעה עבר
        </div>
      )}

      {/* Already voted */}
      {(isOpen || isExpired) && hasVoted && !changing && (
        <div className="flex items-center justify-between p-2.5 bg-sc-light-blue rounded-lg">
          <span className="text-[13px] text-sc-primary font-semibold">
            ✓ הצבעת על: {isElection
              ? (p.candidates ?? []).find((c: any) => c.id === p.myVote)?.full_name ?? p.myVote
              : isApartmentCount ? `${p.myVote} דירות`
              : p.myVote}
          </span>
          <button onClick={() => { setSelectedValue(p.myVote ?? ''); setCustomNumber(p.myVote ?? ''); setChanging(true) }}
            className="sc-btn-secondary text-xs px-2.5 py-1">
            שנה ✏️
          </button>
        </div>
      )}
      {/* Change vote UI */}
      {canVote && hasVoted && changing && (
        <div>
          {isApartmentCount && (
            <div className="mb-2">
              <input type="number" min="2" placeholder="הזן מספר דירות" value={customNumber} onChange={e => setCustomNumber(e.target.value)}
                className="sc-input border-sc-primary-light" />
            </div>
          )}
          {isElection && (
            <div className="flex flex-col gap-1.5 mb-2">
              {(p.candidates ?? []).map((c: any) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  className={`p-2 rounded-lg border-2 text-right text-[13px] text-sc-text cursor-pointer ${
                    selectedValue === c.id ? 'border-sc-primary bg-sc-light-blue' : 'border-sc-border bg-white'
                  }`}>
                  👤 {c.full_name}{c.id === currentUserId && ' (אני)'}
                </button>
              ))}
            </div>
          )}
          {isCustom && options.length > 0 && (
            <div className="flex flex-col gap-2 mb-2.5">
              {options.map((opt: string) => (
                <button key={opt} onClick={() => setSelectedValue(opt)}
                  className={`p-2.5 rounded-[10px] border-2 text-right text-sm text-sc-text cursor-pointer flex items-center gap-2 ${
                    selectedValue === opt ? 'border-sc-primary bg-sc-light-blue font-bold' : 'border-sc-border bg-white'
                  }`}>
                  <span className={`w-[18px] h-[18px] rounded-full flex-shrink-0 border-2 inline-block ${
                    selectedValue === opt ? 'border-sc-primary bg-sc-primary' : 'border-sc-border bg-transparent'
                  }`} />
                  {opt}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleVote} disabled={castVote.isPending || (!customNumber && !selectedValue)}
              className="sc-btn-primary flex-1 py-2 text-[13px] disabled:opacity-50">
              {castVote.isPending ? 'שומר...' : 'עדכן הצבעה ✓'}
            </button>
            <button onClick={() => setChanging(false)}
              className="sc-btn-secondary py-2 px-3.5 text-[13px]">
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
    <div className="h-[100dvh] bg-sc-bg flex flex-col" dir="rtl">
      <Navbar />
      <div className="max-w-[720px] mx-auto w-full flex-1 flex flex-col px-4 min-h-0">

        {/* Header */}
        <div className="py-3.5 border-b border-sc-border flex items-center gap-3 flex-shrink-0">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 bg-sc-bg border-none rounded-[10px] px-3.5 py-2 cursor-pointer text-sm text-sc-primary font-semibold flex-shrink-0">
            ‹ דף הבית
          </button>
          <h1 className="m-0 text-[17px] font-bold text-sc-text flex-1">🏢 קבוצת הבניין</h1>
        </div>

        {/* Messages scroll area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 min-h-0 relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {(messages ?? []).map((msg: any) => {
            const isMe = msg.sender_id === currentUserId
            const isPoll = msg.message_type === 'poll' && msg.poll_id
            return (
              <div key={msg.id} ref={msg.message_type === 'poll' ? (el) => { pollRefs.current[msg.poll_id] = el } : undefined}
                className={`flex gap-2 ${isPoll ? 'flex-col items-stretch' : isMe ? 'flex-row-reverse' : 'flex-row'} ${!isPoll ? 'items-start' : ''}`}>
                {!isPoll && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    isMe ? 'bg-sc-primary text-white' : 'bg-sc-border text-sc-text'
                  }`}>
                    {msg.sender?.full_name?.[0] ?? '?'}
                  </div>
                )}
                <div className={isPoll ? 'w-full' : 'max-w-[70%]'}>
                  <div className={`text-[11px] text-sc-text-light mb-1 ${isPoll ? 'text-right' : isMe ? 'text-left' : 'text-right'}`}>
                    {isMe ? 'אני' : msg.sender?.full_name ?? 'דייר'} · {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {isPoll ? (
                    <PollCard pollId={msg.poll_id} currentUserId={currentUserId} onUnvoted={setUnvotedPollId} />
                  ) : (
                    <div className={`p-2.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                      isMe ? 'bg-sc-primary text-white' : 'bg-white text-sc-text border border-sc-border'
                    }`}>
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
          <div className="relative h-0 overflow-visible">
            <button
              onClick={() => { scrollToPoll(unvotedPollId); setUnvotedPollId(null) }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-sc-navy text-white border-none rounded-full px-4.5 py-2 text-[13px] font-bold cursor-pointer shadow-lg z-10 whitespace-nowrap flex items-center gap-1.5">
              📊 יש סקר שממתין להצבעתך ↑
            </button>
          </div>
        )}

        {/* New messages floating badge */}
        {newMsgCount > 0 && (
          <div className="relative h-0 overflow-visible">
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-sc-primary text-white border-none rounded-full px-4.5 py-2 text-[13px] font-bold cursor-pointer shadow-lg z-10 whitespace-nowrap flex items-center gap-1.5">
              ↓ {newMsgCount} הודעות חדשות
            </button>
          </div>
        )}

        {/* Input — always at bottom */}
        <div className="py-2.5 pb-[env(safe-area-inset-bottom,16px)] flex gap-2 flex-shrink-0 bg-sc-bg">
          <input
            value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="כתוב הודעה..."
            className="sc-input flex-1"
          />
          <button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}
            className="sc-btn-primary px-5 py-3 text-sm disabled:opacity-50">
            שלח
          </button>
        </div>
      </div>
    </div>
  )
}
