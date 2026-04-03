import { useState } from 'react'
import Navbar from '../components/Navbar'

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
    <div className="min-h-screen page-content bg-sc-bg" dir="rtl">
      <Navbar />

      <div className="bg-white border-b border-sc-border sticky top-14 z-10">
        <div className="max-w-lg mx-auto flex">
          {([['jobs','משרות פתוחות'],['applications','המועמדויות שלי'],['profile','הפרופיל שלי']] as [Tab,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${tab === v ? 'border-sc-primary text-sc-primary' : 'border-transparent text-sc-text-light'}`}>
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
                <div className="sc-card rounded-t-2xl rounded-b-none w-full p-6 space-y-4">
                  <h3 className="font-bold text-sc-text">הגשת מועמדות</h3>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                    rows={6} placeholder="מכתב מקדים — תאר את הניסיון שלך בפרויקטי התחדשות עירונית..."
                    className="sc-input resize-none" />
                  <div className="flex gap-3">
                    <button onClick={() => setApplying(null)} className="sc-btn-secondary flex-1">ביטול</button>
                    <button onClick={() => submitApp(applying)} className="sc-btn-primary flex-1">שלח מועמדות</button>
                  </div>
                </div>
              </div>
            )}

            {mockJobs.map(job => (
              <div key={job.id} className="sc-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sc-text">{job.title}</h3>
                  <span className="text-xs text-sc-text-light">{job.published}</span>
                </div>
                <p className="text-sm text-sc-primary mb-3">{job.project}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[job.type, job.location, job.engagement].map(tag => (
                    <span key={tag} className="sc-badge bg-sc-light-blue text-sc-primary">{tag}</span>
                  ))}
                </div>
                {applied.has(job.id) ? (
                  <div className="text-center py-2 bg-sc-success/10 rounded-xl text-sm text-sc-success font-medium">✅ מועמדות הוגשה</div>
                ) : (
                  <button onClick={() => setApplying(job.id)}
                    className="w-full bg-sc-gold-dark text-white py-2.5 rounded-xl text-sm font-medium hover:bg-sc-gold transition-colors">
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
              <div className="text-center py-16 text-sc-text-light">
                <div className="text-5xl mb-3">📋</div>
                <p>לא הגשת מועמדויות עדיין</p>
                <button onClick={() => setTab('jobs')} className="mt-4 text-sc-primary text-sm">עיין במשרות</button>
              </div>
            ) : (
              [...applied].map(id => {
                const job = mockJobs.find(j => j.id === id)!
                return (
                  <div key={id} className="sc-card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sc-text text-sm">{job.title}</p>
                        <p className="text-xs text-sc-text-light mt-0.5">{job.project}</p>
                      </div>
                      <span className="sc-badge bg-sc-gold-dark/10 text-sc-gold-dark">ממתין</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="sc-card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-sc-navy rounded-full flex items-center justify-center text-white text-xl font-bold">ד</div>
              <div>
                <p className="font-bold text-sc-text">עו"ד דנה כהן</p>
                <p className="text-sm text-sc-text-light">כהן ושות' — משרד עורכי דין</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { label: 'התמחות', value: 'עו"ד התחדשות עירונית, נדל"ן' },
                { label: 'אזורי פעילות', value: 'תל אביב, גוש דן, ירושלים' },
                { label: 'מספר רישיון', value: '12345' },
                { label: 'ניסיון', value: '15 שנות ניסיון בפרויקטי פינוי-בינוי' },
              ].map(f => (
                <div key={f.label} className="border-b border-sc-border/50 pb-3">
                  <p className="text-xs text-sc-text-light">{f.label}</p>
                  <p className="text-sm text-sc-text mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            <button className="sc-btn-secondary w-full">
              עריכת פרופיל
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
