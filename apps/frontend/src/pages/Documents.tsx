import PageLayout from '../components/PageLayout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface StageDoc {
  id: string
  title: string
  summary: string
  type: 'SIGN_REQUIRED' | 'INFO_ONLY'
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
      { id: 'power_of_attorney', title: 'ייפוי כוח לעורך דין', summary: 'הסמכת עורך הדין לפעול בשמך מול היזם והרשויות', type: 'SIGN_REQUIRED' },
    ],
  },
  {
    key: 'NEGOTIATION', label: 'משא ומתן', icon: '🤝',
    docs: [
      { id: 'disclosure_letter', title: 'מכתב גילוי נאות', summary: 'הצהרת היזם על מצבו הפיננסי, ניסיונו וכשירותו', type: 'INFO_ONLY' },
      { id: 'meeting_summary', title: 'סיכומי פגישות מו"מ', summary: 'תיעוד הפגישות וההסכמות שהושגו עם היזם', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'AGREEMENT', label: 'הסכם', icon: '📝',
    docs: [
      { id: 'agreement_principles', title: 'הסכם עקרונות', summary: 'הסכמה על עקרונות הפרויקט — שטחים, תמורות, לוח זמנים', type: 'SIGN_REQUIRED' },
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

function DocCard({ doc }: { doc: StageDoc }) {
  const navigate = useNavigate()
  const isSign = doc.type === 'SIGN_REQUIRED'

  return (
    <div
      onClick={() => navigate(`/documents/${doc.id}`)}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#e2e8f0] hover:border-[#3b6b9c] hover:shadow-sm cursor-pointer transition-all group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
        isSign ? 'bg-[#1e3a5f] text-white' : 'bg-[#ebf1f7] text-[#3b6b9c]'
      }`}>
        {isSign ? '✍️' : '📄'}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[#1e3a5f] text-sm group-hover:text-[#3b6b9c] transition-colors">{doc.title}</h4>
        <p className="text-xs text-[#64748b] mt-0.5 truncate">{doc.summary}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
          isSign
            ? 'bg-[#1e3a5f] text-white'
            : 'bg-[#f1f5f9] text-[#64748b]'
        }`}>
          {isSign ? 'לחתימה' : 'לעיון'}
        </span>
        <span className="text-[#94a3b8] group-hover:text-[#3b6b9c] transition-colors text-sm">&#8592;</span>
      </div>
    </div>
  )
}

function StageSection({ stage, index }: { stage: Stage; index: number }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-2xl border border-[#e2e8f0] overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-right bg-gradient-to-l from-[#1e3a5f] to-[#2d5a8c] text-white hover:from-[#1a3350] hover:to-[#28507a] transition-all"
      >
        <span className="text-xl">{stage.icon}</span>
        <div className="flex-1 text-right">
          <span className="font-bold text-sm">{stage.label}</span>
          <span className="text-[11px] text-white/60 mr-2">({stage.docs.length} מסמכים)</span>
        </div>
        <span className="bg-white/15 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          שלב {index + 1}
        </span>
        <span className="text-white/70 text-xs mr-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-[#fafbfc]">
          {stage.docs.map(doc => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Documents() {
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#3b6b9c] flex items-center justify-center text-xl text-white shadow-md">
            📄
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f]">מסמכי הפרויקט</h1>
            <p className="text-sm text-[#64748b]">כל המסמכים לפי שלבי התהליך</p>
          </div>
        </div>

        <div className="space-y-4">
          {STAGES.map((stage, i) => (
            <StageSection key={stage.key} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
