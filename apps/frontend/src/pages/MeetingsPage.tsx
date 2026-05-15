import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'

type PollOption = {
  id: string
  option_at: string
  location?: string | null
  notes?: string | null
}

type Poll = {
  id: string
  topic: string
  description?: string | null
  status: 'open' | 'closed' | 'finalized' | 'cancelled'
  closes_at?: string | null
  finalized_option_id?: string | null
  majority_required_pct?: number | null
  created_at: string
  options?: PollOption[]
  // The backend selects with two aliases — flatten what we need:
  votes?: Array<{ id: string; votes?: Array<{ voter_id: string; vote_weight: number }> }>
}

export default function MeetingsPage() {
  const { data: my } = trpc.tenant.getMyProjectId.useQuery(undefined)
  const projectId = (my as { projectId?: string } | undefined)?.projectId
  const { data: polls = [], refetch } = trpc.meetings.listPolls.useQuery(
    projectId ? { projectId } : undefined,
    { enabled: !!projectId, refetchInterval: 20000 },
  )
  const [showCreate, setShowCreate] = useState(false)

  return (
    <PageLayout>
      <PageTitle>📅 פגישות וסקרי תאריך</PageTitle>

      {!projectId && (
        <p className="text-[#5a5a6e] text-sm text-center py-12">אין פרויקט משוייך לחשבון שלך עדיין.</p>
      )}

      {projectId && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-[#5a5a6e]">{polls.length} סקרים</p>
            <button onClick={() => setShowCreate(true)} className="sc-btn-primary text-sm">＋ סקר חדש</button>
          </div>

          {polls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-[#5a5a6e] text-sm">אין סקרי פגישה.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(polls as Poll[]).map(p => <PollCard key={p.id} poll={p} onChange={refetch} />)}
            </div>
          )}

          {showCreate && projectId && (
            <CreatePollModal
              projectId={projectId}
              onClose={() => setShowCreate(false)}
              onCreated={() => { setShowCreate(false); refetch() }}
            />
          )}
        </>
      )}
    </PageLayout>
  )
}

function PollCard({ poll, onChange }: { poll: Poll; onChange: () => void }) {
  const vote = trpc.meetings.vote.useMutation({
    onSuccess: () => { toast.success('הצבעתך נרשמה'); onChange() },
    onError: (e) => toast.error(e.message),
  })
  const finalize = trpc.meetings.finalizePoll.useMutation({
    onSuccess: () => { toast.success('סוגר ומקבע'); onChange() },
    onError: (e) => toast.error(e.message),
  })

  const tallies = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of poll.votes ?? []) {
      m.set(v.id, (v.votes ?? []).reduce((s, x) => s + (x.vote_weight ?? 1), 0))
    }
    return m
  }, [poll.votes])

  const totalVotes = Array.from(tallies.values()).reduce((s, x) => s + x, 0)
  const isFinalized = poll.status === 'finalized'
  const winnerId = poll.finalized_option_id

  return (
    <div className="sc-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-[#212121] text-sm">{poll.topic}</p>
          {poll.description && <p className="text-xs text-[#5a5a6e] mt-0.5">{poll.description}</p>}
        </div>
        <span className={`sc-badge ${isFinalized ? 'bg-[#dff2e1] text-[#4a8c5c]' : 'bg-[#ebf1f7] text-[#3b6b9c]'}`}>
          {isFinalized ? '✅ נסגר' : 'פתוח'}
        </span>
      </div>

      {poll.closes_at && !isFinalized && (
        <p className="text-[10px] text-[#8b6f47] mb-2">סגירה: {new Date(poll.closes_at).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      )}

      <div className="space-y-1.5">
        {(poll.options ?? []).map(opt => {
          const c = tallies.get(opt.id) ?? 0
          const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0
          const isWinner = winnerId === opt.id
          return (
            <div key={opt.id} className={`p-2 rounded-lg border ${isWinner ? 'border-[#4a8c5c] bg-[#dff2e1]/40' : 'border-[#eeeeee]'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-[#212121]">
                  {new Date(opt.option_at).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {opt.location && <span className="text-xs text-[#5a5a6e]"> · {opt.location}</span>}
                </p>
                <span className="text-xs text-[#5a5a6e]">{c} ({pct}%)</span>
              </div>
              {opt.notes && <p className="text-[10px] text-[#5a5a6e] mb-1">{opt.notes}</p>}
              <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div className={`h-full ${isWinner ? 'bg-[#4a8c5c]' : 'bg-[#3b6b9c]'}`} style={{ width: `${pct}%` }}/>
              </div>
              {!isFinalized && (
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={() => vote.mutate({ optionId: opt.id })}
                    className="text-[11px] text-[#3b6b9c] hover:underline" disabled={vote.isPending}>👍 הצבע</button>
                  <button onClick={() => finalize.mutate({ pollId: poll.id, optionId: opt.id })}
                    className="text-[11px] text-[#4a8c5c] hover:underline" disabled={finalize.isPending}>🔒 קבע כסופי</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreatePollModal({ projectId, onClose, onCreated }: {
  projectId: string; onClose: () => void; onCreated: () => void;
}) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<{ at: string; location: string }[]>([
    { at: '', location: '' }, { at: '', location: '' },
  ])
  const [closesAt, setClosesAt] = useState('')

  const create = trpc.meetings.createPoll.useMutation({
    onSuccess: () => { toast.success('סקר נוצר'); onCreated() },
    onError: (e) => toast.error(e.message),
  })

  function submit() {
    const filtered = options.filter(o => o.at)
    if (!topic.trim()) { toast.error('נושא חובה'); return }
    if (filtered.length === 0) { toast.error('לפחות אפשרות אחת'); return }
    create.mutate({
      projectId,
      topic: topic.trim(),
      description: description.trim() || undefined,
      options: filtered.map(o => ({
        optionAt: new Date(o.at).toISOString(),
        location: o.location.trim() || undefined,
      })),
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" dir="rtl">
      <div className="sc-card rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#212121]">📅 סקר תאריך חדש</h2>
          <button onClick={onClose} className="text-[#5a5a6e] text-xl leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#212121]">נושא הפגישה *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} className="sc-input mt-1"/>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">תיאור</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="sc-input mt-1 resize-none"/>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">תאריך סגירת הצבעה</label>
            <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} className="sc-input mt-1"/>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-[#212121]">אפשרויות תאריך *</label>
              <button onClick={() => setOptions(o => [...o, { at: '', location: '' }])}
                className="text-xs text-[#3b6b9c] hover:underline">+ הוסף</button>
            </div>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="datetime-local" value={o.at}
                  onChange={e => setOptions(arr => arr.map((x, j) => j === i ? { ...x, at: e.target.value } : x))}
                  className="sc-input flex-1"/>
                <input placeholder="מיקום" value={o.location}
                  onChange={e => setOptions(arr => arr.map((x, j) => j === i ? { ...x, location: e.target.value } : x))}
                  className="sc-input w-32"/>
                {options.length > 1 && (
                  <button onClick={() => setOptions(arr => arr.filter((_, j) => j !== i))}
                    className="text-red-500 text-lg">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={submit} disabled={create.isPending} className="flex-1 sc-btn-primary disabled:opacity-50">
              {create.isPending ? '...שולח' : 'צור סקר'}
            </button>
            <button onClick={onClose} className="flex-1 sc-btn-secondary">ביטול</button>
          </div>
        </div>
      </div>
    </div>
  )
}
