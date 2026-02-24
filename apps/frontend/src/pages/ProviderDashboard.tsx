import { useState } from 'react'

const mockJobs = [
  { id: '1', title: 'עורך דין לייצוג דיירים', project: 'פרויקט הרצל 15', type: 'עו"ד התחדשות עירונית', location: 'תל אביב', engagement: 'ליווי מלא', published: '20/02/2026' },
  { id: '2', title: 'מפקח בנייה לפרויקט', project: 'פרויקט ביאליק 8', type: 'מפקח בנייה', location: 'רמת גן', engagement: 'שלב ביצוע', published: '22/02/2026' },
  { id: '3', title: 'שמאי מקרקעין', project: 'פרויקט הרצל 15', type: 'שמאי', location: 'תל אביב', engagement: 'חד-פעמי', published: '23/02/2026' },
]

type Tab = 'jobs' | 'applications' | 'profile'

export default function ProviderDashboard() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [applying, setApplying] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const submitApp = (jobId: string) => {
    setApplied(s => new Set([...s, jobId]))
    setApplying(null)
    setCoverLetter('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">פורטל נותן שירות</h1>
            <p className="text-xs text-gray-500">עו"ד דנה כהן | כהן ושות'</p>
          </div>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">מאומת ✓</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
        <div className="max-w-lg mx-auto flex">
          {([['jobs','משרות פתוחות'],['applications','המועמדויות שלי'],['profile','הפרופיל שלי']] as [Tab,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${tab === v ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {tab === 'jobs' && (
          <>
            {applying && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white rounded-t-2xl w-full p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">הגשת מועמדות</h3>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                    rows={6} placeholder="מכתב מקדים — תאר את הניסיון שלך בפרויקטי התחדשות עירונית..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="flex gap-3">
                    <button onClick={() => setApplying(null)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium">ביטול</button>
                    <button onClick={() => submitApp(applying)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700">שלח מועמדות</button>
                  </div>
                </div>
              </div>
            )}

            {mockJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <span className="text-xs text-gray-400">{job.published}</span>
                </div>
                <p className="text-sm text-blue-600 mb-3">{job.project}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[job.type, job.location, job.engagement].map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                  ))}
                </div>
                {applied.has(job.id) ? (
                  <div className="text-center py-2 bg-green-50 rounded-xl text-sm text-green-700 font-medium">✅ מועמדות הוגשה</div>
                ) : (
                  <button onClick={() => setApplying(job.id)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
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
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📋</div>
                <p>לא הגשת מועמדויות עדיין</p>
                <button onClick={() => setTab('jobs')} className="mt-4 text-blue-600 text-sm">עיין במשרות</button>
              </div>
            ) : (
              [...applied].map(id => {
                const job = mockJobs.find(j => j.id === id)!
                return (
                  <div key={id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{job.project}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">ממתין</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">ד</div>
              <div>
                <p className="font-bold text-gray-900">עו"ד דנה כהן</p>
                <p className="text-sm text-gray-500">כהן ושות' — משרד עורכי דין</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { label: 'התמחות', value: 'עו"ד התחדשות עירונית, נדל"ן' },
                { label: 'אזורי פעילות', value: 'תל אביב, גוש דן, ירושלים' },
                { label: 'מספר רישיון', value: '12345' },
                { label: 'ניסיון', value: '15 שנות ניסיון בפרויקטי פינוי-בינוי' },
              ].map(f => (
                <div key={f.label} className="border-b border-gray-50 pb-3">
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm text-gray-800 mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            <button className="w-full border border-blue-200 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-50">
              עריכת פרופיל
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
