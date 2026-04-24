import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import PageLayout, { PageTitle } from '../components/PageLayout'
import CityAutocomplete from '../components/CityAutocomplete'
import { SubmitProposalModal } from './TendersPage'
import { trpc } from '../lib/trpc'

const PROJECT_TYPE_HE: Record<string, string> = {
  pinuy_binuy: 'פינוי בינוי',
  tama_38_2: `תמ"א 38/2`,
  chalufat_shaked: 'חלופת שקד',
  binui_pinui: 'בינוי פינוי',
}

const PROVIDER_TYPE_HE: Record<string, string> = {
  lawyer: 'עו״ד דיירים',
  architect: 'אדריכל',
  appraiser: 'שמאי',
  developer: 'יזם',
}

const PROPOSAL_STATUS_HE: Record<string, { label: string; fg: string; bg: string }> = {
  submitted: { label: 'ממתין', fg: 'text-[#c4841d]', bg: 'bg-[#fcf4e7]' },
  winner:    { label: 'זכית',  fg: 'text-[#4a8c5c]', bg: 'bg-[#edf5ef]' },
  rejected:  { label: 'נדחה',  fg: 'text-red-600',   bg: 'bg-red-50' },
}

type Tab = 'matches' | 'jobs' | 'applications' | 'assignments' | 'negotiations' | 'profile'

const RECOMMENDATION_HE: Record<string, { label: string; fg: string; bg: string }> = {
  accept:    { label: 'מומלץ לקבל',    fg: 'text-[#4a8c5c]', bg: 'bg-[#edf5ef]' },
  reject:    { label: 'מומלץ לדחות',   fg: 'text-red-600',   bg: 'bg-red-50' },
  negotiate: { label: 'המשך מו״מ',     fg: 'text-[#c4841d]', bg: 'bg-[#fcf4e7]' },
  neutral:   { label: 'ניטרלי',        fg: 'text-[#5a5a6e]', bg: 'bg-[#f0f0f0]' },
}

const ROUND_STATUS_HE: Record<string, string> = {
  open: 'פתוח',
  improved: 'שופר',
  pending: 'ממתין',
  closed: 'סגור',
}

const ASSIGNMENT_STATUS_HE: Record<string, { label: string; fg: string; bg: string; emoji: string }> = {
  pending_meeting:     { label: 'ממתין לפגישה',    fg: 'text-[#c4841d]', bg: 'bg-[#fcf4e7]', emoji: '📅' },
  meeting_done:        { label: 'פגישה בוצעה',     fg: 'text-[#3b6b9c]', bg: 'bg-[#ebf1f7]', emoji: '✔️' },
  contract_uploaded:   { label: 'חוזה הועלה',      fg: 'text-[#3b6b9c]', bg: 'bg-[#ebf1f7]', emoji: '📄' },
  pending_approval:    { label: 'ממתין לאישור דיירים', fg: 'text-[#c4841d]', bg: 'bg-[#fcf4e7]', emoji: '🗳️' },
  approved:            { label: 'פעיל בפרויקט',    fg: 'text-[#4a8c5c]', bg: 'bg-[#edf5ef]', emoji: '✅' },
  rejected:            { label: 'נדחה',            fg: 'text-red-600',   bg: 'bg-red-50',    emoji: '❌' },
}

export default function ProviderDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  // /provider/profile → open Profile tab directly (sidebar entry point).
  const initialTab: Tab = location.pathname.endsWith('/profile') ? 'profile' : 'matches'
  const [tab, setTab] = useState<Tab>(initialTab)
  useEffect(() => {
    if (location.pathname.endsWith('/profile')) setTab('profile')
  }, [location.pathname])
  const [proposalTarget, setProposalTarget] = useState<{ id: string; title: string } | null>(null)
  const [uploadTarget, setUploadTarget] = useState<{ id: string; projectName: string } | null>(null)

  // Redirect to onboarding if the provider hasn't chosen a type yet.
  // Always fetch fresh to avoid redirecting based on a stale cache right
  // after the user has just completed onboarding.
  const { data: onboarding, isLoading: loadingOnboarding, isFetching: fetchingOnboarding } =
    trpc.provider.getOnboardingStatus.useQuery(undefined, { refetchOnMount: 'always', staleTime: 0 })
  useEffect(() => {
    // Wait for a fresh response (not just cached stale data) before redirecting.
    if (loadingOnboarding || fetchingOnboarding) return
    if (onboarding && !onboarding.completed) {
      navigate('/provider/onboarding', { replace: true })
    }
  }, [loadingOnboarding, fetchingOnboarding, onboarding, navigate])

  const { data: recommendations, isLoading: loadingRec } = trpc.match.getRecommendedProjects.useQuery(
    { limit: 10 },
    { enabled: tab === 'matches' && onboarding?.completed === true }
  )

  const { data: openTenders, isLoading: loadingTenders, refetch: refetchTenders } =
    trpc.tenders.listOpenTendersForProvider.useQuery(undefined, {
      enabled: tab === 'jobs' && onboarding?.completed === true,
    })

  const { data: myProposals, isLoading: loadingProposals, refetch: refetchProposals } =
    trpc.tenders.listMyProposals.useQuery(undefined, {
      enabled: tab === 'applications' && onboarding?.completed === true,
    })

  const { data: myAssignments, isLoading: loadingAssignments, refetch: refetchAssignments } =
    trpc.tenders.listMyAssignments.useQuery(undefined, {
      enabled: (tab === 'assignments' || tab === 'negotiations') && onboarding?.completed === true,
    })

  // Lawyer-only "מו״מ" tab — fetch lightweight provider type to decide whether to show it.
  const { data: myDetails } = trpc.provider.getMyDetails.useQuery(undefined, {
    enabled: onboarding?.completed === true,
  })
  const isLawyer = myDetails?.providerType === 'lawyer'

  return (
    <PageLayout>
      <PageTitle>לוח הבקרה — נותן שירות</PageTitle>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {(([
          ['matches','המלצות'],
          ['jobs','משרות פתוחות'],
          ['applications','המועמדויות שלי'],
          ['assignments','הפרויקטים שלי'],
          ...(isLawyer ? [['negotiations','מו״מ'] as [Tab,string]] : []),
          ['profile','הפרופיל שלי'],
        ]) as [Tab,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors whitespace-nowrap ${
              tab === v ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#8e8e9e]'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'matches' && (
          <>
            {loadingRec && <p className="text-center text-[#5a5a6e] py-8">טוען המלצות...</p>}
            {!loadingRec && recommendations && !recommendations.hasPreferences && (
              <div className="sc-card p-6 text-center">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="font-bold text-[#1e3a5f] mb-2">הגדר העדפות התאמה</h3>
                <p className="text-sm text-[#5a5a6e] mb-4">
                  כדי שמנוע ההתאמה יציג פרויקטים מתאימים עבורך, הגדר העדפות: ערים, סוגי פרויקטים,
                  רמת סיכון ורווחיות רצויה.
                </p>
                <Link to="/provider/preferences" className="inline-block sc-btn-primary">הגדר העדפות</Link>
              </div>
            )}
            {!loadingRec && recommendations && recommendations.hasPreferences && recommendations.recommendations.length === 0 && (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-[13px]">אין כרגע פרויקטים מתאימים. ננסה שוב בקרוב.</p>
              </div>
            )}
            {!loadingRec && recommendations && recommendations.recommendations.length > 0 && (
              <>
                <p className="text-xs text-[#5a5a6e] text-center">
                  {recommendations.recommendations.length} פרויקטים מותאמים, ממוין לפי ציון התאמה
                </p>
                {recommendations.recommendations.map(r => (
                  <div key={r.project.id} className="sc-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-[#212121] text-[15px]">{r.project.name}</h3>
                        {r.project.address && (
                          <p className="text-[12px] text-[#5a5a6e] mt-0.5">📍 {r.project.address}</p>
                        )}
                      </div>
                      <ScoreBadge score={r.score} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.project.project_type && (
                        <span className="bg-[#ebf1f7] text-[#3b6b9c] text-[10px] rounded-full px-3 py-1 font-semibold">
                          {PROJECT_TYPE_HE[r.project.project_type] ?? r.project.project_type}
                        </span>
                      )}
                      <span className="bg-[#f8f9fa] text-[#5a5a6e] text-[10px] rounded-full px-3 py-1 font-semibold">
                        {r.project.status}
                      </span>
                    </div>
                  </div>
                ))}
                <Link to="/provider/preferences" className="block text-center text-[13px] text-[#3b6b9c] font-semibold pt-4">
                  ⚙️ עדכן העדפות
                </Link>
              </>
            )}
          </>
        )}

        {tab === 'jobs' && (
          <>
            {loadingTenders && <p className="text-center text-[#5a5a6e] py-8">טוען מכרזים פתוחים...</p>}
            {!loadingTenders && openTenders && openTenders.tenders.length === 0 && (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-[13px]">
                  {openTenders.providerType
                    ? `אין כרגע מכרזים פתוחים ל${PROVIDER_TYPE_HE[openTenders.providerType] ?? openTenders.providerType}`
                    : 'השלם אונבורדינג כדי לראות מכרזים'}
                </p>
              </div>
            )}
            {!loadingTenders && openTenders && openTenders.tenders.length > 0 && (
              <>
                <p className="text-xs text-[#5a5a6e] text-center">
                  {openTenders.tenders.length} מכרזים פתוחים עבורך
                </p>
                {openTenders.tenders.map((t: {
                  id: string; title: string; description?: string; deadline?: string; created_at: string;
                  project?: { id: string; name: string; address?: string; project_type?: string } | null
                }) => (
                  <div key={t.id} className="sc-card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#212121] text-[15px]">{t.title}</h3>
                      <span className="text-[11px] text-[#8e8e9e]">
                        {new Date(t.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    {t.project && (
                      <p className="text-[13px] text-[#3b6b9c] mb-1">{t.project.name}</p>
                    )}
                    {t.project?.address && (
                      <p className="text-[11px] text-[#5a5a6e] mb-3">📍 {t.project.address}</p>
                    )}
                    {t.description && (
                      <p className="text-[12px] text-[#5a5a6e] mb-3 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {t.project?.project_type && (
                        <span className="bg-[#ebf1f7] text-[#3b6b9c] text-[10px] rounded-full px-3 py-1 font-semibold">
                          {PROJECT_TYPE_HE[t.project.project_type] ?? t.project.project_type}
                        </span>
                      )}
                      {t.deadline && (
                        <span className="bg-[#fcf4e7] text-[#c4841d] text-[10px] rounded-full px-3 py-1 font-semibold">
                          ⏰ עד {new Date(t.deadline).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/tenders/${t.id}`)}
                        className="sc-btn-secondary flex-1"
                      >פרטים</button>
                      <button
                        onClick={() => setProposalTarget({ id: t.id, title: t.title })}
                        className="sc-btn-primary flex-1"
                      >הגש הצעה →</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'applications' && (
          <div className="space-y-3">
            {loadingProposals && <p className="text-center text-[#5a5a6e] py-8">טוען הצעות...</p>}
            {!loadingProposals && (myProposals ?? []).length === 0 && (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-[13px]">לא הגשת הצעות עדיין</p>
                <button onClick={() => setTab('jobs')} className="mt-4 text-[#3b6b9c] text-[13px] font-semibold">
                  עיין במכרזים פתוחים
                </button>
              </div>
            )}
            {!loadingProposals && (myProposals ?? []).map((p: {
              id: string; status: string; submitted_at: string; price?: number | null;
              tender?: { id: string; title: string; status: string; project?: { id: string; name: string } | null } | null
            }) => {
              const st = PROPOSAL_STATUS_HE[p.status] ?? PROPOSAL_STATUS_HE.submitted
              return (
                <button
                  key={p.id}
                  onClick={() => p.tender && navigate(`/tenders/${p.tender.id}`)}
                  className="sc-card p-4 w-full text-right"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[#212121] text-[13px]">{p.tender?.title ?? '—'}</p>
                    <span className={`${st.bg} ${st.fg} text-[10px] rounded-full px-3 py-1 font-semibold`}>
                      {st.label}
                    </span>
                  </div>
                  {p.tender?.project?.name && (
                    <p className="text-[11px] text-[#3b6b9c]">{p.tender.project.name}</p>
                  )}
                  <div className="flex justify-between mt-2 text-[11px] text-[#8e8e9e]">
                    <span>{new Date(p.submitted_at).toLocaleDateString('he-IL')}</span>
                    {p.price != null && (
                      <span>{p.price.toLocaleString('he-IL')} ₪</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'assignments' && (
          <div className="space-y-3">
            {loadingAssignments && <p className="text-center text-[#5a5a6e] py-8">טוען...</p>}
            {!loadingAssignments && (myAssignments ?? []).length === 0 && (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">🏗️</div>
                <p className="text-[13px]">עדיין לא שויכת לפרויקט</p>
                <p className="text-[11px] mt-2">זכייה במכרז תיצור שיוך אוטומטי</p>
              </div>
            )}
            {!loadingAssignments && (myAssignments ?? []).map((a: {
              id: string; status: string; contract_file_url?: string | null;
              approval_required_count?: number | null; approvals_received?: number | null;
              meeting_scheduled_at?: string | null; meeting_completed?: boolean | null;
              created_at: string;
              project?: { id: string; name: string; address?: string; project_type?: string } | null;
              tender?: { id: string; title: string; tender_type: string } | null;
            }) => {
              const st = ASSIGNMENT_STATUS_HE[a.status] ?? ASSIGNMENT_STATUS_HE.pending_meeting
              const pct = (a.approval_required_count && a.approvals_received != null)
                ? Math.min(100, Math.round(((a.approvals_received ?? 0) / a.approval_required_count) * 100))
                : 0
              const canUpload = !a.contract_file_url && a.status !== 'approved' && a.status !== 'rejected'
              return (
                <div key={a.id} className="sc-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#212121] text-[15px] truncate">{a.project?.name ?? '—'}</h3>
                      {a.project?.address && (
                        <p className="text-[11px] text-[#5a5a6e] mt-0.5">📍 {a.project.address}</p>
                      )}
                      {a.tender?.title && (
                        <p className="text-[12px] text-[#3b6b9c] mt-1">ממכרז: {a.tender.title}</p>
                      )}
                    </div>
                    <span className={`${st.bg} ${st.fg} text-[10px] rounded-full px-3 py-1 font-semibold whitespace-nowrap`}>
                      {st.emoji} {st.label}
                    </span>
                  </div>

                  {a.status === 'pending_approval' && a.approval_required_count ? (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-[#5a5a6e] mb-1">
                        <span>אישורי דיירים</span>
                        <span>{a.approvals_received ?? 0} / {a.approval_required_count}</span>
                      </div>
                      <div className="w-full bg-[#f0f0f0] rounded-full h-2">
                        <div className="bg-[#3b6b9c] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2 mt-3">
                    {a.contract_file_url && (
                      <a href={a.contract_file_url} target="_blank" rel="noopener"
                        className="sc-btn-secondary flex-1 text-center">
                        📄 צפייה בחוזה
                      </a>
                    )}
                    {canUpload && (
                      <button
                        onClick={() => setUploadTarget({ id: a.id, projectName: a.project?.name ?? '' })}
                        className="sc-btn-primary flex-1"
                      >העלה חוזה חתום</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'negotiations' && (
          <div className="space-y-3">
            {loadingAssignments && <p className="text-center text-[#5a5a6e] py-8">טוען...</p>}
            {!loadingAssignments && (myAssignments ?? []).length === 0 && (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">⚖️</div>
                <p className="text-[13px]">אין פרויקטים פעילים לניהול מו״מ</p>
                <p className="text-[11px] mt-2">רק אחרי שיוך לפרויקט ניתן לנהל מו״מ</p>
              </div>
            )}
            {!loadingAssignments && (myAssignments ?? []).map((a: {
              id: string; status: string;
              project?: { id: string; name: string; address?: string } | null;
              tender?: { id: string; title: string } | null;
            }) => (
              <NegotiationsCard
                key={a.id}
                assignmentId={a.id}
                tenderId={a.tender?.id ?? null}
                projectName={a.project?.name ?? '—'}
                projectAddress={a.project?.address}
                tenderTitle={a.tender?.title}
              />
            ))}
          </div>
        )}

        {tab === 'profile' && <ProfileTab />}
      </div>

      {proposalTarget && (
        <SubmitProposalModal
          tenderId={proposalTarget.id}
          tenderTitle={proposalTarget.title}
          onClose={() => setProposalTarget(null)}
          onSuccess={() => {
            toast.success('ההצעה נשלחה')
            refetchTenders()
            refetchProposals()
          }}
        />
      )}

      {uploadTarget && (
        <UploadContractModal
          assignmentId={uploadTarget.id}
          projectName={uploadTarget.projectName}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => {
            toast.success('החוזה הועלה בהצלחה')
            setUploadTarget(null)
            refetchAssignments()
          }}
        />
      )}
    </PageLayout>
  )
}

function UploadContractModal({ assignmentId, projectName, onClose, onSuccess }: {
  assignmentId: string; projectName: string; onClose: () => void; onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const upload = trpc.tenders.uploadContract.useMutation()

  const handleUpload = async () => {
    if (!file) { toast.error('בחר קובץ PDF'); return }
    if (file.type !== 'application/pdf') { toast.error('יש להעלות PDF בלבד'); return }
    setUploading(true)
    try {
      const token = localStorage.getItem('sb-token')
      if (!token) throw new Error('אינך מחובר')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const storagePath = `contracts/${Date.now()}-${safeName}`
      const res = await fetch(`/api/upload?path=${encodeURIComponent(storagePath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `שגיאה ${res.status}`)
      }
      const fileUrl = `https://supabase.byclick.co.il/storage/v1/object/public/documents/${storagePath}`
      await upload.mutateAsync({ assignmentId, fileUrl })
      onSuccess()
    } catch (e) {
      toast.error((e as Error).message || 'העלאה נכשלה')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-[#1e3a5f] text-[16px] mb-1">העלאת חוזה חתום</h3>
        {projectName && <p className="text-[12px] text-[#5a5a6e] mb-4">{projectName}</p>}

        <label className="block border-2 border-dashed border-[#d0d7de] rounded-xl p-6 text-center cursor-pointer hover:border-[#3b6b9c] transition-colors">
          <input type="file" accept="application/pdf" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <div className="text-3xl mb-2">📄</div>
          <p className="text-[13px] text-[#5a5a6e]">
            {file ? file.name : 'לחץ לבחירת קובץ PDF'}
          </p>
        </label>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={uploading}
            className="flex-1 py-3 rounded-xl bg-white border border-[#eeeeee] text-[#5a5a6e] font-semibold disabled:opacity-50">
            ביטול
          </button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="sc-btn-primary flex-1 disabled:opacity-60">
            {uploading ? 'מעלה...' : 'העלה'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  architect: '🏛️ אדריכל',
  appraiser: '📊 שמאי',
  developer: '🏢 יזם',
  lawyer: '⚖️ עו״ד מייצג דיירים',
}

const LAWYER_SPEC_LABELS: Record<string, string> = {
  pinui_binui: 'פינוי בינוי',
  tama38: 'תמ״א 38',
  complex_compounds: 'מתחמים מורכבים',
  small_projects: 'פרויקטים קטנים',
  difficult_tenant: 'טיפול בדייר סרבן',
  litigation_realestate: 'ליטיגציה מקרקעין',
}
const FEE_STRUCTURE_LABELS: Record<string, string> = {
  from_developer: 'מהיזם',
  from_tenants: 'מהדיירים',
  mixed: 'משולב',
}
const SIZE_LABELS: Record<string, string> = { small: 'קטן', medium: 'בינוני', large: 'גדול' }
const COMPLEXITY_LABELS: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' }

type ProviderType = 'architect' | 'appraiser' | 'developer' | 'lawyer'

const SPECIALIZATIONS: Record<Exclude<ProviderType, 'lawyer'>, string[]> = {
  architect: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי', 'שימור', 'מגורים', 'מסחר'],
  appraiser: ['מגורים', 'מסחר', 'תעשייה', 'קרקעות', 'שימוש מעורב'],
  developer: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי'],
}

function ProfileTab() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { data, isLoading, refetch, isFetching } = trpc.provider.getMyDetails.useQuery(undefined, {
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [mainCity, setMainCity] = useState('')
  const [license, setLicense] = useState('')
  const [years, setYears] = useState('')
  const [projects, setProjects] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [portfolioInput, setPortfolioInput] = useState('')
  const [portfolio, setPortfolio] = useState<string[]>([])
  const [ratingUrl, setRatingUrl] = useState('')

  const hydrate = () => {
    if (!data) return
    setFullName(data.fullName ?? '')
    setPhone(data.phone ?? '')
    setMainCity(data.mainCity ?? '')
    setLicense(data.licenseNumber ?? '')
    setYears(data.experienceYears != null ? String(data.experienceYears) : '')
    setProjects(data.completedProjects != null ? String(data.completedProjects) : '')
    setSpecs(data.specializations ?? [])
    setPortfolio(data.portfolioUrls ?? [])
    setRatingUrl(data.ratingUrl ?? '')
  }

  const save = trpc.provider.updateMyDetails.useMutation({
    onSuccess: () => {
      toast.success('הפרופיל עודכן בהצלחה')
      setEditing(false)
      utils.provider.getMyDetails.invalidate()
      utils.provider.getProfile.invalidate()
    },
    onError: (e) => toast.error(e.message || 'שגיאה בשמירת הפרופיל'),
  })

  if (isLoading) return <p className="text-center text-[#5a5a6e] py-8">טוען פרופיל...</p>
  if (!data) return <p className="text-center text-[#5a5a6e] py-8">לא נמצאו פרטי פרופיל</p>

  const initial = (data.fullName || data.email || '?')[0].toUpperCase()

  const onStartEdit = () => {
    // Lawyer has many type-specific fields — route to onboarding in edit mode
    // instead of trying to reproduce the whole form inline.
    if (data?.providerType === 'lawyer') {
      navigate('/provider/onboarding')
      return
    }
    hydrate(); setEditing(true)
  }
  const onCancel = () => { setEditing(false) }
  const onSave = () => {
    if (!data.providerType) { toast.error('סוג נותן שירות חסר'); return }
    if (!fullName.trim()) { toast.error('שם מלא נדרש'); return }
    if (!phone.trim()) { toast.error('טלפון נדרש'); return }
    if (!mainCity.trim()) { toast.error('עיר פעילות ראשית נדרשת'); return }
    save.mutate({
      providerType: data.providerType as ProviderType,
      fullName: fullName.trim(),
      phone: phone.trim(),
      mainCity: mainCity.trim(),
      licenseNumber: license.trim() || undefined,
      experienceYears: years ? +years : undefined,
      completedProjects: projects ? +projects : undefined,
      specializations: specs,
      portfolioUrls: portfolio,
      ratingUrl: ratingUrl.trim() || undefined,
    })
  }

  const toggleSpec = (s: string) =>
    setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  const addPortfolio = () => {
    const v = portfolioInput.trim()
    if (v && !portfolio.includes(v)) setPortfolio([...portfolio, v])
    setPortfolioInput('')
  }

  if (editing) {
    const type = data.providerType as ProviderType | null
    return (
      <div className="sc-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-[18px] font-bold">{initial}</div>
          <div className="min-w-0">
            <p className="font-bold text-[#212121] text-[15px] truncate">עריכת פרופיל</p>
            {data.providerType && (
              <p className="text-[13px] text-[#3b6b9c] font-semibold">{PROVIDER_TYPE_LABELS[data.providerType]}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <EditField label="שם מלא *" value={fullName} onChange={setFullName} />
          <EditField label="טלפון *" value={phone} onChange={setPhone} placeholder="050-1234567" />
          <CityAutocomplete
            label="עיר פעילות ראשית"
            required
            value={mainCity}
            onChange={setMainCity}
            placeholder="הקלד שם עיר ובחר מהרשימה"
          />
          <EditField label="מספר רישיון מקצועי" value={license} onChange={setLicense} placeholder="אם קיים" />
          <div className="grid grid-cols-2 gap-3">
            <EditField label="שנות ניסיון" value={years} onChange={setYears} type="number" />
            <EditField label="פרויקטים שבוצעו" value={projects} onChange={setProjects} type="number" />
          </div>

          {type && type !== 'lawyer' && (
            <div>
              <label className="block text-xs text-[#5a5a6e] mb-1">אזורי התמחות / סוגי פרויקטים</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS[type].map(s => (
                  <button key={s} onClick={() => toggleSpec(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors
                      ${specs.includes(s) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#5a5a6e] mb-1">תיק עבודות / אתר</label>
            <div className="flex gap-2">
              <input type="url" value={portfolioInput}
                onChange={e => setPortfolioInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPortfolio())}
                placeholder="https://..." className="sc-input flex-1" />
              <button onClick={addPortfolio} className="px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold">+</button>
            </div>
            {portfolio.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {portfolio.map((u, i) => (
                  <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    {safeHost(u)}
                    <button onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))} className="text-[#3b6b9c]">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <EditField label="קישור לדירוג" value={ratingUrl} onChange={setRatingUrl} placeholder="https://..." type="url" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} disabled={save.isPending}
            className="flex-1 py-3 rounded-2xl bg-white border border-[#eeeeee] text-[#5a5a6e] font-semibold disabled:opacity-50">
            ביטול
          </button>
          <button onClick={onSave} disabled={save.isPending}
            className="sc-btn-primary flex-1 disabled:opacity-60">
            {save.isPending ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    )
  }

  // View mode
  const d = data as Record<string, unknown>
  const str = (k: string): string | null => (typeof d[k] === 'string' && (d[k] as string).trim().length > 0 ? d[k] as string : null)
  const num = (k: string): number | null => (typeof d[k] === 'number' ? d[k] as number : null)
  const arr = (k: string): string[] => Array.isArray(d[k]) ? d[k] as string[] : []
  const regions = arr('operatingRegions')
  const extraRegions = regions.slice(1)
  const isLawyer = data.providerType === 'lawyer'
  const specsHe = isLawyer
    ? arr('specializations').map(s => LAWYER_SPEC_LABELS[s] ?? s)
    : arr('specializations')
  const refs = Array.isArray(d.lawyerReferences) ? d.lawyerReferences as Array<{name:string;phone:string;project_name:string}> : []
  const rows: { label: string; value: string | null }[] = [
    { label: 'סוג שירות', value: data.providerType ? PROVIDER_TYPE_LABELS[data.providerType] : null },
    { label: 'שם מלא', value: data.fullName },
    { label: 'טלפון', value: data.phone },
    { label: 'אימייל', value: data.email },
    { label: 'עיר פעילות ראשית', value: data.mainCity },
    ...(extraRegions.length > 0 ? [{ label: 'אזורי פעילות נוספים', value: extraRegions.join(', ') }] : []),
    ...(isLawyer && arr('neighborhoods').length > 0 ? [{ label: 'שכונות', value: arr('neighborhoods').join(', ') }] : []),
    { label: isLawyer ? 'שם משרד' : 'חברה / משרד', value: isLawyer ? str('officeName') || str('company') : str('company') },
    { label: 'מספר רישיון', value: data.licenseNumber },
    { label: 'רשות רישוי', value: str('licenseAuthority') },
    { label: 'תוקף רישיון', value: str('licenseExpiry') },
    { label: 'שנות ניסיון', value: num('experienceYears') != null ? `${num('experienceYears')} שנים` : null },
    { label: 'פרויקטים שבוצעו', value: num('completedProjects') != null ? String(num('completedProjects')) : null },
    ...(isLawyer && num('inProgressProjectsCount') != null ? [{ label: 'פרויקטים בתהליך', value: String(num('inProgressProjectsCount')) }] : []),
    { label: 'התמחויות', value: specsHe.length > 0 ? specsHe.join(', ') : null },
    ...(isLawyer && arr('preferredProjectSizes').length > 0 ? [{ label: 'גדלי פרויקט מועדפים', value: arr('preferredProjectSizes').map(s => SIZE_LABELS[s] ?? s).join(', ') }] : []),
    ...(isLawyer && arr('preferredComplexity').length > 0 ? [{ label: 'רמות מורכבות', value: arr('preferredComplexity').map(c => COMPLEXITY_LABELS[c] ?? c).join(', ') }] : []),
    ...(isLawyer ? [{ label: 'מקבל כדאיות נמוכה', value: d.acceptsLowFeasibility === true ? 'כן' : 'לא' }] : []),
    ...(isLawyer ? [{ label: 'מקבל פרויקטים קשים', value: d.acceptsDifficultProjects === true ? 'כן' : 'לא' }] : []),
    ...(isLawyer && arr('completedProjectTypes').length > 0 ? [{ label: 'סוגי פרויקטים שבוצעו', value: arr('completedProjectTypes').join(', ') }] : []),
    ...(isLawyer && str('feeStructure') ? [{ label: 'מבנה שכר טרחה', value: FEE_STRUCTURE_LABELS[str('feeStructure')!] ?? str('feeStructure') }] : []),
    ...(isLawyer && num('feePercent') != null ? [{ label: 'אחוז שכר טרחה', value: `${num('feePercent')}%` }] : []),
    ...(isLawyer && num('feeFixedAmount') != null ? [{ label: 'סכום קבוע', value: `${num('feeFixedAmount')} ₪` }] : []),
    ...(isLawyer && str('feeSpecialTerms') ? [{ label: 'תנאים מיוחדים', value: str('feeSpecialTerms') }] : []),
    { label: 'אתר / אתר אישי', value: str('website') },
    { label: 'LinkedIn', value: str('linkedinUrl') },
    { label: 'קישור לדירוג', value: data.ratingUrl },
    { label: isLawyer ? 'למה לבחור בי' : 'תיאור מקצועי', value: isLawyer ? str('whyChooseMe') || str('bio') : str('bio') },
  ]

  return (
    <div className="sc-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-[18px] font-bold">{initial}</div>
        <div className="min-w-0">
          <p className="font-bold text-[#212121] text-[15px] truncate">{data.fullName ?? data.email ?? ''}</p>
          {data.providerType && (
            <p className="text-[13px] text-[#3b6b9c] font-semibold">{PROVIDER_TYPE_LABELS[data.providerType]}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {rows.map(f => (
          <div key={f.label} className="border-b border-[#eeeeee] pb-3">
            <p className="text-[11px] text-[#5a5a6e]">{f.label}</p>
            <p className="text-[13px] text-[#212121] mt-0.5">{f.value ?? <span className="text-[#9ca3af]">—</span>}</p>
          </div>
        ))}

        {(data.portfolioUrls ?? []).length > 0 && (
          <div className="border-b border-[#eeeeee] pb-3">
            <p className="text-[11px] text-[#5a5a6e] mb-1">קישורים / תיק עבודות</p>
            <div className="flex gap-2 flex-wrap">
              {(data.portfolioUrls as string[]).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener" className="text-[12px] text-[#3b6b9c] underline">
                  {safeHost(url)}
                </a>
              ))}
            </div>
          </div>
        )}

        {isLawyer && refs.length > 0 && (
          <div className="border-b border-[#eeeeee] pb-3">
            <p className="text-[11px] text-[#5a5a6e] mb-2">ממליצים</p>
            <div className="space-y-2">
              {refs.map((r, i) => (
                <div key={i} className="bg-[#f8f9fa] rounded-xl p-2 text-[12px] text-[#212121]">
                  <span className="font-semibold">{r.name}</span>
                  {r.phone && <span className="text-[#5a5a6e]"> · {r.phone}</span>}
                  {r.project_name && <span className="text-[#8e8e9e]"> · {r.project_name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={onStartEdit} className="sc-btn-primary w-full">
        ערוך פרופיל
      </button>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="w-full py-2 rounded-xl text-sm text-[#5a5a6e] border border-[#eeeeee] disabled:opacity-50"
      >
        {isFetching ? 'מרענן...' : '🔄 רענן נתונים'}
      </button>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="sc-input" />
    </div>
  )
}

function safeHost(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function ScoreBadge({ score }: { score: number }) {
  const { bg, fg, label } = score >= 80
    ? { bg: 'bg-[#edf5ef]', fg: 'text-[#4a8c5c]', label: 'מתאים מאוד' }
    : score >= 60
      ? { bg: 'bg-[#ebf1f7]', fg: 'text-[#3b6b9c]', label: 'מתאים' }
      : score >= 40
        ? { bg: 'bg-[#fcf4e7]', fg: 'text-[#c4841d]', label: 'בינוני' }
        : { bg: 'bg-gray-100', fg: 'text-gray-500', label: 'נמוך' }
  return (
    <div className={`${bg} ${fg} rounded-xl px-3 py-1.5 text-center min-w-[72px]`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-lg font-bold leading-tight">{score}</div>
    </div>
  )
}

function NegotiationsCard({ assignmentId, tenderId, projectName, projectAddress, tenderTitle }: {
  assignmentId: string
  tenderId: string | null
  projectName: string
  projectAddress?: string
  tenderTitle?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<'rounds' | 'opinion' | 'newRound' | null>(null)

  const { data: rounds, refetch: refetchRounds } = trpc.tenders.getNegotiationHistory.useQuery(
    { tenderId: tenderId ?? '' },
    { enabled: expanded && !!tenderId }
  )
  const { data: opinion, refetch: refetchOpinion } = trpc.tenders.getLegalOpinion.useQuery(
    { assignmentId },
    { enabled: expanded }
  )

  return (
    <div className="sc-card p-4">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-start justify-between">
        <div className="min-w-0 text-right">
          <h3 className="font-bold text-[#212121] text-[15px] truncate">{projectName}</h3>
          {projectAddress && <p className="text-[11px] text-[#5a5a6e] mt-0.5">📍 {projectAddress}</p>}
          {tenderTitle && <p className="text-[12px] text-[#3b6b9c] mt-1">ממכרז: {tenderTitle}</p>}
        </div>
        <span className="text-[#8e8e9e] text-lg">{expanded ? '▾' : '◂'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setMode('rounds')}
              className={`text-[12px] px-3 py-1.5 rounded-[8px] font-semibold ${mode === 'rounds' ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#5a5a6e]'}`}>
              📊 סבבי מו״מ ({rounds?.length ?? 0})
            </button>
            <button onClick={() => setMode('newRound')} disabled={!tenderId}
              className={`text-[12px] px-3 py-1.5 rounded-[8px] font-semibold ${mode === 'newRound' ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#5a5a6e]'} ${!tenderId ? 'opacity-50 cursor-not-allowed' : ''}`}>
              ➕ סבב חדש
            </button>
            <button onClick={() => setMode('opinion')}
              className={`text-[12px] px-3 py-1.5 rounded-[8px] font-semibold ${mode === 'opinion' ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#5a5a6e]'}`}>
              ⚖️ חוות דעת {opinion ? '✓' : ''}
            </button>
          </div>

          {mode === 'rounds' && (
            <div className="space-y-2">
              {(!rounds || rounds.length === 0) && (
                <p className="text-center text-[#8e8e9e] text-[12px] py-4">אין סבבי מו״מ עדיין</p>
              )}
              {rounds?.map((r) => (
                <div key={r.id} className="border border-[#e5e5ea] rounded-[8px] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-[13px] text-[#212121]">
                      סבב {r.round_number}: {r.title}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status && (
                        <span className="text-[10px] bg-[#f0f0f0] text-[#5a5a6e] rounded-full px-2 py-0.5">
                          {ROUND_STATUS_HE[r.status] ?? r.status}
                        </span>
                      )}
                      {r.recommendation && RECOMMENDATION_HE[r.recommendation] && (
                        <span className={`text-[10px] ${RECOMMENDATION_HE[r.recommendation].bg} ${RECOMMENDATION_HE[r.recommendation].fg} rounded-full px-2 py-0.5 font-semibold`}>
                          {RECOMMENDATION_HE[r.recommendation].label}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.summary && <p className="text-[12px] text-[#5a5a6e] mb-2">{r.summary}</p>}
                  {(r.what_it_means || r.pros || r.cons || r.risks) && (
                    <div className="mt-2 space-y-1 text-[11px] bg-[#fafbfc] rounded p-2">
                      {r.what_it_means && <div><b className="text-[#3b6b9c]">מה זה אומר:</b> {r.what_it_means}</div>}
                      {r.pros && <div><b className="text-[#4a8c5c]">יתרונות:</b> {r.pros}</div>}
                      {r.cons && <div><b className="text-red-600">חסרונות:</b> {r.cons}</div>}
                      {r.risks && <div><b className="text-[#c4841d]">סיכונים:</b> {r.risks}</div>}
                    </div>
                  )}
                  {r.document_url && (
                    <a href={r.document_url} target="_blank" rel="noopener"
                      className="inline-block mt-2 text-[11px] text-[#3b6b9c] underline">📎 מסמך</a>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === 'newRound' && tenderId && (
            <NewRoundForm tenderId={tenderId} onDone={() => { refetchRounds(); setMode('rounds') }} />
          )}

          {mode === 'opinion' && (
            <LegalOpinionForm
              assignmentId={assignmentId}
              existing={opinion ?? null}
              onDone={() => refetchOpinion()}
            />
          )}
        </div>
      )}
    </div>
  )
}

function NewRoundForm({ tenderId, onDone }: { tenderId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    title: '', summary: '', documentUrl: '',
    whatItMeans: '', pros: '', cons: '', risks: '',
    recommendation: '' as '' | 'accept' | 'reject' | 'negotiate' | 'neutral',
    status: 'open' as 'open' | 'improved' | 'pending' | 'closed',
  })
  const add = trpc.tenders.addNegotiationRound.useMutation({
    onSuccess: () => { toast.success('סבב נוסף'); onDone() },
    onError: (e) => toast.error(e.message),
  })
  const submit = () => {
    if (form.title.trim().length < 3) { toast.error('כותרת חובה (3+ תווים)'); return }
    add.mutate({
      tenderId,
      title: form.title.trim(),
      summary: form.summary || undefined,
      documentUrl: form.documentUrl || undefined,
      whatItMeans: form.whatItMeans || undefined,
      pros: form.pros || undefined,
      cons: form.cons || undefined,
      risks: form.risks || undefined,
      recommendation: form.recommendation || undefined,
      status: form.status,
    })
  }
  return (
    <div className="space-y-2 border border-[#e5e5ea] rounded-[8px] p-3">
      <input className="sc-input w-full" placeholder="כותרת הסבב (למשל: הצעת יזם ראשונה)"
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <textarea className="sc-input w-full min-h-[60px]" placeholder="סיכום מה הוצע"
        value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
      <div className="text-[11px] text-[#5a5a6e] font-semibold pt-2">תרגום לדייר:</div>
      <textarea className="sc-input w-full min-h-[50px]" placeholder="מה זה אומר לדייר"
        value={form.whatItMeans} onChange={e => setForm({ ...form, whatItMeans: e.target.value })} />
      <textarea className="sc-input w-full min-h-[50px]" placeholder="יתרונות"
        value={form.pros} onChange={e => setForm({ ...form, pros: e.target.value })} />
      <textarea className="sc-input w-full min-h-[50px]" placeholder="חסרונות"
        value={form.cons} onChange={e => setForm({ ...form, cons: e.target.value })} />
      <textarea className="sc-input w-full min-h-[50px]" placeholder="סיכונים"
        value={form.risks} onChange={e => setForm({ ...form, risks: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className="sc-input" value={form.recommendation}
          onChange={e => setForm({ ...form, recommendation: e.target.value as typeof form.recommendation })}>
          <option value="">המלצה (אופציונלי)</option>
          <option value="accept">מומלץ לקבל</option>
          <option value="reject">מומלץ לדחות</option>
          <option value="negotiate">המשך מו״מ</option>
          <option value="neutral">ניטרלי</option>
        </select>
        <select className="sc-input" value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}>
          <option value="open">פתוח</option>
          <option value="improved">שופר</option>
          <option value="pending">ממתין</option>
          <option value="closed">סגור</option>
        </select>
      </div>
      <input className="sc-input w-full" placeholder="קישור למסמך (אופציונלי)"
        value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} />
      <button className="sc-btn-primary w-full" onClick={submit} disabled={add.isPending}>
        {add.isPending ? 'שומר...' : 'הוסף סבב'}
      </button>
    </div>
  )
}

function LegalOpinionForm({ assignmentId, existing, onDone }: {
  assignmentId: string
  existing: {
    is_worthwhile?: boolean | null
    feasibility_level?: string | null
    complexity_level?: string | null
    risks?: string | null
    would_join?: boolean | null
    summary?: string | null
    document_url?: string | null
  } | null
  onDone: () => void
}) {
  const [form, setForm] = useState({
    isWorthwhile: existing?.is_worthwhile == null ? '' : (existing.is_worthwhile ? 'yes' : 'no'),
    feasibilityLevel: (existing?.feasibility_level ?? '') as '' | 'low' | 'medium' | 'high',
    complexityLevel: (existing?.complexity_level ?? '') as '' | 'low' | 'medium' | 'high',
    risks: existing?.risks ?? '',
    wouldJoin: existing?.would_join == null ? '' : (existing.would_join ? 'yes' : 'no'),
    summary: existing?.summary ?? '',
    documentUrl: existing?.document_url ?? '',
  })
  const save = trpc.tenders.submitLegalOpinion.useMutation({
    onSuccess: () => { toast.success('חוות הדעת נשמרה'); onDone() },
    onError: (e) => toast.error(e.message),
  })
  const submit = () => {
    save.mutate({
      assignmentId,
      isWorthwhile: form.isWorthwhile === '' ? undefined : form.isWorthwhile === 'yes',
      feasibilityLevel: form.feasibilityLevel || undefined,
      complexityLevel: form.complexityLevel || undefined,
      risks: form.risks || undefined,
      wouldJoin: form.wouldJoin === '' ? undefined : form.wouldJoin === 'yes',
      summary: form.summary || undefined,
      documentUrl: form.documentUrl || undefined,
    })
  }
  return (
    <div className="space-y-2 border border-[#e5e5ea] rounded-[8px] p-3">
      <div className="text-[11px] text-[#5a5a6e] font-semibold">חוות דעת משפטית</div>
      <div className="grid grid-cols-3 gap-2">
        <select className="sc-input" value={form.isWorthwhile}
          onChange={e => setForm({ ...form, isWorthwhile: e.target.value })}>
          <option value="">כדאיות משפטית?</option>
          <option value="yes">כן</option>
          <option value="no">לא</option>
        </select>
        <select className="sc-input" value={form.feasibilityLevel}
          onChange={e => setForm({ ...form, feasibilityLevel: e.target.value as typeof form.feasibilityLevel })}>
          <option value="">רמת כדאיות</option>
          <option value="low">נמוכה</option>
          <option value="medium">בינונית</option>
          <option value="high">גבוהה</option>
        </select>
        <select className="sc-input" value={form.complexityLevel}
          onChange={e => setForm({ ...form, complexityLevel: e.target.value as typeof form.complexityLevel })}>
          <option value="">רמת מורכבות</option>
          <option value="low">נמוכה</option>
          <option value="medium">בינונית</option>
          <option value="high">גבוהה</option>
        </select>
      </div>
      <textarea className="sc-input w-full min-h-[60px]" placeholder="סיכונים משפטיים"
        value={form.risks} onChange={e => setForm({ ...form, risks: e.target.value })} />
      <select className="sc-input w-full" value={form.wouldJoin}
        onChange={e => setForm({ ...form, wouldJoin: e.target.value })}>
        <option value="">האם היית נכנס לפרויקט?</option>
        <option value="yes">כן</option>
        <option value="no">לא</option>
      </select>
      <textarea className="sc-input w-full min-h-[60px]" placeholder="סיכום / חוות דעת מלאה"
        value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
      <input className="sc-input w-full" placeholder="קישור למסמך חוות דעת (אופציונלי)"
        value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} />
      <button className="sc-btn-primary w-full" onClick={submit} disabled={save.isPending}>
        {save.isPending ? 'שומר...' : 'שמור חוות דעת'}
      </button>
    </div>
  )
}
