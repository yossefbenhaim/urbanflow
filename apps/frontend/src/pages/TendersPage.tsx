import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { useUser } from '../hooks/useUser'

const TENDER_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'lawyer', label: 'עורך דין', icon: '⚖️' },
  { key: 'organizer', label: 'מארגן', icon: '📋' },
  { key: 'developer', label: 'יזם', icon: '🏗️' },
  { key: 'appraiser', label: 'שמאי', icon: '💰' },
  { key: 'architect', label: 'אדריכל', icon: '📐' },
  { key: 'contractor', label: 'קבלן', icon: '🔨' },
  { key: 'other', label: 'אחר', icon: '📦' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'טיוטה', color: 'bg-sc-border text-[#212121]' },
  open: { label: 'פתוח', color: 'bg-[#4a8c5c]/15 text-[#4a8c5c]' },
  closed: { label: 'סגור', color: 'bg-red-500/15 text-red-500' },
  awarded: { label: 'נבחר זוכה', color: 'bg-[#ebf1f7] text-[#3b6b9c]' },
  cancelled: { label: 'בוטל', color: 'bg-gray-300 text-[#5a5a6e]' },
}

// ── Create Tender Modal ──────────────────────────────────
function CreateTenderModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [tenderType, setTenderType] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [deadline, setDeadline] = useState('')

  const create = trpc.tenders.createTender.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="sc-card p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#212121] mb-4">📋 פתיחת מכרז חדש</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#212121]">כותרת המכרז *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="לדוגמה: בחירת עורך דין לפרויקט"
              className="sc-input mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">סוג המכרז *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {TENDER_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTenderType(t.key)}
                  className={`p-2 rounded-lg border text-sm text-right transition-all ${
                    tenderType === t.key
                      ? 'border-sc-gold bg-[#8b6f47]/10 font-bold'
                      : 'border-[#eeeeee] hover:border-sc-gold/50'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">תיאור</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="תיאור מפורט של המכרז..."
              className="sc-input mt-1 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">דרישות</label>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              rows={2}
              placeholder="דרישות מיוחדות מהמציעים..."
              className="sc-input mt-1 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">מועד אחרון להגשה</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="sc-input mt-1"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() =>
              create.mutate({
                projectId,
                title,
                tenderType: tenderType as any,
                description: description || undefined,
                requirements: requirements || undefined,
                deadline: deadline || undefined,
              })
            }
            disabled={!title || !tenderType || create.isPending}
            className="sc-btn-primary flex-1 disabled:opacity-50"
          >
            {create.isPending ? 'יוצר...' : '📋 פתח מכרז'}
          </button>
          <button onClick={onClose} className="sc-btn-secondary flex-1">ביטול</button>
        </div>
        {create.error && (
          <p className="text-red-500 text-sm mt-2">{create.error.message}</p>
        )}
      </div>
    </div>
  )
}

// ── Submit Proposal Modal ────────────────────────────────
function SubmitProposalModal({
  tenderId,
  tenderTitle,
  onClose,
  onSuccess,
}: {
  tenderId: string
  tenderTitle: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [price, setPrice] = useState('')
  const [timeline, setTimeline] = useState('')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState('')
  const [experience, setExperience] = useState('')
  const [pastProjects, setPastProjects] = useState('')
  const [warranty, setWarranty] = useState('')

  const submit = trpc.tenders.submitProposal.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="sc-card p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#212121] mb-1">📝 הגשת הצעה</h2>
        <p className="text-sm text-[#5a5a6e] mb-4">{tenderTitle}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#212121]">תיאור ההצעה *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="תאר את ההצעה שלך..."
              className="sc-input mt-1 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#212121]">מחיר (₪)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="250,000"
                className="sc-input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#212121]">לו"ז (חודשים)</label>
              <input
                type="number"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                placeholder="12"
                className="sc-input mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#212121]">שנות ניסיון</label>
              <input
                type="number"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                className="sc-input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#212121]">פרויקטים קודמים</label>
              <input
                type="number"
                value={pastProjects}
                onChange={e => setPastProjects(e.target.value)}
                className="sc-input mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">יתרונות (מופרדים בפסיקים)</label>
            <input
              value={benefits}
              onChange={e => setBenefits(e.target.value)}
              placeholder="ניסיון בהתחדשות עירונית, ליווי צמוד"
              className="sc-input mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121]">פרטי ערבויות</label>
            <input
              value={warranty}
              onChange={e => setWarranty(e.target.value)}
              placeholder="ערבות ביצוע, ביטוח מקצועי..."
              className="sc-input mt-1"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() =>
              submit.mutate({
                tenderId,
                price: price ? Number(price) : undefined,
                timelineMonths: timeline ? Number(timeline) : undefined,
                description,
                benefits: benefits ? benefits.split(',').map(b => b.trim()) : undefined,
                experienceYears: experience ? Number(experience) : undefined,
                pastProjectsCount: pastProjects ? Number(pastProjects) : undefined,
                warrantyDetails: warranty || undefined,
              })
            }
            disabled={description.length < 5 || submit.isPending}
            className="sc-btn-primary flex-1 disabled:opacity-50"
          >
            {submit.isPending ? 'שולח...' : '📝 הגש הצעה'}
          </button>
          <button onClick={onClose} className="sc-btn-secondary flex-1">ביטול</button>
        </div>
        {submit.error && (
          <p className="text-red-500 text-sm mt-2">{submit.error.message}</p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function TendersPage() {
  const { user, profile } = useUser()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [proposalTarget, setProposalTarget] = useState<{ id: string; title: string } | null>(null)

  // Get user's project
  const projectId = profile?.project_id

  const { data: tenders, refetch } = trpc.tenders.getProjectTenders.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  )

  const isRep = profile?.role && ['organizer', 'committee_rep', 'manager'].includes(profile.role)
  const isProvider = profile?.role === 'provider'

  const displayTenders = isProvider
    ? (tenders ?? []).filter((t: any) => t.status === 'open')
    : tenders ?? []

  return (
    <PageLayout>
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#212121]">📋 מכרזים</h1>
          {isRep && projectId && (
            <button onClick={() => setShowCreate(true)} className="sc-btn-primary">
              ➕ פתח מכרז חדש
            </button>
          )}
        </div>

        {!projectId && (
          <div className="sc-card p-8 text-center">
            <p className="text-[#5a5a6e]">יש להצטרף לפרויקט כדי לצפות במכרזים</p>
          </div>
        )}

        {projectId && displayTenders.length === 0 && (
          <div className="sc-card p-8 text-center">
            <p className="text-6xl mb-3">📭</p>
            <p className="text-[#5a5a6e]">
              {isProvider ? 'אין מכרזים פתוחים כרגע' : 'לא נפתחו מכרזים עדיין'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {displayTenders.map((tender: any) => {
            const typeInfo = TENDER_TYPES.find(t => t.key === tender.tender_type)
            const statusInfo = STATUS_LABELS[tender.status] || STATUS_LABELS.open

            return (
              <div
                key={tender.id}
                className="sc-card p-5 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/tenders/${tender.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{typeInfo?.icon ?? '📦'}</span>
                      <h3 className="text-lg font-bold text-[#212121]">{tender.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {tender.description && (
                      <p className="text-sm text-[#5a5a6e] mt-1 line-clamp-2">{tender.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#5a5a6e]">
                      <span>📅 {new Date(tender.created_at).toLocaleDateString('he-IL')}</span>
                      {tender.deadline && (
                        <span>⏰ עד {new Date(tender.deadline).toLocaleDateString('he-IL')}</span>
                      )}
                      <span>📨 {tender.tender_proposals?.[0]?.count ?? 0} הצעות</span>
                      {tender.creator?.full_name && (
                        <span>👤 {tender.creator.full_name}</span>
                      )}
                    </div>
                  </div>
                  {isProvider && tender.status === 'open' && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setProposalTarget({ id: tender.id, title: tender.title })
                      }}
                      className="sc-btn-primary text-sm whitespace-nowrap"
                    >
                      📝 הגש הצעה
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && projectId && (
        <CreateTenderModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => refetch()}
        />
      )}

      {proposalTarget && (
        <SubmitProposalModal
          tenderId={proposalTarget.id}
          tenderTitle={proposalTarget.title}
          onClose={() => setProposalTarget(null)}
          onSuccess={() => refetch()}
        />
      )}
    </PageLayout>
  )
}
