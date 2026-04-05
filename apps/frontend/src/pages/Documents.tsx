import PageLayout from '../components/PageLayout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const DOC_INFO: Record<string, { summary: string; full: string }> = {
  'הסכם עקרונות': {
    summary: 'הסכמת דיירים עם היזם על עקרונות הפרויקט',
    full: 'מסמך זה מסכם את ההסכמות הבסיסיות בין הדיירים ליזם — שטח הדירות החדשות, זמן שכר הדירה החלופי, לוח זמנים ועוד. חתימה על מסמך זה מאפשרת להתקדם לשלב קבלת היתר הבנייה.',
  },
  'יפוי כח לעורך דין': {
    summary: 'מסמכה לעורך הדין לפעול בשמך',
    full: 'ייפוי כוח מעניק לעורך הדין מטעם הדיירים סמכות לחתום על מסמכים, לייצג בוועדות ולקדם את הפרויקט. ללא מסמך זה עורך הדין לא יכול לפעול עבורך — חיוני לקידום הפרויקט.',
  },
  'מכתב גילוי נאות': {
    summary: 'הצהרת היזם על מצבו הפיננסי',
    full: 'מכתב בו היזם מציג מידע על מצבו הכלכלי, ניסיונו בפרויקטים קודמים וחובותיו. מסמך זה מגן על הדיירים ומבטיח שהיזם כשיר לביצוע הפרויקט.',
  },
}

const DEFAULT_INFO = {
  summary: 'מסמך חשוב לקידום הפרויקט',
  full: 'מסמך זה נדרש כחלק מתהליך הפינוי-בינוי. חתימה בזמן מבטיחה שהפרויקט לא יתעכב.',
}

const statusMap: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'ממתין לחתימה', cls: 'bg-[#8b6f47]/15 text-[#8b6f47]' },
  SIGNED:  { label: 'נחתם',         cls: 'bg-[#4a8c5c]/15 text-[#4a8c5c]'  },
  INFO:    { label: 'לעיון',         cls: 'bg-[#eeeeee] text-[#5a5a6e]'    },
  SIGN_REQUIRED: { label: 'ממתין לחתימה', cls: 'bg-[#8b6f47]/15 text-[#8b6f47]' },
  INFO_ONLY: { label: 'לעיון', cls: 'bg-[#eeeeee] text-[#5a5a6e]' },
}

type Filter = 'ALL' | 'PENDING' | 'SIGNED'

function DocCard({ doc }: { doc: any }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const info = DOC_INFO[doc.title] ?? DEFAULT_INFO
  const hasSigned = doc.signatures && doc.signatures.length > 0
  const status = hasSigned ? 'SIGNED' : (doc.type === 'SIGN_REQUIRED' ? 'PENDING' : doc.type)
  const st = statusMap[status] ?? statusMap['INFO']

  return (
    <div className="sc-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-[#212121] text-base">{doc.title}</h3>
            <p className="text-xs text-[#5a5a6e] mt-1">{new Date(doc.created_at).toLocaleDateString('he-IL')}</p>
            {status === 'PENDING' && doc.due_date && (
              <p className="text-xs text-[#8b6f47] mt-1">⏰ יש לחתום עד {new Date(doc.due_date).toLocaleDateString('he-IL')}</p>
            )}
          </div>
          <span className={`sc-badge flex-shrink-0 ${st.cls}`}>{st.label}</span>
        </div>

        <div className="mt-3 bg-[#ebf1f7] rounded-xl px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-[#3b6b9c] leading-relaxed flex-1">💡 {info.summary}</p>
            <button onClick={() => setExpanded(v => !v)} className="text-[#3b6b9c] text-xs font-semibold flex-shrink-0 flex items-center gap-1">
              {expanded ? 'פחות ▲' : 'עוד ▼'}
            </button>
          </div>
          {expanded && (
            <p className="text-xs text-[#3b6b9c] mt-2 leading-relaxed border-t border-[#3b6b9c]/20 pt-2">{info.full}</p>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => navigate(`/documents/${doc.id}`)} className="sc-btn-secondary flex-1 text-sm py-2">
            📄 צפה
          </button>
          {status === 'PENDING' && (
            <button onClick={() => navigate(`/documents/${doc.id}`)} className="sc-btn-primary flex-1 text-sm py-2">
              ✍️ חתום
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const { data: docs, isLoading } = trpc.tenant.getDocuments.useQuery()

  const filtered = (docs ?? []).filter((d: any) => {
    if (filter === 'ALL') return true
    const hasSigned = d.signatures && d.signatures.length > 0
    if (filter === 'SIGNED') return hasSigned
    if (filter === 'PENDING') return !hasSigned && d.type === 'SIGN_REQUIRED'
    return true
  })

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex gap-2 mb-4">
          {([['ALL','הכל'],['PENDING','ממתינים'],['SIGNED','נחתמו']] as [Filter,string][]).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === v ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] border border-[#eeeeee] text-[#5a5a6e]'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#5a5a6e] py-10">אין מסמכים להצגה</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc: any) => <DocCard key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
