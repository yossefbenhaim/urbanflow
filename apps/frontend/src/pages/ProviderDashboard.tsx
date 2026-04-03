import { useState } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'

const providerSidebar = [
  { to: '/provider', icon: '🏠', label: 'ראשי' },
  { to: '/provider', icon: '💼', label: 'משרות פתוחות' },
  { to: '/quotes', icon: '📋', label: 'הגשות שלי' },
  { to: '/inspections', icon: '🔍', label: 'בדיקות' },
  { to: '/profile', icon: '👤', label: 'פרופיל' },
]

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
    <PageLayout sidebarItems={providerSidebar}>
      <PageTitle>לוח הבקרה — נותן שירות</PageTitle>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['jobs','משרות פתוחות'],['applications','המועמדויות שלי'],['profile','הפרופיל שלי']] as [Tab,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
              tab === v ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#8e8e9e]'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'jobs' && (
          <>
            {applying && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white rounded-t-[14px] w-full p-6 space-y-4 shadow-card">
                  <h3 className="font-bold text-[#212121] text-[16px]">הגשת מועמדות</h3>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                    rows={6} placeholder="מכתב מקדים — תאר את הניסיון שלך..."
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
                  <h3 className="font-bold text-[#212121] text-[15px]">{job.title}</h3>
                  <span className="text-[11px] text-[#8e8e9e]">{job.published}</span>
                </div>
                <p className="text-[13px] text-[#3b6b9c] mb-3">{job.project}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[job.type, job.location, job.engagement].map(tag => (
                    <span key={tag} className="bg-[#ebf1f7] text-[#3b6b9c] text-[10px] rounded-full px-3 py-1 font-semibold">{tag}</span>
                  ))}
                </div>
                {applied.has(job.id) ? (
                  <div className="text-center py-2 bg-[#edf5ef] rounded-[8px] text-[13px] text-[#4a8c5c] font-semibold">✅ מועמדות הוגשה</div>
                ) : (
                  <button onClick={() => setApplying(job.id)}
                    className="sc-btn-primary w-full">
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
              <div className="text-center py-16 text-[#8e8e9e]">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-[13px]">לא הגשת מועמדויות עדיין</p>
                <button onClick={() => setTab('jobs')} className="mt-4 text-[#3b6b9c] text-[13px] font-semibold">עיין במשרות</button>
              </div>
            ) : (
              [...applied].map(id => {
                const job = mockJobs.find(j => j.id === id)!
                return (
                  <div key={id} className="sc-card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#212121] text-[13px]">{job.title}</p>
                        <p className="text-[11px] text-[#5a5a6e] mt-0.5">{job.project}</p>
                      </div>
                      <span className="bg-[#fcf4e7] text-[#c4841d] text-[10px] rounded-full px-3 py-1 font-semibold">ממתין</span>
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
              <div className="w-14 h-14 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-[18px] font-bold">ד</div>
              <div>
                <p className="font-bold text-[#212121] text-[15px]">עו"ד דנה כהן</p>
                <p className="text-[13px] text-[#8e8e9e]">כהן ושות' — משרד עורכי דין</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { label: 'התמחות', value: 'עו"ד התחדשות עירונית, נדל"ן' },
                { label: 'אזורי פעילות', value: 'תל אביב, גוש דן, ירושלים' },
                { label: 'מספר רישיון', value: '12345' },
                { label: 'ניסיון', value: '15 שנות ניסיון בפרויקטי פינוי-בינוי' },
              ].map(f => (
                <div key={f.label} className="border-b border-[#eeeeee] pb-3">
                  <p className="text-[11px] text-[#5a5a6e]">{f.label}</p>
                  <p className="text-[13px] text-[#212121] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            <button className="sc-btn-secondary w-full">עריכת פרופיל</button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
