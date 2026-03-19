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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64"><BuildingLoader size="lg" /></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 page-content" dir="rtl">
      <Navbar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/committee-actions')}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: '#7c3aed', fontWeight: 600, fontSize: 14 }}>
            ‹ חזרה
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>📊 מעקב הצבעות</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>עקוב אחר מי הצביע ומי לא</p>
          </div>
        </div>

        {polls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 15 }}>אין סקרים עדיין בקבוצת הבניין</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e9d5ff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <button onClick={onToggle} style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: p.status === 'open' ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {p.status === 'open' ? '📊' : '✅'}
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{p.question}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {voted}/{total} הצביעו · {p.status === 'open' ? '🟢 פתוח' : '🔴 סגור'}
          </div>
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: voted === total ? '#16a34a' : '#7c3aed' }}>
            {total > 0 ? Math.round((voted / total) * 100) : 0}%
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{isActive ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#f1f5f9' }}>
        <div style={{ height: '100%', width: `${total > 0 ? (voted / total) * 100 : 0}%`, background: '#7c3aed', transition: 'width 0.5s' }} />
      </div>

      {/* Expanded: tenant list */}
      {isActive && (
        <div style={{ padding: '16px' }}>
          {p.is_anonymous ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
              <p style={{ margin: 0, fontWeight: 600 }}>סקר אנונימי</p>
              <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>לא ניתן לזהות מי הצביע</p>
              <div style={{ marginTop: 16, padding: '12px', background: '#fef9c3', borderRadius: 10, fontSize: 13, color: '#854d0e' }}>
                ⚠️ {notVoted} דיירים עדיין לא הצביעו — ניתן לשלוח תזכורת לכלל הקבוצה
              </div>
              <SendGroupReminder pollId={pollId} pollQuestion={p.question} />
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                רשימת דיירים
              </div>
              {(tenants as any[]).map((t: any) => {
                const hasVoted = false // Can't know without non-anonymous data
                const key = t.userId + pollId
                const isSending = sending === key
                const isSent = sent.has(key)
                return (
                  <div key={t.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#7c3aed', fontSize: 14, flexShrink: 0 }}>
                      {(t.fullName || t.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{t.fullName || t.email}</div>
                      {t.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.phone}</div>}
                    </div>
                    {!isSent ? (
                      <button
                        onClick={() => onSendReminder(t.userId, t.phone)}
                        disabled={isSending}
                        style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                        {isSending ? '...' : '📩 תזכורת'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ נשלח</span>
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

  if (sent) return <div style={{ marginTop: 12, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✅ תזכורת נשלחה לכל הדיירים</div>

  return (
    <button
      onClick={() => send.mutate({ pollId, message: `📊 תזכורת: עוד לא הצבעת בסקר "${pollQuestion}". היכנס לקבוצת הבניין ומלא אותו` })}
      disabled={send.isPending}
      style={{ marginTop: 12, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
      {send.isPending ? '...' : '📣 שלח תזכורת לכולם'}
    </button>
  )
}
