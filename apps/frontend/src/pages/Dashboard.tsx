import { useState, useEffect } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'
import { DashboardSkeleton } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'

type NextStepData = { action: string; icon: string; text: string; link: string }
type MyRoleData = { isRepresentative?: boolean }
type BuildingGroupData = { id: string }
type DocData = { id: string; title: string; type: string; due_date?: string; signatures?: unknown[] }

const STAGES = ['סקר','ייצוג','מו"מ','הסכם','חתימות','תכנון','היתר','פינוי','בנייה','מסירה']

const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

function StageIndex(status?: string) {
  const order = ['INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT',
    'SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY']
  return order.indexOf(status ?? '') ?? 0
}


// --- Main Dashboard ---

function TaskItem({ task }: { task: { icon: string; text: string; link: string; info: string } }) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className="relative">
      <a href={task.link} className="flex items-center gap-3 p-3 bg-white rounded-[10px] border border-[#eeeeee] no-underline hover:bg-[#ebf1f7] transition-colors">
        <span className="text-lg">{task.icon}</span>
        <span className="text-sm text-[#212121] font-medium flex-1">{task.text}</span>
        <button
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setShowInfo(v => !v) }}
          className={`w-[22px] h-[22px] rounded-full border-none text-xs cursor-pointer flex-shrink-0 flex items-center justify-center font-bold ${
            showInfo ? 'bg-[#1e3a5f] text-white' : 'bg-sc-border text-[#5a5a6e]'
          }`}>
          ?
        </button>
        <span className="text-[#3b6b9c] text-base">←</span>
      </a>
      {showInfo && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#1e3a5f] text-sc-light-blue text-[13px] leading-relaxed rounded-xl p-3 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <span>{task.info}</span>
            <button onPointerDown={() => setShowInfo(false)} className="bg-transparent border-none text-[#3b6b9c]-light cursor-pointer text-base flex-shrink-0">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useUser()
  const { data: myStatus, isLoading: statusLoading } = trpc.tenant.getMyStatus.useQuery()
  const { data: myRole } = trpc.tenant.getMyRole.useQuery()
  const { data: buildingGroup } = trpc.tenant.getMyBuildingGroup.useQuery()


  const { data: rawProject, isLoading, isFetched } = trpc.tenant.getMyProject.useQuery(undefined, { retry: false })
  const project = rawProject as { id: string; name?: string; type?: string; status: string; milestones: unknown[]; signatures?: unknown[] } | null | undefined
  const { data: docs } = trpc.tenant.getDocuments.useQuery()
  const { data: rawLeadership } = trpc.tenant.getLeadership.useQuery()
  const leadership = rawLeadership as { manager?: { full_name?: string; phone?: string } } | null | undefined
  const { data: nextStep } = trpc.tenant.getNextStep.useQuery()
  const signDoc = trpc.tenant.signDocument.useMutation()

  // Show skeleton while loading
  if (statusLoading || (isLoading && !isFetched)) return (
    <PageLayout><DashboardSkeleton /></PageLayout>
  )

  // Full dashboard
  const currentStage = StageIndex(project?.status)
  const signed = project?.signatures?.length ?? 0
  const total = project?.milestones?.length ?? 0
  const pct = total ? Math.round((signed / total) * 100) : 0

  return (
    <PageLayout>
      {(myRole as MyRoleData)?.isRepresentative && (
        <div className="bg-[#1e3a5f] rounded-[14px] px-5 py-3 flex items-center gap-3 mb-5">
          <span className="text-xl">🏛️</span>
          <span className="text-white font-bold text-[13px]">נציג ועד הבניין</span>
          <span className="mr-auto bg-white/15 text-[#ebf1f7] text-[10px] px-3 py-1 rounded-full">הרשאות מורחבות פעילות</span>
        </div>
      )}

      <h1 className="text-[24px] font-extrabold text-[#212121] mb-5">שלום, {profile?.fullName || 'אורח'} 👋</h1>
      <div className="space-y-5">

        {/* E3: Next Step Banner */}
        {nextStep && (nextStep as NextStepData).action !== 'all_done' && (
          <div className="bg-[#ebf1f7] border border-[#3b6b9c]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                {(nextStep as NextStepData).icon}
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#3b6b9c] font-medium mb-0.5">הצעד הבא שלך</p>
                <p className="text-sm sm:text-base font-bold text-[#1e3a5f]">{(nextStep as NextStepData).text}</p>
              </div>
            </div>
            <a
              href={(nextStep as NextStepData).link}
              className="sc-btn-primary px-5 py-2.5 text-sm no-underline whitespace-nowrap flex-shrink-0 w-full sm:w-auto text-center"
            >
              בצע עכשיו ←
            </a>
          </div>
        )}
        {nextStep && (nextStep as NextStepData).action === 'all_done' && (
          <div className="bg-[#4a8c5c]/10 border border-sc-success/20 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-medium text-[#4a8c5c]">{(nextStep as NextStepData).text}</p>
          </div>
        )}

        {/* Onboarding Tasks Card */}
        {myStatus && !myStatus.isOnboarded && (
          <div className="sc-card p-6 border-t-4 border-t-sc-primary">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-[22px]">📋</div>
              <div>
                <h3 className="text-[17px] font-bold text-[#212121] m-0">השלם את הפרופיל שלך</h3>
                <p className="text-[13px] text-[#5a5a6e] mt-0.5">מלא את הפרטים כדי להשתמש בכל הפיצ׳רים</p>
              </div>
              <a href="/onboarding" className="sc-btn-primary mr-auto px-5 py-2.5 text-sm no-underline whitespace-nowrap">
                מלא פרטים ←
              </a>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { icon: '👤', text: 'תעודת זהות ומספר טלפון', done: !!myStatus.steps?.personal },
                { icon: '🏠', text: 'כתובת הדירה (עיר, רחוב, מספר)', done: !!myStatus.steps?.address },
                { icon: '📐', text: 'פרטי הדירה (קומה, גודל, שנת כניסה)', done: !!myStatus.steps?.apartment },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-[10px] border border-[#eeeeee]">
                  <span className="text-lg">{step.icon}</span>
                  <span className={`text-sm flex-1 ${step.done ? 'text-[#4a8c5c] line-through' : 'text-[#212121]'}`}>{step.text}</span>
                  {step.done
                    ? <span className="w-5 h-5 rounded-full bg-[#4a8c5c] inline-flex items-center justify-center text-white text-xs font-bold">✓</span>
                    : <span className="w-5 h-5 rounded-full border-2 border-[#eeeeee] inline-block" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Building Group Card */}
        {buildingGroup && (
          <a
            href={'/building-chat/' + (buildingGroup as BuildingGroupData).id}
            className="no-underline block"
          >
            <div className="bg-[#1e3a5f] rounded-[20px] p-5 shadow-lg cursor-pointer transition-transform hover:scale-[1.01]">
              <div className="flex items-center gap-3.5">
                <div className="w-[50px] h-[50px] rounded-2xl bg-white/20 flex items-center justify-center text-[26px] flex-shrink-0">💬</div>
                <div className="flex-1">
                  <h3 className="m-0 text-[17px] font-extrabold text-white">קבוצת הבניין שלי</h3>
                  <p className="mt-1 text-[13px] text-white/80">לחץ לכניסה לצ׳אט עם הדיירים, סקרים ועוד</p>
                </div>
                <span className="text-white/90 text-2xl">←</span>
              </div>
            </div>
          </a>
        )}

        {/* Representative Tasks */}
        {(myRole as MyRoleData)?.isRepresentative && (
          <div className="sc-card p-6 border-t-4 border-t-sc-primary">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-[22px]">🏛️</div>
              <div className="flex-1">
                <h3 className="m-0 text-[17px] font-bold text-[#212121]">משימות הועד</h3>
                <p className="mt-0.5 text-[13px] text-[#5a5a6e]">פעולות נדרשות בשם הבניין</p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new Event('open-faqbot-committee'))}
                className="sc-btn-primary px-3.5 py-2 text-[13px] flex items-center gap-1.5 flex-shrink-0"
              >
                📖 מדריך
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '📄', text: 'העלה נסח טאבו', link: '/upload-tabu',
                  info: 'העלה את נסח הטאבו העדכני של הדירה שלך. הנסח נדרש לצורך אימות בעלות וקידום הפרויקט.' },
                { icon: '📊', text: 'מעקב הצבעות דיירים', link: '/votes-tracker',
                  info: 'עקוב מי הצביע ומי לא בסקרים הפתוחים. שלח תזכורות לדיירים שלא הצביעו כדי להגיע ל-60% הנדרשים לקבלת החלטה.' },
                { icon: '🏛️', text: 'פעולות ועד', link: '/committee-actions',
                  info: 'יצירת סקרים, שליחת הודעות לדיירים, קביעת ישיבות, העלאת מסמכים וניהול חתימות — כל הכלים לניהול פרויקט בינוי.' },
                { icon: '📝', text: 'מסמכים וחתימות', link: '/documents',
                  info: 'נהל חוזים, פרוטוקולים ומסמכים חשובים. איסוף חתימות דיגיטלי מהדיירים מאיץ תהליכים ומונע עיכובים בפרויקט.' },
              ].map((task, i) => (
                <TaskItem key={i} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Apartment Wishes CTA */}
        <a href="/apartment-wishes" className="no-underline block">
          <div className="bg-gradient-to-l from-[#3b6b9c] to-[#1e3a5f] rounded-[20px] p-5 shadow-lg cursor-pointer transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-3.5">
              <div className="w-[50px] h-[50px] rounded-2xl bg-white/20 flex items-center justify-center text-[26px] flex-shrink-0">🏗️</div>
              <div className="flex-1">
                <h3 className="m-0 text-[17px] font-extrabold text-white">טופס דירה חדשה</h3>
                <p className="mt-1 text-[13px] text-white/80">ספר לנו מה חשוב לך בדירה החדשה וקבל ניתוח AI</p>
              </div>
              <span className="text-white/90 text-2xl">←</span>
            </div>
          </div>
        </a>

        {/* Elderly Form + Timeline Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/elderly-form" className="no-underline sc-card p-4 flex items-center gap-3 hover:bg-[#ebf1f7] transition-colors">
            <span className="text-2xl">👴</span>
            <div>
              <p className="text-sm font-bold text-[#212121]">טופס קשיש / מוגבלות</p>
              <p className="text-xs text-[#5a5a6e]">זכויות מיוחדות בפרויקט</p>
            </div>
          </a>
          <a href="/timeline" className="no-underline sc-card p-4 flex items-center gap-3 hover:bg-[#ebf1f7] transition-colors">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm font-bold text-[#212121]">לוח זמנים</p>
              <p className="text-xs text-[#5a5a6e]">עדכונים שבועיים מספקים</p>
            </div>
          </a>
        </div>

        {/* Project Status Card */}
        {project ? (
          <div className="sc-card p-6 border-t-4 border-t-sc-primary">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#212121] text-lg">{project.name}</h3>
                <span className="sc-badge mt-1 bg-[#ebf1f7] text-[#3b6b9c]">
                  {project.type?.replace('_', ' ')}
                </span>
              </div>
              <span className="sc-badge bg-[#8b6f47]/15 text-[#8b6f47]">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-[#5a5a6e] mb-2">
                  <span>חתימות שנאספו</span>
                  <span className="font-medium">{signed} / {total} ({pct}%)</span>
                </div>
                <div className="w-full bg-sc-border rounded-full h-2">
                  <div className="bg-[#3b6b9c] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              <div className="flex gap-1.5 w-max" dir="rtl">
                {STAGES.map((s, i) => (
                  <span key={i} className={`text-[11px] sm:text-[13px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap transition-all ${
                    i < currentStage ? 'bg-[#4a8c5c]/15 text-[#4a8c5c] font-medium' :
                    i === currentStage ? 'bg-[#3b6b9c] text-white font-bold shadow-sm' :
                    'bg-[#f0f0f5] text-[#8e8e9e]'
                  }`}>
                    {i < currentStage && '✓ '}{s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Leadership */}
        {leadership && (
          <div className="sc-card p-6">
            <h3 className="sc-section-title text-base mb-4">מי מוביל</h3>
            <div className="space-y-3">
              {[
                { label: 'מארגן דיירים', name: leadership.manager?.full_name, phone: leadership.manager?.phone, icon: '🏢' },
              ].filter(p => p.name).map((p) => (
                <div key={p.label} className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-xl">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-xs text-[#5a5a6e]">{p.label}</p>
                    <p className="text-sm font-medium text-[#212121]">{p.name}</p>
                    {p.phone && <p className="text-xs text-[#3b6b9c]">{p.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {docs && docs.length > 0 && (
          <div className="sc-card p-6">
            <h3 className="sc-section-title text-base mb-4">מסמכים לחתימה</h3>
            <div className="space-y-3">
              {docs.map((doc: DocData) => {
                const isSigned = (doc.signatures?.length ?? 0) > 0
                return (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isSigned ? 'border-sc-success/30 bg-[#4a8c5c]/5' :
                    doc.type === 'SIGN_REQUIRED' ? 'border-sc-error/30 bg-red-500/5' : 'border-[#eeeeee] bg-[#f8f9fa]'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-[#212121]">{doc.title}</p>
                      {doc.due_date && <p className="text-xs text-[#5a5a6e]">עד {doc.due_date}</p>}
                    </div>
                    {isSigned ? (
                      <span className="text-[#4a8c5c] text-sm font-medium">✅ חתום</span>
                    ) : doc.type === 'SIGN_REQUIRED' ? (
                      <button
                        onClick={() => signDoc.mutate({ docId: doc.id })}
                        disabled={signDoc.isPending}
                        className="sc-btn-primary text-xs px-3 py-1.5"
                      >
                        חתום עכשיו
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  )
}
