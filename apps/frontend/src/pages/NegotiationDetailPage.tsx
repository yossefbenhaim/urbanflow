import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import PageLayout from '../components/PageLayout'

const STATUS_LABEL: Record<string, string> = {
  invited: 'הזמנה נשלחה',
  accepted_by_provider: 'אושר ע״י נותן השירות',
  in_negotiation: 'במשא ומתן',
  agreed_by_provider: 'נותן השירות אישר',
  agreed_by_committee: 'הוועד אישר',
  both_agreed: 'הסכמה דו-צדדית',
  polling: 'בהצבעת דיירים',
  approved: '✅ נבחר ע״י הדיירים',
  rejected_by_tenants: '❌ נדחה בהצבעה',
  cancelled: 'בוטל',
  superseded: 'הוחלף',
}

const ROLE_LABEL: Record<string, string> = {
  architect: 'אדריכל', appraiser: 'שמאי', lawyer: 'עורך דין',
  developer: 'יזם', engineer: 'מהנדס', inspector: 'מפקח', other: 'אחר',
}

export default function NegotiationDetailPage() {
  const { negotiationId } = useParams<{ negotiationId: string }>()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.negotiations.getById.useQuery(
    { negotiationId: negotiationId ?? '' },
    { enabled: !!negotiationId, refetchInterval: 5000 }
  )
  const [draft, setDraft] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

  const sendMessage = trpc.negotiations.sendMessage.useMutation({
    onSuccess: () => {
      setDraft('')
      utils.negotiations.getById.invalidate({ negotiationId: negotiationId ?? '' })
    },
    onError: (e) => toast.error(e.message || 'שגיאה בשליחה'),
  })
  const accept = trpc.negotiations.accept.useMutation({
    onSuccess: () => { toast.success('אושר'); utils.negotiations.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  })
  const markAgreed = trpc.negotiations.markAgreed.useMutation({
    onSuccess: (r) => {
      toast.success(r && 'pollId' in r ? 'הסקר נפתח לדיירים' : 'הסכמתך נרשמה')
      utils.negotiations.getById.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const cancel = trpc.negotiations.cancel.useMutation({
    onSuccess: () => { toast.success('בוטל'); navigate('/negotiations') },
    onError: (e) => toast.error(e.message),
  })
  const finalizePoll = trpc.negotiations.finalizePoll.useMutation({
    onSuccess: (r) => { toast.success(r.result === 'won' ? 'עבר! ✅' : 'לא עבר'); utils.negotiations.getById.invalidate() },
    onError: (e) => toast.error(e.message),
  })

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [data?.messages?.length])

  if (isLoading) return <PageLayout><p className="text-center py-12 text-[#5a5a6e]">טוען…</p></PageLayout>
  if (!data) return <PageLayout><p className="text-center py-12 text-[#5a5a6e]">לא נמצא</p></PageLayout>

  const { negotiation: n, messages, myRole } = data
  const isCommittee = myRole === 'committee'
  const isProvider = myRole === 'provider'
  const id = negotiationId ?? ''

  // Action availability
  const canAccept = isProvider && n.status === 'invited'
  const canChat = ['in_negotiation', 'agreed_by_provider', 'agreed_by_committee', 'accepted_by_provider'].includes(n.status)
  const canAgreeCommittee = isCommittee && ['in_negotiation', 'agreed_by_provider'].includes(n.status) && !n.committee_agreed_at
  const canAgreeProvider = isProvider && ['in_negotiation', 'agreed_by_committee'].includes(n.status) && !n.provider_agreed_at
  const canCancel = !['polling', 'approved', 'rejected_by_tenants', 'cancelled', 'superseded'].includes(n.status)
  const canFinalize = n.status === 'polling' && n.poll_deadline && new Date(n.poll_deadline) <= new Date()

  return (
    <PageLayout>
      {/* ── Header ── */}
      <div className="sc-card p-4 mb-3">
        <button onClick={() => navigate('/negotiations')} className="text-[#3b6b9c] text-xs mb-2">← חזרה</button>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-[#212121] text-base">משא ומתן · {ROLE_LABEL[n.provider_role] ?? n.provider_role}</h1>
          <span className="sc-badge bg-[#ebf1f7] text-[#3b6b9c] text-xs">{STATUS_LABEL[n.status]}</span>
        </div>
        <div className="text-xs text-[#5a5a6e] space-y-0.5">
          <p>👤 התפקיד שלך: {isCommittee ? 'ועד' : 'נותן שירות'}</p>
          {n.committee_agreed_at && <p>✓ הוועד אישר הסכם · {new Date(n.committee_agreed_at).toLocaleString('he-IL')}</p>}
          {n.provider_agreed_at && <p>✓ נותן השירות אישר הסכם · {new Date(n.provider_agreed_at).toLocaleString('he-IL')}</p>}
          {n.poll_deadline && <p>📊 דדליין סקר · {new Date(n.poll_deadline).toLocaleString('he-IL')} (רוב 60% מכלל הדיירים)</p>}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {canAccept && (
          <button onClick={() => accept.mutate({ negotiationId: id })} className="sc-btn-primary">
            ✅ אשר הזמנה ופתח משא ומתן
          </button>
        )}
        {canAgreeCommittee && (
          <button onClick={() => markAgreed.mutate({ negotiationId: id })} className="sc-btn-primary">
            🤝 אני מסכים להעסיק (ועד)
          </button>
        )}
        {canAgreeProvider && (
          <button onClick={() => markAgreed.mutate({ negotiationId: id })} className="sc-btn-primary">
            🤝 אני מסכים לתת שירות (נותן שירות)
          </button>
        )}
        {canFinalize && (
          <button onClick={() => finalizePoll.mutate({ negotiationId: id })} className="sc-btn-primary">
            🔒 סגור סקר וחשב תוצאות
          </button>
        )}
        {canCancel && (
          <button onClick={() => { if (confirm('לבטל את המשא ומתן?')) cancel.mutate({ negotiationId: id }) }}
            className="sc-btn-secondary">בטל משא ומתן</button>
        )}
      </div>

      {/* ── Messages ── */}
      <div ref={messagesRef} className="sc-card overflow-y-auto p-4 mb-3" style={{ maxHeight: '50vh' }}>
        {messages.length === 0 && <p className="text-center text-[#5a5a6e] text-sm py-8">אין הודעות עדיין.</p>}
        {messages.map((m: any) => {
          const isSystem = m.kind !== 'chat'
          const senderName = m.sender?.full_name || (isSystem ? 'מערכת' : 'משתמש')
          return (
            <div key={m.id} className={`mb-2 ${isSystem ? 'text-center' : (m.sender_id === n.invited_by ? 'text-right' : 'text-left')}`}>
              {isSystem ? (
                <p className="text-xs text-[#8e8e9e] italic px-3 py-1">— {m.body} —</p>
              ) : (
                <div className={`inline-block max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === n.invited_by ? 'bg-[#ebf1f7] text-[#212121]' : 'bg-[#3b6b9c] text-white'}`}>
                  <p className="text-[10px] opacity-70 mb-0.5">{senderName}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Composer ── */}
      {canChat && (
        <div className="flex gap-2">
          <input
            value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim()) sendMessage.mutate({ negotiationId: id, body: draft.trim() }) } }}
            placeholder="כתוב הודעה…" className="sc-input flex-1"/>
          <button onClick={() => draft.trim() && sendMessage.mutate({ negotiationId: id, body: draft.trim() })}
            disabled={!draft.trim() || sendMessage.isPending}
            className="sc-btn-primary disabled:opacity-50">שלח</button>
        </div>
      )}
    </PageLayout>
  )
}
