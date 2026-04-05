import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { useUser } from '../hooks/useUser'
import ElectionBanner from '../components/ElectionBanner'

const TYPE_LABELS: Record<string, string> = {
  lawyer: '⚖️ עורך דין',
  organizer: '📋 מארגן',
  developer: '🏗️ יזם',
  appraiser: '💰 שמאי',
  architect: '📐 אדריכל',
  contractor: '🔨 קבלן',
  other: '📦 אחר',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'טיוטה', color: 'bg-sc-border text-[#212121]' },
  open: { label: 'פתוח', color: 'bg-[#4a8c5c]/15 text-[#4a8c5c]' },
  closed: { label: 'סגור', color: 'bg-red-500/15 text-red-500' },
  awarded: { label: 'נבחר זוכה', color: 'bg-[#ebf1f7] text-[#3b6b9c]' },
  cancelled: { label: 'בוטל', color: 'bg-gray-300 text-[#5a5a6e]' },
}

// ── Proposal Comparison Table (C2) ──────────────────────
function ProposalComparison({
  tenderId,
  isRep,
  onAward,
}: {
  tenderId: string
  isRep: boolean
  onAward: (winnerId: string) => void
}) {
  const { data: proposals } = trpc.tenders.getTenderProposals.useQuery({ tenderId })
  const [sortKey, setSortKey] = useState<string>('price')
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = [...(proposals ?? [])].sort((a: any, b: any) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <th
      className="px-3 py-2 text-right cursor-pointer hover:text-[#8b6f47] transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? '▲' : '▼') : ''}
    </th>
  )

  if (!proposals?.length) {
    return (
      <div className="sc-card p-6 text-center">
        <p className="text-[#5a5a6e]">📭 עדיין לא הוגשו הצעות</p>
      </div>
    )
  }

  return (
    <div className="sc-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sc-text/5 text-[#212121] text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-right">מציע</th>
            <SortHeader label="מחיר (₪)" field="price" />
            <SortHeader label='לו"ז (חודשים)' field="timeline_months" />
            <SortHeader label="שנות ניסיון" field="experience_years" />
            <SortHeader label="פרויקטים" field="past_projects_count" />
            <th className="px-3 py-2 text-right">ערבויות</th>
            <th className="px-3 py-2 text-right">סטטוס</th>
            {isRep && <th className="px-3 py-2 text-right">פעולות</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p: any) => (
            <tr
              key={p.id}
              className={`border-t transition-colors ${
                p.status === 'winner'
                  ? 'bg-[#4a8c5c]/10 border-sc-success/20'
                  : 'hover:bg-[#f8f9fa]'
              }`}
            >
              <td className="px-3 py-3 font-medium">
                {p.status === 'winner' && '🏆 '}
                {p.provider?.full_name ?? 'ספק'}
              </td>
              <td className="px-3 py-3">
                {p.price ? `₪${Number(p.price).toLocaleString('he-IL')}` : '—'}
              </td>
              <td className="px-3 py-3">{p.timeline_months ?? '—'}</td>
              <td className="px-3 py-3">{p.experience_years ?? '—'}</td>
              <td className="px-3 py-3">{p.past_projects_count ?? '—'}</td>
              <td className="px-3 py-3 text-xs">{p.warranty_details ?? '—'}</td>
              <td className="px-3 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'winner'
                      ? 'bg-[#4a8c5c]/15 text-[#4a8c5c]'
                      : p.status === 'rejected'
                      ? 'bg-red-500/15 text-red-500'
                      : p.status === 'shortlisted'
                      ? 'bg-[#8b6f47]/15 text-[#8b6f47]'
                      : 'bg-[#f8f9fa] text-[#5a5a6e]'
                  }`}
                >
                  {p.status === 'winner' ? 'זוכה' : p.status === 'rejected' ? 'נדחה' : p.status === 'shortlisted' ? 'ברשימה מצומצמת' : 'הוגש'}
                </span>
              </td>
              {isRep && (
                <td className="px-3 py-3">
                  {p.status === 'submitted' && (
                    <button
                      onClick={() => onAward(p.provider_id)}
                      className="text-xs sc-btn-primary py-1 px-2"
                    >
                      🏆 בחר זוכה
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Negotiation Timeline (C3) ───────────────────────────
function NegotiationTimeline({
  tenderId,
  isRep,
}: {
  tenderId: string
  isRep: boolean
}) {
  const { data: rounds, refetch } = trpc.tenders.getNegotiationHistory.useQuery({ tenderId })
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [changes, setChanges] = useState('')
  const [docUrl, setDocUrl] = useState('')

  const addRound = trpc.tenders.addNegotiationRound.useMutation({
    onSuccess: () => {
      refetch()
      setShowAdd(false)
      setTitle('')
      setSummary('')
      setChanges('')
      setDocUrl('')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#212121]">🤝 סבבי משא ומתן</h3>
        {isRep && (
          <button onClick={() => setShowAdd(!showAdd)} className="sc-btn-secondary text-sm">
            ➕ סבב חדש
          </button>
        )}
      </div>

      {showAdd && (
        <div className="sc-card p-4 border-2 border-sc-gold/30">
          <div className="space-y-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="כותרת הסבב..."
              className="sc-input"
            />
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={2}
              placeholder="סיכום בשפה פשוטה..."
              className="sc-input resize-none"
            />
            <textarea
              value={changes}
              onChange={e => setChanges(e.target.value)}
              rows={2}
              placeholder="שינויים עיקריים..."
              className="sc-input resize-none"
            />
            <input
              value={docUrl}
              onChange={e => setDocUrl(e.target.value)}
              placeholder="קישור למסמך (אופציונלי)"
              className="sc-input"
            />
            <button
              onClick={() =>
                addRound.mutate({
                  tenderId,
                  title,
                  summary: summary || undefined,
                  changesDescription: changes || undefined,
                  documentUrl: docUrl || undefined,
                })
              }
              disabled={!title || addRound.isPending}
              className="sc-btn-primary text-sm disabled:opacity-50"
            >
              {addRound.isPending ? 'שומר...' : '💾 שמור סבב'}
            </button>
          </div>
        </div>
      )}

      {(!rounds || rounds.length === 0) && (
        <div className="sc-card p-6 text-center">
          <p className="text-[#5a5a6e]">עדיין לא התקיימו סבבי מו"מ</p>
        </div>
      )}

      <div className="relative">
        {(rounds ?? []).map((round: any, i: number) => (
          <div key={round.id} className="flex gap-4 mb-6">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#8b6f47] text-white flex items-center justify-center text-sm font-bold">
                {round.round_number}
              </div>
              {i < (rounds?.length ?? 0) - 1 && (
                <div className="w-0.5 flex-1 bg-[#8b6f47]/30 mt-1" />
              )}
            </div>
            {/* Content */}
            <div className="sc-card p-4 flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-[#212121]">{round.title}</h4>
                <span className="text-xs text-[#5a5a6e]">
                  {new Date(round.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
              {round.summary && (
                <p className="text-sm text-[#5a5a6e] mb-2">{round.summary}</p>
              )}
              {round.changes_description && (
                <div className="text-xs bg-[#8b6f47]/10 p-2 rounded border border-sc-gold/20">
                  <strong>שינויים:</strong> {round.changes_description}
                </div>
              )}
              {round.document_url && (
                <a
                  href={round.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#3b6b9c] hover:underline mt-2 inline-block"
                >
                  📄 צפה במסמך
                </a>
              )}
              {round.creator?.full_name && (
                <p className="text-xs text-[#5a5a6e] mt-1">👤 {round.creator.full_name}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contract Assignment Flow (C4) ───────────────────────
function ContractFlow({
  tenderId,
  projectId,
  isRep,
}: {
  tenderId: string
  projectId: string
  isRep: boolean
}) {
  const { user } = useUser()
  const { data: assignments, refetch } = trpc.tenders.getProjectAssignments.useQuery({ projectId })
  const tenderAssignments = (assignments ?? []).filter((a: any) => a.tender_id === tenderId)

  const scheduleMeeting = trpc.tenders.scheduleMeeting.useMutation({ onSuccess: () => refetch() })
  const completeMeeting = trpc.tenders.completeMeeting.useMutation({ onSuccess: () => refetch() })
  const uploadContract = trpc.tenders.uploadContract.useMutation({ onSuccess: () => refetch() })
  const startApproval = trpc.tenders.startApproval.useMutation({ onSuccess: () => refetch() })
  const approveContract = trpc.tenders.approveContract.useMutation({ onSuccess: () => refetch() })

  const [meetingDate, setMeetingDate] = useState('')
  const [contractUrl, setContractUrl] = useState('')
  const [requiredCount, setRequiredCount] = useState('')
  const [apartmentId, setApartmentId] = useState('')

  if (tenderAssignments.length === 0) return null

  const STEPS = [
    { key: 'pending_meeting', label: 'קביעת פגישה', icon: '📅' },
    { key: 'meeting_done', label: 'פגישה הושלמה', icon: '✅' },
    { key: 'contract_uploaded', label: 'חוזה הועלה', icon: '📄' },
    { key: 'pending_approval', label: 'ממתין לאישורים', icon: '🗳️' },
    { key: 'approved', label: 'אושר', icon: '🎉' },
  ]

  const stepIndex = (status: string) => STEPS.findIndex(s => s.key === status)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#212121]">📝 שיוך חוזה</h3>
      {tenderAssignments.map((a: any) => {
        const currentStep = stepIndex(a.status)
        return (
          <div key={a.id} className="sc-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏆</span>
              <span className="font-bold text-[#212121]">{a.provider?.full_name ?? 'ספק'}</span>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      i <= currentStep
                        ? 'bg-[#8b6f47] text-white'
                        : 'bg-[#f8f9fa] text-[#5a5a6e]'
                    }`}
                  >
                    {step.icon} {step.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 ${i < currentStep ? 'bg-[#8b6f47]' : 'bg-sc-border'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Approval Progress Bar */}
            {a.approval_required_count && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#5a5a6e] mb-1">
                  <span>אישורים: {a.approvals_received}/{a.approval_required_count}</span>
                  <span>{Math.round((a.approvals_received / a.approval_required_count) * 100)}%</span>
                </div>
                <div className="w-full bg-sc-border rounded-full h-3">
                  <div
                    className="bg-[#8b6f47] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (a.approvals_received / a.approval_required_count) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions based on status */}
            {isRep && a.status === 'pending_meeting' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-[#5a5a6e]">תאריך פגישה</label>
                  <input
                    type="datetime-local"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="sc-input mt-1"
                  />
                </div>
                <button
                  onClick={() => scheduleMeeting.mutate({ assignmentId: a.id, date: meetingDate })}
                  disabled={!meetingDate}
                  className="sc-btn-primary text-sm disabled:opacity-50"
                >
                  📅 קבע
                </button>
              </div>
            )}

            {isRep && a.status === 'pending_meeting' && a.meeting_scheduled_at && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-[#5a5a6e]">
                  פגישה ב-{new Date(a.meeting_scheduled_at).toLocaleString('he-IL')}
                </span>
                <button
                  onClick={() => completeMeeting.mutate({ assignmentId: a.id })}
                  className="sc-btn-primary text-sm"
                >
                  ✅ פגישה הושלמה
                </button>
              </div>
            )}

            {isRep && a.status === 'meeting_done' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-[#5a5a6e]">קישור לחוזה</label>
                  <input
                    value={contractUrl}
                    onChange={e => setContractUrl(e.target.value)}
                    placeholder="https://..."
                    className="sc-input mt-1"
                  />
                </div>
                <button
                  onClick={() => uploadContract.mutate({ assignmentId: a.id, fileUrl: contractUrl })}
                  disabled={!contractUrl}
                  className="sc-btn-primary text-sm disabled:opacity-50"
                >
                  📄 העלה חוזה
                </button>
              </div>
            )}

            {isRep && a.status === 'contract_uploaded' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-[#5a5a6e]">מספר אישורים נדרש</label>
                  <input
                    type="number"
                    value={requiredCount}
                    onChange={e => setRequiredCount(e.target.value)}
                    placeholder="למשל: 12"
                    className="sc-input mt-1"
                  />
                </div>
                <button
                  onClick={() => startApproval.mutate({ assignmentId: a.id, requiredCount: Number(requiredCount) })}
                  disabled={!requiredCount}
                  className="sc-btn-primary text-sm disabled:opacity-50"
                >
                  🗳️ פתח להצבעה
                </button>
              </div>
            )}

            {a.status === 'pending_approval' && (
              <div className="flex gap-2 items-end mt-3">
                <div className="flex-1">
                  <label className="text-xs text-[#5a5a6e]">מספר דירה</label>
                  <input
                    value={apartmentId}
                    onChange={e => setApartmentId(e.target.value)}
                    placeholder="UUID של הדירה"
                    className="sc-input mt-1"
                  />
                </div>
                <button
                  onClick={() => approveContract.mutate({ assignmentId: a.id, apartmentId })}
                  disabled={!apartmentId}
                  className="sc-btn-primary text-sm disabled:opacity-50"
                >
                  ✅ אישור
                </button>
              </div>
            )}

            {a.status === 'approved' && (
              <div className="text-center py-3">
                <span className="text-2xl">🎉</span>
                <p className="text-[#4a8c5c] font-bold">החוזה אושר!</p>
              </div>
            )}

            {a.contract_file_url && (
              <a
                href={a.contract_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#3b6b9c] hover:underline mt-2 inline-block"
              >
                📄 צפה בחוזה
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Detail Page ────────────────────────────────────
export default function TenderDetailPage() {
  const { tenderId } = useParams<{ tenderId: string }>()
  const navigate = useNavigate()
  const { profile } = useUser()

  const { data: tender, refetch } = trpc.tenders.getTenderById.useQuery(
    { tenderId: tenderId! },
    { enabled: !!tenderId }
  )

  const award = trpc.tenders.awardTender.useMutation({
    onSuccess: () => refetch(),
  })

  const close = trpc.tenders.closeTender.useMutation({
    onSuccess: () => refetch(),
  })

  const isRep = profile?.role && ['organizer', 'committee_rep', 'manager'].includes(profile.role)

  if (!tender) {
    return (
      <PageLayout>
        
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-[#5a5a6e]">טוען...</div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[tender.status] || STATUS_LABELS.open

  return (
    <PageLayout>
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate('/tenders')}
          className="text-sm text-[#5a5a6e] hover:text-[#212121] mb-4 inline-block"
        >
          → חזרה למכרזים
        </button>

        <div className="sc-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{TYPE_LABELS[tender.tender_type]?.slice(0, 2)}</span>
                <h1 className="text-2xl font-bold text-[#212121]">{tender.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-[#5a5a6e]">
                סוג: {TYPE_LABELS[tender.tender_type]} • נוצר ב-{new Date(tender.created_at).toLocaleDateString('he-IL')}
                {tender.deadline && ` • מועד אחרון: ${new Date(tender.deadline).toLocaleDateString('he-IL')}`}
              </p>
              {tender.description && (
                <p className="text-[#5a5a6e] mt-3">{tender.description}</p>
              )}
              {tender.requirements && (
                <div className="mt-2 text-sm bg-[#8b6f47]/10 p-3 rounded border border-sc-gold/20">
                  <strong>דרישות:</strong> {tender.requirements}
                </div>
              )}
              {tender.winner?.full_name && (
                <p className="mt-2 text-[#4a8c5c] font-bold">🏆 זוכה: {tender.winner.full_name}</p>
              )}
            </div>
            {isRep && tender.status === 'open' && (
              <button
                onClick={() => close.mutate({ tenderId: tender.id })}
                className="sc-btn-secondary text-sm"
              >
                🔒 סגור מכרז
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          {/* C2: Proposal Comparison */}
          <div>
            <h3 className="text-lg font-bold text-[#212121] mb-3">📊 השוואת הצעות</h3>
            <ProposalComparison
              tenderId={tender.id}
              isRep={!!isRep && tender.status === 'open'}
              onAward={winnerId => award.mutate({ tenderId: tender.id, winnerId })}
            />
          </div>

          {/* Organizer Election Banner */}
          {tender.status === 'awarded' && tender.tender_type === 'organizer' && tender.project_id && (
            <ElectionBanner buildingId={tender.project_id} formType="organizer" />
          )}

          {/* C3: Negotiation Timeline */}
          <NegotiationTimeline tenderId={tender.id} isRep={!!isRep} />

          {/* C4: Contract Flow */}
          {tender.status === 'awarded' && tender.project_id && (
            <ContractFlow
              tenderId={tender.id}
              projectId={tender.project_id}
              isRep={!!isRep}
            />
          )}
        </div>
      </PageLayout>
    </PageLayout>
  )
}
