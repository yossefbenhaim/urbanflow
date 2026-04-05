import PageLayout from '../components/PageLayout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const STAGE_ORDER = [
  'INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT',
  'SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY',
]

interface StageDoc {
  id: string
  title: string
  summary: string
  type: 'SIGN_REQUIRED' | 'INFO_ONLY'
  templateKey?: string
}

interface Stage {
  key: string
  label: string
  icon: string
  docs: StageDoc[]
}

const STAGES: Stage[] = [
  {
    key: 'INITIAL', label: 'התארגנות', icon: '📋',
    docs: [
      { id: 'join_form', title: 'אישור הצטרפות לפרויקט', summary: 'טופס הצטרפות רשמי לפרויקט הפינוי-בינוי', type: 'SIGN_REQUIRED' },
      { id: 'tenant_survey', title: 'שאלון פרטי דייר', summary: 'מילוי פרטים אישיים ומידע על הדירה הקיימת', type: 'SIGN_REQUIRED' },
      { id: 'ownership_docs', title: 'מסמכי בעלות (נסח טאבו)', summary: 'העלאת נסח טאבו או אישור זכויות להוכחת בעלות', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'REPRESENTATION', label: 'בחירת נציגות', icon: '🏛️',
    docs: [
      { id: 'election_form', title: 'טופס בחירת נציגות', summary: 'בחירת נציגי הדיירים שינהלו את המו"מ עם היזם', type: 'SIGN_REQUIRED' },
      { id: 'power_of_attorney', title: 'ייפוי כוח לעורך דין', summary: 'הסמכת עורך הדין לפעול בשמך מול היזם והרשויות', type: 'SIGN_REQUIRED', templateKey: 'power_of_attorney_lawyer' },
    ],
  },
  {
    key: 'NEGOTIATION', label: 'משא ומתן', icon: '🤝',
    docs: [
      { id: 'disclosure_letter', title: 'מכתב גילוי נאות', summary: 'הצהרת היזם על מצבו הפיננסי, ניסיונו וכשירותו', type: 'INFO_ONLY', templateKey: 'disclosure_letter' },
      { id: 'meeting_summary', title: 'סיכומי פגישות מו"מ', summary: 'תיעוד הפגישות וההסכמות שהושגו עם היזם', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'AGREEMENT', label: 'הסכם', icon: '📝',
    docs: [
      { id: 'agreement_principles', title: 'הסכם עקרונות', summary: 'הסכמה על עקרונות הפרויקט — שטחים, תמורות, לוח זמנים', type: 'SIGN_REQUIRED', templateKey: 'agreement_principles' },
    ],
  },
  {
    key: 'SIGNATURES', label: 'חתימות', icon: '✍️',
    docs: [
      { id: 'final_agreement', title: 'הסכם מפורט סופי', summary: 'ההסכם המלא והמחייב בין הדיירים ליזם', type: 'SIGN_REQUIRED' },
      { id: 'tenant_signatures', title: 'אישור חתימות דיירים', summary: 'מעקב אחר חתימות כלל הדיירים בבניין', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'PLANNING', label: 'תכנון', icon: '📐',
    docs: [
      { id: 'arch_plans', title: 'תוכניות אדריכליות', summary: 'תוכניות הבניין החדש וחלוקת הדירות', type: 'INFO_ONLY' },
      { id: 'appraisal_report', title: 'דו"ח שמאי', summary: 'הערכת שווי הנכסים הקיימים והחדשים', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'PERMIT', label: 'היתר', icon: '🏗️',
    docs: [
      { id: 'building_permit', title: 'היתר בנייה', summary: 'אישור הוועדה המקומית לתחילת עבודות הבנייה', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'EVACUATION', label: 'פינוי', icon: '🚚',
    docs: [
      { id: 'alt_housing', title: 'הסכם דיור חלופי', summary: 'פרטי הדירה החלופית, שכ"ד ותנאי הפינוי', type: 'SIGN_REQUIRED' },
      { id: 'evac_protocol', title: 'פרוטוקול פינוי', summary: 'תיעוד מצב הדירה הקיימת לפני הפינוי', type: 'SIGN_REQUIRED' },
    ],
  },
  {
    key: 'CONSTRUCTION', label: 'בנייה', icon: '🏢',
    docs: [
      { id: 'progress_reports', title: 'דו"חות התקדמות', summary: 'עדכונים שוטפים על מצב הבנייה', type: 'INFO_ONLY' },
      { id: 'quality_checks', title: 'בדיקות איכות', summary: 'תוצאות בדיקות איכות ובטיחות באתר', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'DELIVERY', label: 'מסירה', icon: '🔑',
    docs: [
      { id: 'delivery_protocol', title: 'פרוטוקול מסירה', summary: 'בדיקת הדירה החדשה ותיעוד ליקויים', type: 'SIGN_REQUIRED' },
      { id: 'form4', title: 'תעודת גמר (טופס 4)', summary: 'אישור אכלוס מטעם הרשות המקומית', type: 'INFO_ONLY' },
    ],
  },
]

function stageIndex(status?: string) {
  return STAGE_ORDER.indexOf(status ?? 'INITIAL')
}

function StageSection({ stage, isCurrent, isPast, isLocked }: {
  stage: Stage; isCurrent: boolean; isPast: boolean; isLocked: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(isCurrent)

  return (
    <div className={`rounded-[14px] border overflow-hidden transition-all ${
      isCurrent ? 'border-[#3b6b9c] shadow-md' :
      isPast ? 'border-[#4a8c5c]/30' :
      'border-[#eeeeee] opacity-60'
    }`}>
      <button
        onClick={() => !isLocked && setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
          isCurrent ? 'bg-[#3b6b9c] text-white' :
          isPast ? 'bg-[#4a8c5c]/10 text-[#212121]' :
          'bg-[#f8f9fa] text-[#9ca3af]'
        }`}
      >
        <span className="text-xl">{stage.icon}</span>
        <span className="font-bold text-sm flex-1">{stage.label}</span>
        {isPast && <span className="text-xs bg-[#4a8c5c]/15 text-[#4a8c5c] px-2 py-0.5 rounded-full font-medium">הושלם</span>}
        {isCurrent && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">שלב נוכחי</span>}
        {isLocked && <span className="text-xs">🔒</span>}
        {!isLocked && <span className="text-xs">{open ? '▲' : '▼'}</span>}
      </button>

      {open && !isLocked && (
        <div className="p-3 space-y-2 bg-white">
          {stage.docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f9fa] border border-[#eeeeee]">
              <div className="flex-1">
                <h4 className="font-semibold text-[#212121] text-sm">{doc.title}</h4>
                <p className="text-xs text-[#5a5a6e] mt-0.5">{doc.summary}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                doc.type === 'SIGN_REQUIRED'
                  ? 'bg-[#8b6f47]/15 text-[#8b6f47]'
                  : 'bg-sc-border text-[#5a5a6e]'
              }`}>
                {doc.type === 'SIGN_REQUIRED' ? 'לחתימה' : 'לעיון'}
              </span>
              {doc.templateKey && (
                <button
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="sc-btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                >
                  צפה
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Documents() {
  const { data: project, isLoading } = trpc.tenant.getMyProject.useQuery(undefined, { retry: false })
  const hasProject = !!project?.status
  const currentIdx = hasProject ? stageIndex(project.status) : 0

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#1e3a5f] flex items-center justify-center text-xl text-white">📄</div>
          <div>
            <h1 className="text-lg font-bold text-[#212121]">מסמכי הפרויקט</h1>
            <p className="text-xs text-[#5a5a6e]">כל המסמכים לפי שלבי התהליך</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {STAGES.map((stage, i) => {
              const idx = stageIndex(stage.key)
              const isCurrent = hasProject ? idx === currentIdx : i === 0
              const isPast = hasProject ? idx < currentIdx : false
              const isLocked = hasProject ? idx > currentIdx : false
              return (
                <StageSection
                  key={stage.key}
                  stage={stage}
                  isCurrent={isCurrent}
                  isPast={isPast}
                  isLocked={isLocked}
                />
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
