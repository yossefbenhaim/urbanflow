import PageLayout from '../components/PageLayout'
import LoadingScreen from '../components/LoadingScreen'
import { trpc } from '../lib/trpc'

type DocBreakdown = { id: string; title: string; type: string; signed: number; total: number }
type ProgressData = {
  projectName: string; projectStatus: string; createdAt: string
  totalTenants: number; onboarded: number; tabuUploaded: number
  signedCount: number; wishesCount: number; documents: DocBreakdown[]
}

const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

const STAGES = ['INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT','SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY']

function CircleChart({ value, total, color, label, icon }: { value: number; total: number; color: string; label: string; icon: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  const r = 38
  const c = 2 * Math.PI * r
  const offset = c - (c * pct) / 100
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[90px] h-[90px]">
        <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="#e8edf2" strokeWidth="7" />
          <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg">{icon}</span>
          <span className="text-[15px] font-extrabold text-[#212121]">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[12px] font-bold text-[#212121] m-0">{label}</p>
        <p className="text-[11px] text-[#5a5a6e] m-0">{value} מתוך {total}</p>
      </div>
    </div>
  )
}

function BarChart({ items }: { items: { label: string; value: number; total: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = item.total ? Math.round((item.value / item.total) * 100) : 0
        return (
          <div key={i}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#212121] font-medium truncate max-w-[70%]">{item.label}</span>
              <span className="text-[#3b6b9c] font-bold">{pct}% ({item.value}/{item.total})</span>
            </div>
            <div className="w-full bg-[#e8edf2] rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-l from-[#3b6b9c] to-[#5a8dbf] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProjectProgressPage() {
  const { data: rawProgress, isLoading } = trpc.tenant.getProjectProgress.useQuery()
  const progress = rawProgress as ProgressData | null | undefined

  if (isLoading) return <PageLayout><LoadingScreen onDone={() => {}} /></PageLayout>
  if (!progress) return (
    <PageLayout>
      <div className="text-center py-16">
        <span className="text-5xl mb-4 block">📊</span>
        <h2 className="text-[18px] font-bold text-[#212121]">אין פרויקט פעיל</h2>
        <p className="text-[14px] text-[#5a5a6e]">עדיין לא שויכת לפרויקט</p>
      </div>
    </PageLayout>
  )

  const stageIdx = STAGES.indexOf(progress.projectStatus)
  const overallPct = Math.round(((stageIdx + 1) / STAGES.length) * 100)

  return (
    <PageLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-extrabold text-[#212121] m-0">התקדמות הפרויקט</h1>
            <p className="text-[13px] text-[#5a5a6e] mt-1">{progress.projectName}</p>
          </div>
          <span className="bg-[#4a8c5c]/15 text-[#4a8c5c] text-[11px] font-bold px-3 py-1.5 rounded-full">
            {STATUS_LABELS[progress.projectStatus] || progress.projectStatus}
          </span>
        </div>

        {/* Project Stage Progress */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#212121] m-0 mb-3 flex items-center gap-2">
            <span>🏗️</span> שלב הפרויקט
          </h3>
          <div className="flex justify-between text-[12px] text-[#5a5a6e] mb-2">
            <span>התקדמות כללית</span>
            <span className="font-bold text-[#3b6b9c]">{overallPct}%</span>
          </div>
          <div className="w-full bg-[#e8edf2] rounded-full h-3.5 overflow-hidden mb-3">
            <div className="bg-gradient-to-l from-[#1e3a5f] to-[#3b6b9c] h-3.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(overallPct, 3)}%` }} />
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex gap-1 w-max" dir="rtl">
              {STAGES.map((s, i) => (
                <span key={i} className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  i < stageIdx ? 'bg-[#4a8c5c]/15 text-[#4a8c5c] font-medium' :
                  i === stageIdx ? 'bg-[#3b6b9c] text-white font-bold shadow-sm' :
                  'bg-[#f0f0f5] text-[#8e8e9e]'
                }`}>
                  {i < stageIdx && '✓ '}{STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Circle Charts - Key Metrics */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#212121] m-0 mb-4 flex items-center gap-2">
            <span>📈</span> סטטיסטיקות דיירים
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
            <CircleChart value={progress.onboarded} total={progress.totalTenants} color="#4a8c5c" label="השלימו רישום" icon="👤" />
            <CircleChart value={progress.tabuUploaded} total={progress.totalTenants} color="#3b6b9c" label="העלו טאבו" icon="📄" />
            <CircleChart value={progress.signedCount} total={progress.totalTenants} color="#8b6f47" label="חתמו על מסמך" icon="✍️" />
            <CircleChart value={progress.wishesCount} total={progress.totalTenants} color="#7c5cbf" label="מילאו דירה חדשה" icon="🏗️" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 shadow-sm text-center">
            <span className="text-3xl block mb-1">🏢</span>
            <p className="text-[22px] font-extrabold text-[#3b6b9c] m-0">{progress.totalTenants}</p>
            <p className="text-[12px] text-[#5a5a6e] m-0">סה"כ דיירים</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 shadow-sm text-center">
            <span className="text-3xl block mb-1">📅</span>
            <p className="text-[22px] font-extrabold text-[#3b6b9c] m-0">
              {progress.createdAt ? new Date(progress.createdAt).toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }) : '—'}
            </p>
            <p className="text-[12px] text-[#5a5a6e] m-0">תאריך פתיחה</p>
          </div>
        </div>

        {/* What's Missing */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#212121] m-0 mb-3 flex items-center gap-2">
            <span>⚠️</span> מה חסר?
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'דיירים שלא השלימו רישום', count: progress.totalTenants - progress.onboarded, icon: '👤', color: 'text-red-500' },
              { label: 'דיירים שלא העלו טאבו', count: progress.totalTenants - progress.tabuUploaded, icon: '📄', color: 'text-orange-500' },
              { label: 'דיירים שלא חתמו על מסמך', count: progress.totalTenants - progress.signedCount, icon: '✍️', color: 'text-amber-600' },
              { label: 'דיירים שלא מילאו דירה חדשה', count: progress.totalTenants - progress.wishesCount, icon: '🏗️', color: 'text-purple-500' },
            ].filter(item => item.count > 0).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-xl">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[13px] text-[#212121] flex-1">{item.label}</span>
                <span className={`text-[15px] font-bold ${item.color}`}>{item.count}</span>
              </div>
            ))}
            {progress.totalTenants - progress.onboarded === 0 &&
             progress.totalTenants - progress.tabuUploaded === 0 &&
             progress.totalTenants - progress.signedCount === 0 &&
             progress.totalTenants - progress.wishesCount === 0 && (
              <div className="text-center py-4">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-[14px] font-bold text-[#4a8c5c]">כל הדיירים השלימו הכל!</p>
              </div>
            )}
          </div>
        </div>

        {/* Per-Document Breakdown */}
        {progress.documents.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#212121] m-0 mb-4 flex items-center gap-2">
              <span>📑</span> התקדמות חתימות לפי מסמך
            </h3>
            <BarChart items={progress.documents.map(d => ({
              label: d.title, value: d.signed, total: d.total,
            }))} />
          </div>
        )}

      </div>
    </PageLayout>
  )
}
