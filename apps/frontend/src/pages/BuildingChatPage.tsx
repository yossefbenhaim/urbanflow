import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'
import ElectionBanner from '../components/ElectionBanner'

interface PollCandidate {
  id: string
  full_name: string
}

interface PollData {
  status?: string
  myVote?: string
  close_at?: string
  poll_type?: string
  options?: string[]
  question?: string
  voteCount?: number
  memberCount?: number
  votePercent?: number
  threshold_pct?: number
  result_value?: string
  result_user_id?: string
  candidates?: PollCandidate[]
}

interface ChatMessage {
  id: string
  sender_id: string
  message_type: string
  poll_id?: string
  content?: string
  created_at: string
  sender?: { full_name?: string }
}

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

  const p = (poll as PollData) ?? {} as PollData
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
    <div className={`sc-card p-4 my-1 border-t-4 ${isOpen ? 'border-t-sc-primary bg-[#ebf1f7]/30' : 'border-t-sc-border'}`}>
      <div className="font-bold text-sm text-[#212121] mb-3">
        {isOpen ? '📊' : '✅'} {p.question}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#5a5a6e] mb-1">
          <span>{p.voteCount} הצביעו מתוך {p.memberCount}</span>
          <span>{p.votePercent}%</span>
        </div>
        <div className="h-1.5 bg-sc-border rounded-full overflow-hidden">
          <div className="h-full bg-[#3b6b9c] rounded-full transition-all duration-500" style={{ width: `${p.votePercent}%` }} />
        </div>
        <div className="flex justify-between items-center text-[11px] text-[#5a5a6e] mt-1.5 gap-2">
            <span>נדרש {p.threshold_pct}% להכרעה</span>
            {p.close_at && (() => {
              const ms = new Date(p.close_at).getTime() - now
              if (ms <= 0) return <span className="text-red-500 font-bold">⏰ פג תוקף</span>
              const days = Math.floor(ms / 86400000)
              const hours = Math.floor((ms % 86400000) / 3600000)
              return <span className={`font-bold ${days < 1 ? 'text-red-500' : days < 2 ? 'text-[#8b6f47]' : 'text-[#5a5a6e]'}`}>
                ⏱ {days > 0 ? `${days} ימים נותרו` : `${hours} שעות נותרו`}
              </span>
            })()}
          </div>
      </div>

      {/* Closed poll result */}
      {!isOpen && (
        <div className="p-2.5 bg-[#4a8c5c]/15 rounded-lg text-[13px] text-[#4a8c5c] font-semibold">
          {isApartmentCount && `תוצאה: ${p.result_value} דירות בבניין`}
          {isElection && (p.candidates?.length ?? 0) > 0 && `נבחר: ${p.candidates!.find((c: PollCandidate) => c.id === p.result_user_id)?.full_name ?? p.result_value}`}
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
              {(p.candidates ?? []).map((c: PollCandidate) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  className={`p-2 rounded-lg border-2 text-right text-[13px] text-[#212121] cursor-pointer transition-colors ${
                    selectedValue === c.id ? 'border-[#3b6b9c] bg-[#ebf1f7]' : 'border-[#eeeeee] bg-white'
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
                  className={`p-2.5 rounded-[10px] border-2 text-right text-sm text-[#212121] cursor-pointer flex items-center gap-2 transition-colors ${
                    selectedValue === opt ? 'border-[#3b6b9c] bg-[#ebf1f7] font-bold' : 'border-[#eeeeee] bg-white'
                  }`}>
                  <span className={`w-[18px] h-[18px] rounded-full flex-shrink-0 border-2 inline-block ${
                    selectedValue === opt ? 'border-[#3b6b9c] bg-[#3b6b9c]' : 'border-[#eeeeee] bg-transparent'
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
        <div className="p-2.5 bg-red-500/10 rounded-lg text-[13px] text-red-500 font-semibold">
          ⏰ מועד ההצבעה עבר
        </div>
      )}

      {/* Already voted */}
      {(isOpen || isExpired) && hasVoted && !changing && (
        <div className="flex items-center justify-between p-2.5 bg-[#ebf1f7] rounded-lg">
          <span className="text-[13px] text-[#3b6b9c] font-semibold">
            ✓ הצבעת על: {isElection
              ? (p.candidates ?? []).find((c: PollCandidate) => c.id === p.myVote)?.full_name ?? p.myVote
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
                className="sc-input border-[#3b6b9c]-light" />
            </div>
          )}
          {isElection && (
            <div className="flex flex-col gap-1.5 mb-2">
              {(p.candidates ?? []).map((c: PollCandidate) => (
                <button key={c.id} onClick={() => setSelectedValue(c.id)}
                  className={`p-2 rounded-lg border-2 text-right text-[13px] text-[#212121] cursor-pointer ${
                    selectedValue === c.id ? 'border-[#3b6b9c] bg-[#ebf1f7]' : 'border-[#eeeeee] bg-white'
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
                  className={`p-2.5 rounded-[10px] border-2 text-right text-sm text-[#212121] cursor-pointer flex items-center gap-2 ${
                    selectedValue === opt ? 'border-[#3b6b9c] bg-[#ebf1f7] font-bold' : 'border-[#eeeeee] bg-white'
                  }`}>
                  <span className={`w-[18px] h-[18px] rounded-full flex-shrink-0 border-2 inline-block ${
                    selectedValue === opt ? 'border-[#3b6b9c] bg-[#3b6b9c]' : 'border-[#eeeeee] bg-transparent'
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
  const currentUserId = (me as Record<string, unknown>)?.id as string ?? ''

  const { data: myProfile } = trpc.tenant.getMyProfile.useQuery()
  const buildingId = (myProfile as Record<string, unknown>)?.building_id as string | null ?? null

  const { data: messages, refetch } = trpc.tenant.getChatMessages.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId, refetchInterval: 3000 }
  )
  const sendMessage = trpc.tenant.sendChatMessage.useMutation({ onSuccess: () => { setMessage(''); refetch() } })

  const pollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [unvotedPollId, setUnvotedPollId] = useState<string | null>(null)

  // Check if there are any unvoted open polls
  const msgs = (messages ?? []) as ChatMessage[]
  const openPollMsg = msgs.find((m: ChatMessage) => m.message_type === 'poll' && m.poll_id)

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
    <div className="h-[100dvh] bg-[#f8f9fa] flex flex-col" dir="rtl">
      
      <div className="max-w-[720px] mx-auto w-full flex-1 flex flex-col px-4 min-h-0">

        {/* Election Banner */}
        {buildingId && <ElectionBanner buildingId={buildingId} />}

        {/* Header */}
        <div className="py-3.5 border-b border-[#eeeeee] flex items-center gap-3 flex-shrink-0">
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 bg-[#f8f9fa] border-none rounded-[10px] px-3.5 py-2 cursor-pointer text-sm text-[#3b6b9c] font-semibold flex-shrink-0">
            ‹ דף הבית
          </button>
          <h1 className="m-0 text-[17px] font-bold text-[#212121] flex-1">🏢 קבוצת הבניין</h1>
        </div>

        {/* Election Banner */}
        {buildingId && <ElectionBanner buildingId={buildingId} />}

        {/* Messages scroll area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 min-h-0 relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {(messages ?? [] as ChatMessage[]).map((msg: ChatMessage) => {
            const isMe = msg.sender_id === currentUserId
            const isPoll = msg.message_type === 'poll' && msg.poll_id
            return (
              <div key={msg.id} ref={msg.message_type === 'poll' && msg.poll_id ? (el) => { pollRefs.current[msg.poll_id!] = el } : undefined}
                className={`flex gap-2 ${isPoll ? 'flex-col items-stretch' : isMe ? 'flex-row-reverse' : 'flex-row'} ${!isPoll ? 'items-start' : ''}`}>
                {!isPoll && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    isMe ? 'bg-[#3b6b9c] text-white' : 'bg-sc-border text-[#212121]'
                  }`}>
                    {msg.sender?.full_name?.[0] ?? '?'}
                  </div>
                )}
                <div className={isPoll ? 'w-full' : 'max-w-[70%]'}>
                  <div className={`text-[11px] text-[#5a5a6e] mb-1 ${isPoll ? 'text-right' : isMe ? 'text-left' : 'text-right'}`}>
                    {isMe ? 'אני' : msg.sender?.full_name ?? 'דייר'} · {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {isPoll ? (
                    <PollCard pollId={msg.poll_id!} currentUserId={currentUserId} onUnvoted={setUnvotedPollId} />
                  ) : (
                    <div className={`p-2.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                      isMe ? 'bg-[#3b6b9c] text-white' : 'bg-white text-[#212121] border border-[#eeeeee]'
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
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#1e3a5f] text-white border-none rounded-full px-4.5 py-2 text-[13px] font-bold cursor-pointer shadow-lg z-10 whitespace-nowrap flex items-center gap-1.5">
              📊 יש סקר שממתין להצבעתך ↑
            </button>
          </div>
        )}

        {/* New messages floating badge */}
        {newMsgCount > 0 && (
          <div className="relative h-0 overflow-visible">
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#3b6b9c] text-white border-none rounded-full px-4.5 py-2 text-[13px] font-bold cursor-pointer shadow-lg z-10 whitespace-nowrap flex items-center gap-1.5">
              ↓ {newMsgCount} הודעות חדשות
            </button>
          </div>
        )}

        {/* Input — always at bottom */}
        <div className="py-2.5 pb-[env(safe-area-inset-bottom,16px)] flex gap-2 flex-shrink-0 bg-[#f8f9fa]">
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
