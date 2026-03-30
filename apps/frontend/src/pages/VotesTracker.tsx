import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'
import BuildingLoader from '../components/BuildingLoader'

export default function VotesTracker() {
  const navigate = useNavigate()
  const [activePollId, setActivePollId] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())

  const { data: group } = trpc.committee.getMyBuildingGroup.useQuery()
  const { data: tenants = [] } = trpc.committee.getBuildingTenants.useQuery()

  // Get all polls in building group
  const { data: messages = [] } = trpc.tenant.getChatMessages.useQuery(
    { groupId: (group as any)?.id ?? '' },
    { enabled: !!(group as any)?.id }
  )

  const polls = (messages as any[]).filter(m => m.message_type === 'poll' && m.poll_id)

  const sendReminder = trpc.committee.sendPollReminder.useMutation({
    onSuccess: (_, vars) => {
      setSent(s => new Set([...s, vars.userId + vars.pollId]))
      setSending(null)
    },
    onError: () => setSending(null),
  })

  if (!group) return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64"><BuildingLoader size="lg" /></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sc-bg page-content" dir="rtl">
      <Navbar />
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/committee-actions')}
            className="bg-sc-bg border-none rounded-[10px] px-3.5 py-2 cursor-pointer text-sc-blue font-semibold text-sm">
            ‹ חזרה
          </button>
          <div>
            <h1 className="sc-section-title text-xl m-0">📊 מעקב הצבעות</h1>
            <p className="mt-0.5 text-[13px] text-sc-gray">עקוב אחר מי הצביע ומי לא</p>
          </div>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-16 text-sc-gray">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-[15px]">אין סקרים עדיין בקבוצת הבניין</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {polls.map((msg: any) => (
              <PollVoteCard
                key={msg.poll_id}
                pollId={msg.poll_id}
                tenants={tenants as any[]}
                isActive={activePollId === msg.poll_id}
                onToggle={() => setActivePollId(activePollId === msg.poll_id ? null : msg.poll_id)}
                onSendReminder={(userId: string, phone: string) => {
                  setSending(userId + msg.poll_id)
                  sendReminder.mutate({ userId, pollId: msg.poll_id, phone })
                }}
                sending={sending}
                sent={sent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PollVoteCard({ pollId, tenants, isActive, onToggle, onSendReminder, sending, sent }: any) {
  const { data: poll } = trpc.tenant.getPollDetails.useQuery({ pollId })
  const startConversation = trpc.chat.startConversation.useMutation()
  const navigate = (window as any).__navigate ?? (() => {})

  if (!poll) return null
  const p = poll as any

  // Simulate who voted — we know voteCount but not IDs (anonymous). Show count only
  const voted = p.voteCount
  const total = p.memberCount
  const notVoted = total - voted

  return (
    <div className="sc-card overflow-hidden border-t-4 border-t-sc-blue">
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer text-right">
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 ${
          p.status === 'open' ? 'bg-sc-blue-pale' : 'bg-sc-success/15'
        }`}>
          {p.status === 'open' ? '📊' : '✅'}
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-bold text-sc-dark">{p.question}</div>
          <div className="text-xs text-sc-gray mt-0.5">
            {voted}/{total} הצביעו · {p.status === 'open' ? '🟢 פתוח' : '🔴 סגור'}
          </div>
        </div>
        {/* Progress */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`text-base font-extrabold ${voted === total ? 'text-sc-success' : 'text-sc-blue'}`}>
            {total > 0 ? Math.round((voted / total) * 100) : 0}%
          </div>
          <span className="text-[11px] text-sc-gray">{isActive ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-sc-gray-light">
        <div className="h-full bg-sc-blue transition-all duration-500" style={{ width: `${total > 0 ? (voted / total) * 100 : 0}%` }} />
      </div>

      {/* Expanded: tenant list */}
      {isActive && (
        <div className="p-4">
          {p.is_anonymous ? (
            <div className="text-center py-5 text-sc-gray text-[13px]">
              <div className="text-[32px] mb-2">🔒</div>
              <p className="m-0 font-semibold">סקר אנונימי</p>
              <p className="mt-1 text-sc-gray">לא ניתן לזהות מי הצביע</p>
              <div className="mt-4 p-3 bg-sc-warning/10 rounded-[10px] text-[13px] text-sc-warning">
                ⚠️ {notVoted} דיירים עדיין לא הצביעו — ניתן לשלוח תזכורת לכלל הקבוצה
              </div>
              <SendGroupReminder pollId={pollId} pollQuestion={p.question} />
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-sc-blue mb-2.5 uppercase tracking-wider">
                רשימת דיירים
              </div>
              {(tenants as any[]).map((t: any) => {
                const hasVoted = false // Can't know without non-anonymous data
                const key = t.userId + pollId
                const isSending = sending === key
                const isSent = sent.has(key)
                return (
                  <div key={t.userId} className="flex items-center gap-2.5 py-2.5 border-b border-sc-bg last:border-b-0">
                    <div className="w-9 h-9 rounded-full bg-sc-blue-pale flex items-center justify-center font-bold text-sc-blue text-sm flex-shrink-0">
                      {(t.fullName || t.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-sc-dark">{t.fullName || t.email}</div>
                      {t.phone && <div className="text-[11px] text-sc-gray">{t.phone}</div>}
                    </div>
                    {!isSent ? (
                      <button
                        onClick={() => onSendReminder(t.userId, t.phone)}
                        disabled={isSending}
                        className="sc-btn-secondary text-xs px-2.5 py-1.5 flex-shrink-0">
                        {isSending ? '...' : '📩 תזכורת'}
                      </button>
                    ) : (
                      <span className="text-xs text-sc-success font-semibold">✓ נשלח</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SendGroupReminder({ pollId, pollQuestion }: { pollId: string; pollQuestion: string }) {
  const [sent, setSent] = useState(false)
  const send = trpc.committee.sendBroadcastReminder.useMutation({ onSuccess: () => setSent(true) })

  if (sent) return <div className="mt-3 text-[13px] text-sc-success font-semibold">✅ תזכורת נשלחה לכל הדיירים</div>

  return (
    <button
      onClick={() => send.mutate({ pollId, message: `📊 תזכורת: עוד לא הצבעת בסקר "${pollQuestion}". היכנס לקבוצת הבניין ומלא אותו` })}
      disabled={send.isPending}
      className="sc-btn-primary mt-3 px-5 py-2.5 text-[13px]">
      {send.isPending ? '...' : '📣 שלח תזכורת לכולם'}
    </button>
  )
}
