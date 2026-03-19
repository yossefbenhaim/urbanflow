import Navbar from '../components/Navbar'
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
  PENDING: { label: 'ממתין לחתימה', cls: 'bg-amber-100 text-amber-700' },
  SIGNED:  { label: 'נחתם',         cls: 'bg-green-100 text-green-700'  },
  INFO:    { label: 'לעיון',         cls: 'bg-gray-100 text-gray-600'    },
}

type Filter = 'ALL' | 'PENDING' | 'SIGNED'

function DocCard({ doc }: { doc: typeof mockDocs[0] }) {
  const [expanded, setExpanded] = useState(false)
  const info = DOC_INFO[doc.title] ?? DEFAULT_INFO
  const st = statusMap[doc.status as keyof typeof statusMap]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">{doc.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{doc.date}</p>
            {doc.status === 'PENDING' && (
              <p className="text-xs text-amber-600 mt-1">⏰ יש לחתום עד {(doc as any).dueDate}</p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ${st.cls}`}>{st.label}</span>
        </div>

        {/* Summary + expand toggle */}
        <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-blue-700 leading-relaxed flex-1">
              💡 {info.summary}
            </p>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-blue-500 text-xs font-semibold flex-shrink-0 flex items-center gap-1"
            >
              {expanded ? 'פחות ▲' : 'עוד ▼'}
            </button>
          </div>

          {expanded && (
            <p className="text-xs text-blue-600 mt-2 leading-relaxed border-t border-blue-100 pt-2">
              {info.full}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">
            📄 צפה
          </button>
          {doc.status === 'PENDING' && (
            <button className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors">
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
    <div className="min-h-screen bg-gray-50 page-content" dir="rtl">
      <Navbar />
      <div className="max-w-lg mx-auto p-4">
        <div className="flex gap-2 mb-4">
          {([['ALL','הכל'],['PENDING','ממתינים'],['SIGNED','נחתמו']] as [Filter,string][]).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} />)}
        </div>
      </div>
    </div>
  )
}
