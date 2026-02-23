import { useState } from 'react'

const mockDocs = [
  { id: 1, title: 'הסכם עקרונות', date: '01/02/2026', status: 'PENDING', dueDate: '15/03/2026' },
  { id: 2, title: 'יפוי כח לעורך דין', date: '05/02/2026', status: 'PENDING', dueDate: '20/03/2026' },
  { id: 3, title: 'מכתב גילוי נאות', date: '10/01/2026', status: 'SIGNED', signedDate: '12/01/2026' },
]

const statusMap = {
  PENDING: { label: 'ממתין לחתימה', cls: 'bg-amber-100 text-amber-700' },
  SIGNED: { label: 'נחתם', cls: 'bg-green-100 text-green-700' },
  INFO: { label: 'לעיון', cls: 'bg-gray-100 text-gray-600' },
}

type Filter = 'ALL' | 'PENDING' | 'SIGNED'

export default function Documents() {
  const [filter, setFilter] = useState<Filter>('ALL')

  const filtered = mockDocs.filter(d => filter === 'ALL' || d.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900 text-lg">מסמכים</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {([['ALL','הכל'],['PENDING','ממתינים'],['SIGNED','נחתמו']] as [Filter,string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Documents */}
        <div className="space-y-3">
          {filtered.map(doc => {
            const st = statusMap[doc.status as keyof typeof statusMap]
            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{doc.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{doc.date}</p>
                    {doc.status === 'PENDING' && (
                      <p className="text-xs text-amber-600 mt-1">⏰ יש לחתום עד {doc.dueDate}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                    📄 צפה
                  </button>
                  {doc.status === 'PENDING' && (
                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                      ✍️ חתום
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
