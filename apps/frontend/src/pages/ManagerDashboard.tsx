import { useState } from 'react'

const mockProjects = [
  { id: '1', name: 'פרויקט הרצל 15', type: 'פינוי בינוי', buildings: 2, signed: 34, total: 48, stage: 'חתימות', value: 45000000 },
  { id: '2', name: 'פרויקט ביאליק 8', type: 'תמ"א 38/2', buildings: 1, signed: 22, total: 30, stage: 'מו"מ', value: 18000000 },
]

type Tab = 'projects' | 'tenants' | 'invitations' | 'providers'

export default function ManagerDashboard() {
  const [selected, setSelected] = useState(mockProjects[0])
  const [tab, setTab] = useState<Tab>('projects')

  const pct = Math.round((selected.signed / selected.total) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">פורטל מנהל</h1>
            <p className="text-xs text-gray-500">חברת יזמות ישראל</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            + פרויקט חדש
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Project selector */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
          {mockProjects.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                selected.id === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}>{p.name}</button>
          ))}
        </div>

        {/* Project overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.name}</h2>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{selected.type}</span>
            </div>
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">{selected.stage}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'חתמו', value: `${selected.signed}/${selected.total}`, sub: `${pct}%`, color: 'blue' },
              { label: 'בניינים', value: selected.buildings, color: 'gray' },
              { label: 'ערך משוער', value: `₪${(selected.value/1000000).toFixed(0)}M`, color: 'green' },
            ].map(s => (
              <div key={s.label} className={`text-center p-3 bg-${s.color}-50 rounded-xl`}>
                <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
                {s.sub && <p className="text-xs text-gray-500">{s.sub}</p>}
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          {([['projects','בניינים'],['tenants','דיירים'],['invitations','הזמנות'],['providers','שירותים']] as [Tab,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${tab === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>

        {tab === 'projects' && (
          <div className="space-y-3">
            {[
              { address: 'רחוב הרצל 15א', units: 24, signed: 20, committee: 'יוסי מזרחי' },
              { address: 'רחוב הרצל 15ב', units: 24, signed: 14, committee: 'דנה לוי' },
            ].map((b, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900 text-sm">{b.address}</p>
                  <span className="text-xs text-gray-500">{b.units} יחידות</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>ועד: {b.committee}</span>
                  <span className="text-blue-600 font-medium">{b.signed}/{b.units} חתמו</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.round(b.signed/b.units*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tenants' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-gray-600">{selected.total} דיירים</p>
              <button className="text-sm text-blue-600 font-medium">ייצוא CSV</button>
            </div>
            {['דוד כהן','שרה לוי','משה ישראלי','רחל ברקוביץ','יוסי אלון'].map((name, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">דירה {i+1} | קומה {Math.ceil((i+1)/2)}</p>
                </div>
                <div className="flex gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${i < 2 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {i < 2 ? 'חתם' : 'ממתין'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'invitations' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">צור קישור הזמנה</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">בניין</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option>רחוב הרצל 15א</option>
                    <option>רחוב הרצל 15ב</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">תפקיד</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option>דייר</option>
                    <option>ועד בית</option>
                  </select>
                </div>
                <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                  🔗 צור קישור
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">קישורים אחרונים</h3>
              {['דירה 3 — דייר','דירה 7 — דייר'].map((link, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm text-gray-700">{link}</p>
                  <span className="text-xs text-gray-400">⏳ ממתין</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'providers' && (
          <div className="space-y-4">
            <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
              + פרסם משרה חדשה
            </button>
            {[
              { title: 'עורך דין לייצוג דיירים', type: 'עו"ד התחדשות עירונית', apps: 3, status: 'פתוח' },
              { title: 'מפקח בנייה', type: 'מפקח', apps: 1, status: 'פתוח' },
            ].map((job, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.type}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{job.status}</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-500">{job.apps} מועמדויות</p>
                  <button className="text-sm text-blue-600 font-medium">צפה →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
