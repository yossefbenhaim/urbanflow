import { useMemo } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { trpc } from '../lib/trpc'
import { useNavigate } from 'react-router-dom'

// ── Step definitions ──────────────────────────────────────────────────────────
type StepDef = {
  title: string
  description: string
  icon: string
  link?: string
  phase: number
}

const PHASE_LABELS = [
  'הרשמה ופרופיל',
  'הצטרפות לפרויקט',
  'ייצוג ומשפט',
  'תכנון ואישורים',
  'הסכם וחתימות',
  'ביצוע ומסירה',
]

const PHASE_ICONS = ['📝', '🏢', '⚖️', '📐', '✍️', '🏗️']

const STEPS: StepDef[] = [
  // Phase 1 — Registration (steps 1-7)
  { title: 'הרשמה למערכת', description: 'יצירת חשבון וכניסה ראשונית', icon: '🔐', link: '/login', phase: 0 },
  { title: 'השלמת פרופיל', description: 'מילוי שם מלא, ת.ז. וטלפון', icon: '👤', link: '/onboarding', phase: 0 },
  { title: 'כתובת הדירה', description: 'עיר, רחוב ומספר בניין', icon: '📍', link: '/onboarding', phase: 0 },
  { title: 'פרטי הדירה', description: 'קומה, גודל במ"ר ומספר חדרים', icon: '🏠', link: '/onboarding', phase: 0 },
  { title: 'העלאת נסח טאבו', description: 'סריקה או צילום של נסח הטאבו', icon: '📄', link: '/onboarding', phase: 0 },
  { title: 'הצהרת בעלות', description: 'אישור תפקיד ובעלות על הדירה', icon: '✅', link: '/profile', phase: 0 },
  { title: 'בעלות מורכבת', description: 'הוספת שותפים/יורשים (אם רלוונטי)', icon: '👥', link: '/apartment-owners', phase: 0 },
  // Phase 2 — Join Project (step 8)
  { title: 'הצטרפות לפרויקט', description: 'הזנת קוד הזמנה מהמארגן', icon: '🏢', link: '/join', phase: 1 },
  // Phase 3 — Legal (steps 9-12)
  { title: 'חתימה על הסכם ראשוני', description: 'הסכם עקרונות עם הדיירים', icon: '📋', link: '/documents', phase: 2 },
  { title: 'השתתפות באסיפה ראשונה', description: 'אסיפת דיירים והכרת הפרויקט', icon: '🤝', link: '/timeline', phase: 2 },
  { title: 'הצבעה בסקר בניין', description: 'הצבעה לנציג ועד או סוגיות', icon: '🗳️', link: '/building-chat', phase: 2 },
  { title: 'חתימה על ייפוי כוח', description: 'ייפוי כוח לעורך דין הפרויקט', icon: '⚖️', link: '/power-of-attorney', phase: 2 },
  // Phase 4 — Planning (steps 13-14)
  { title: 'הקמת ועד בניין', description: 'בחירת נציגים וועד דיירים', icon: '🏛️', link: '/committee', phase: 3 },
  { title: 'בחירת ספק מקצועי', description: 'בחירת יזם, אדריכל ושמאי', icon: '🔍', link: '/directory', phase: 3 },
  // Phase 5 — Agreement (steps 15-17)
  { title: 'סיום בדיקת היתכנות', description: 'אישור כלכלי ותכנוני', icon: '📊', link: '/timeline', phase: 4 },
  { title: 'אישור תוכנית בניין', description: 'תוכנית אדריכלית מאושרת', icon: '📐', link: '/timeline', phase: 4 },
  { title: 'חתימה על חוזה סופי', description: 'חוזה פינוי-בינוי מלא', icon: '✍️', link: '/documents', phase: 4 },
  // Phase 6 — Execution (step 18)
  { title: 'תחילת ביצוע הפרויקט', description: '🎉 הפרויקט יצא לדרך!', icon: '🏗️', link: '/timeline', phase: 5 },
]

// ── Status helpers ────────────────────────────────────────────────────────────
type StepStatus = 'done' | 'current' | 'future' | 'locked'

function getStepStatus(index: number, currentStep: number, done: boolean): StepStatus {
  if (done) return 'done'
  if (index + 1 === currentStep) return 'current'
  if (index + 1 < currentStep) return 'done' // safety
  return index < currentStep + 2 ? 'future' : 'locked'
}

const STATUS_CONFIG: Record<StepStatus, { bg: string; border: string; iconBg: string; text: string; badge: string; badgeLabel: string }> = {
  done:    { bg: 'bg-white', border: 'border-[#4a8c5c]/30', iconBg: 'bg-[#4a8c5c]', text: 'text-[#4a8c5c]', badge: 'bg-[#4a8c5c]/10 text-[#4a8c5c]', badgeLabel: '✅ הושלם' },
  current: { bg: 'bg-[#ebf1f7]', border: 'border-[#3b6b9c]', iconBg: 'bg-[#3b6b9c]', text: 'text-[#1e3a5f]', badge: 'bg-[#3b6b9c]/10 text-[#3b6b9c]', badgeLabel: '🔵 נוכחי' },
  future:  { bg: 'bg-white', border: 'border-[#eeeeee]', iconBg: 'bg-[#f0f0f0]', text: 'text-[#8e8e9e]', badge: 'bg-[#f0f0f0] text-[#8e8e9e]', badgeLabel: '⬜ עתידי' },
  locked:  { bg: 'bg-[#fafafa]', border: 'border-[#eeeeee]', iconBg: 'bg-[#f0f0f0]', text: 'text-[#c0c0c0]', badge: 'bg-[#f0f0f0] text-[#c0c0c0]', badgeLabel: '🔒 נעול' },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TenantSteps() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.tenant.getStepsStatus.useQuery()

  const stepsWithStatus = useMemo(() => {
    if (!data) return []
    return STEPS.map((step, i) => {
      const done = data.steps[i]?.done ?? false
      const status = getStepStatus(i, data.currentStep, done)
      return { ...step, status, stepNumber: i + 1 }
    })
  }, [data])

  // Group steps by phase
  const phases = useMemo(() => {
    const grouped: { label: string; icon: string; steps: typeof stepsWithStatus }[] = []
    PHASE_LABELS.forEach((label, pi) => {
      const phaseSteps = stepsWithStatus.filter(s => STEPS[s.stepNumber - 1].phase === pi)
      if (phaseSteps.length > 0) {
        grouped.push({ label, icon: PHASE_ICONS[pi], steps: phaseSteps })
      }
    })
    return grouped
  }, [stepsWithStatus])

  const progress = data ? Math.round((data.completedCount / data.totalSteps) * 100) : 0

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">📋</div>
            <p className="text-[#8e8e9e] text-sm">טוען את הצעדים שלך...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-6">
        <PageTitle>📋 הצעדים שלי</PageTitle>
        <p className="text-[#5a5a6e] text-sm -mt-3">
          כל מה שצריך לעשות בדרך לפרויקט פינוי-בינוי מוצלח
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-[14px] border border-[#eeeeee] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="font-bold text-[15px] text-[#212121]">התקדמות כללית</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#3b6b9c] font-bold text-[15px]">{data?.completedCount ?? 0}</span>
            <span className="text-[#8e8e9e] text-[13px]">/ {data?.totalSteps ?? 18} צעדים</span>
          </div>
        </div>
        <div className="w-full bg-[#eeeeee] rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: progress === 100
                ? '#4a8c5c'
                : 'linear-gradient(90deg, #3b6b9c, #8b6f47)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-[#8e8e9e]">
            {progress === 100 ? '🎉 כל הצעדים הושלמו!' : `${progress}% הושלם`}
          </span>
          {data && data.currentStep <= 18 && (
            <span className="text-[11px] text-[#3b6b9c] font-medium">
              צעד נוכחי: {data.currentStep}
            </span>
          )}
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-8">
        {phases.map((phase, pi) => (
          <div key={pi}>
            {/* Phase Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center text-base">
                {phase.icon}
              </div>
              <h2 className="text-[15px] font-bold text-[#1e3a5f] m-0">
                שלב {pi + 1} — {phase.label}
              </h2>
              <div className="flex-1 h-px bg-[#eeeeee]" />
              <span className="text-[11px] text-[#8e8e9e]">
                {phase.steps.filter(s => s.status === 'done').length}/{phase.steps.length}
              </span>
            </div>

            {/* Steps in phase */}
            <div className="relative mr-4">
              {/* Vertical line */}
              <div className="absolute top-0 bottom-0 right-[18px] w-[2px] bg-[#eeeeee]" />

              <div className="space-y-3">
                {phase.steps.map((step, si) => {
                  const cfg = STATUS_CONFIG[step.status]
                  const isClickable = step.status === 'current' && step.link

                  return (
                    <div
                      key={step.stepNumber}
                      className={`relative flex items-start gap-4 ${cfg.bg} rounded-[14px] border ${cfg.border} p-4 transition-all ${
                        step.status === 'current' ? 'shadow-md shadow-[#3b6b9c]/10' : ''
                      } ${step.status === 'locked' ? 'opacity-60' : ''}`}
                    >
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-9 h-9 rounded-full ${cfg.iconBg} flex items-center justify-center text-lg flex-shrink-0 ${
                        step.status === 'done' || step.status === 'current' ? 'text-white' : ''
                      }`}>
                        {step.status === 'done' ? '✓' : step.status === 'locked' ? '🔒' : step.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold ${cfg.text} opacity-60`}>
                            צעד {step.stepNumber}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                            {cfg.badgeLabel}
                          </span>
                        </div>
                        <h3 className={`text-[14px] font-bold m-0 ${
                          step.status === 'locked' ? 'text-[#c0c0c0]' : 'text-[#212121]'
                        }`}>
                          {step.title}
                        </h3>
                        <p className={`text-[12px] m-0 mt-0.5 ${
                          step.status === 'locked' ? 'text-[#d0d0d0]' : 'text-[#5a5a6e]'
                        }`}>
                          {step.description}
                        </p>
                      </div>

                      {/* Action button */}
                      {isClickable && (
                        <button
                          onClick={() => navigate(step.link!)}
                          className="flex-shrink-0 bg-[#3b6b9c] text-white border-none rounded-xl px-4 py-2 text-[13px] font-bold cursor-pointer hover:bg-[#1e3a5f] transition-colors self-center"
                        >
                          בצע עכשיו ←
                        </button>
                      )}
                      {step.status === 'done' && (
                        <span className="flex-shrink-0 text-[#4a8c5c] text-xl self-center">✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom spacer for mobile */}
      <div className="h-24" />
    </PageLayout>
  )
}
