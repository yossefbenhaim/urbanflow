import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { trpc } from '../lib/trpc'

const PROJECT_TYPE_HE: Record<string, string> = {
  pinuy_binuy: 'פינוי בינוי',
  tama_38_2: `תמ"א 38/2`,
  chalufat_shaked: 'חלופת שקד',
  binui_pinui: 'בינוי פינוי',
}

const mockJobs = [
  { id: '1', title: 'עורך דין לייצוג דיירים', project: 'פרויקט הרצל 15', type: 'עו"ד התחדשות עירונית', location: 'תל אביב', engagement: 'ליווי מלא', published: '20/02/2026' },
  { id: '2', title: 'מפקח בנייה לפרויקט', project: 'פרויקט ביאליק 8', type: 'מפקח בנייה', location: 'רמת גן', engagement: 'שלב ביצוע', published: '22/02/2026' },
  { id: '3', title: 'שמאי מקרקעין', project: 'פרויקט הרצל 15', type: 'שמאי', location: 'תל אביב', engagement: 'חד-פעמי', published: '23/02/2026' },
]

type Tab = 'matches' | 'jobs' | 'applications' | 'profile'

export default function ProviderDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('matches')
  const [applying, setApplying] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [applied, setApplied] = useState<Set<string>>(new Set())

  // Redirect to onboarding if the provider hasn't chosen a type yet
  const { data: onboarding, isLoading: loadingOnboarding } = trpc.provider.getOnboardingStatus.useQuery()
  useEffect(() => {
    if (!loadingOnboarding && onboarding && !onboarding.completed) {
      navigate('/provider/onboarding', { replace: true })
    }
  }, [loadingOnboarding, onboarding, navigate])

  const { data: recommendations, isLoading: loadingRec } = trpc.match.getRecommendedProjects.useQuery(
    { limit: 10 },
    { enabled: tab === 'matches' && onboarding?.completed === true }
  )

  const submitApp = (jobId: string) => {
    setApplied(s => new Set([...s, jobId]))
    setApplying(null)
    setCoverLetter('')
  }

  return (
    <PageLayout>
      <PageTitle>לוח הבקרה — נותן שירות</PageTitle>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {([['matches','המלצות'],['jobs','משרות פתוחות'],['applications','המועמדויות שלי'],['profile','הפרופיל שלי']] as [Tab,string][]).map(([v,l]) => (
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
            {applying && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white rounded-t-[14px] w-full p-6 space-y-4 shadow-card">
                  <h3 className="font-bold text-[#212121] text-[16px]">הגשת מועמדות</h3>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                    rows={6} placeholder="מכתב מקדים — תאר את הניסיון שלך..."
                    className="sc-input resize-none" />
                  <div className="flex gap-3">
                    <button onClick={() => setApplying(null)} className="sc-btn-secondary flex-1">ביטול</button>
                    <button onClick={() => submitApp(applying)} className="sc-btn-primary flex-1">שלח מועמדות</button>
                  </div>
                </div>
              </div>
            )}

            {mockJobs.map(job => (
              <div key={job.id} className="sc-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-[#212121] text-[15px]">{job.title}</h3>
                  <span className="text-[11px] text-[#8e8e9e]">{job.published}</span>
                </div>
                <p className="text-[13px] text-[#3b6b9c] mb-3">{job.project}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[job.type, job.location, job.engagement].map(tag => (
                    <span key={tag} className="bg-[#ebf1f7] text-[#3b6b9c] text-[10px] rounded-full px-3 py-1 font-semibold">{tag}</span>
                  ))}
                </div>
                {applied.has(job.id) ? (
                  <div className="text-center py-2 bg-[#edf5ef] rounded-[8px] text-[13px] text-[#4a8c5c] font-semibold">✅ מועמדות הוגשה</div>
                ) : (
                  <button onClick={() => setApplying(job.id)}
                    className="sc-btn-primary w-full">
                    הגש מועמדות →
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'applications' && (
          <div className="space-y-3">
            {applied.size === 0 ? (
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-[13px]">לא הגשת מועמדויות עדיין</p>
                <button onClick={() => setTab('jobs')} className="mt-4 text-[#3b6b9c] text-[13px] font-semibold">עיין במשרות</button>
              </div>
            ) : (
              [...applied].map(id => {
                const job = mockJobs.find(j => j.id === id)!
                return (
                  <div key={id} className="sc-card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#212121] text-[13px]">{job.title}</p>
                        <p className="text-[11px] text-[#5a5a6e] mt-0.5">{job.project}</p>
                      </div>
                      <span className="bg-[#fcf4e7] text-[#c4841d] text-[10px] rounded-full px-3 py-1 font-semibold">ממתין</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'profile' && <ProfileTab navigate={navigate} />}
      </div>
    </PageLayout>
  )
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  architect: '🏛️ אדריכל',
  appraiser: '📊 שמאי',
  developer: '🏢 יזם',
}

function ProfileTab({ navigate }: { navigate: (to: string) => void }) {
  const { data, isLoading } = trpc.provider.getMyDetails.useQuery()
  if (isLoading) return <p className="text-center text-[#5a5a6e] py-8">טוען פרופיל...</p>
  if (!data) return <p className="text-center text-[#5a5a6e] py-8">לא נמצאו פרטי פרופיל</p>

  const initial = (data.fullName || data.email || '?')[0].toUpperCase()
  const rows: { label: string; value: string | null }[] = [
    { label: 'סוג שירות', value: data.providerType ? PROVIDER_TYPE_LABELS[data.providerType] : null },
    { label: 'טלפון', value: data.phone },
    { label: 'אימייל', value: data.email },
    { label: 'עיר פעילות ראשית', value: data.mainCity },
    { label: 'מספר רישיון', value: data.licenseNumber },
    { label: 'שנות ניסיון', value: data.experienceYears != null ? `${data.experienceYears} שנים` : null },
    { label: 'פרויקטים שבוצעו', value: data.completedProjects != null ? String(data.completedProjects) : null },
    { label: 'התמחויות', value: (data.specializations ?? []).length > 0 ? (data.specializations as string[]).join(', ') : null },
    { label: 'קישור לדירוג', value: data.ratingUrl },
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
      </div>

      <button
        onClick={() => navigate('/provider/onboarding')}
        className="sc-btn-primary w-full"
      >
        ערוך פרופיל
      </button>
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
