import PageLayout, { PageTitle } from '../components/PageLayout'
import { useState } from 'react'

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

const mockDocs = [
  { id: 1, title: 'הסכם עקרונות', date: '01/02/2026', status: 'PENDING', dueDate: '15/03/2026' },
  { id: 2, title: 'יפוי כח לעורך דין', date: '05/02/2026', status: 'PENDING', dueDate: '20/03/2026' },
  { id: 3, title: 'מכתב גילוי נאות', date: '10/01/2026', status: 'SIGNED', signedDate: '12/01/2026' },
]

const statusMap = {
  PENDING: { label: 'ממתין לחתימה', cls: 'bg-[#8b6f47]/15 text-[#8b6f47]' },
  SIGNED:  { label: 'נחתם',         cls: 'bg-[#4a8c5c]/15 text-[#4a8c5c]'  },
  INFO:    { label: 'לעיון',         cls: 'bg-sc-border text-[#5a5a6e]'    },
}

type Filter = 'ALL' | 'PENDING' | 'SIGNED'

function DocCard({ doc }: { doc: typeof mockDocs[0] }) {
  const [expanded, setExpanded] = useState(false)
  const info = DOC_INFO[doc.title] ?? DEFAULT_INFO
  const st = statusMap[doc.status as keyof typeof statusMap]

  return (
    <div className="sc-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-[#212121] text-base">{doc.title}</h3>
            <p className="text-xs text-[#5a5a6e] mt-1">{doc.date}</p>
            {doc.status === 'PENDING' && (
              <p className="text-xs text-[#8b6f47] mt-1">⏰ יש לחתום עד {(doc as any).dueDate}</p>
            )}
          </div>
          <span className={`sc-badge flex-shrink-0 ${st.cls}`}>{st.label}</span>
        </div>

        {/* Summary + expand toggle */}
        <div className="mt-3 bg-[#ebf1f7] rounded-xl px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-[#3b6b9c] leading-relaxed flex-1">
              💡 {info.summary}
            </p>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[#3b6b9c] text-xs font-semibold flex-shrink-0 flex items-center gap-1"
            >
              {expanded ? 'פחות ▲' : 'עוד ▼'}
            </button>
          </div>

          {expanded && (
            <p className="text-xs text-[#3b6b9c] mt-2 leading-relaxed border-t border-[#3b6b9c]-light/30 pt-2">
              {info.full}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button className="sc-btn-secondary flex-1 text-sm py-2">
            📄 צפה
          </button>
          {doc.status === 'PENDING' && (
            <button className="sc-btn-primary flex-1 text-sm py-2">
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
  const filtered = mockDocs.filter(d => filter === 'ALL' || d.status === filter)

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

        <div className="space-y-3">
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} />)}
        </div>
      </div>
    </PageLayout>
  )
}
