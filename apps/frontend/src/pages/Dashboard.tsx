import Navbar from '../components/Navbar'

const STAGES = ['סקר','ייצוג','מו"מ','הסכם','חתימות','תכנון','היתר','פינוי','בנייה','מסירה']
const CURRENT_STAGE = 4 // חתימות

const mockProject = {
  name: 'פרויקט רחוב הרצל 15, תל אביב',
  type: 'פינוי בינוי',
  stage: CURRENT_STAGE,
  signed: 34,
  total: 48
}

const mockLeadership = {
  manager: { name: 'משה לוי', company: 'יזמות ישראל בע"מ', phone: '03-1234567' },
  lawyer: { name: 'עו"ד דנה כהן', firm: 'כהן ושות\'', phone: '03-7654321' },
  committee: { name: 'יוסי מזרחי', role: 'ועד הבניין', phone: '052-1234567' }
}

const mockDocs = [
  { id: 1, title: 'הסכם עקרונות', dueDate: '15/03/2026', urgent: true },
  { id: 2, title: 'יפוי כח לעו"ד', dueDate: '20/03/2026', urgent: false }
]

function ProjectStatusCard() {
  const pct = Math.round((mockProject.signed / mockProject.total) * 100)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{mockProject.name}</h3>
          <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {mockProject.type}
          </span>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
          {STAGES[CURRENT_STAGE]}
        </span>
      </div>

      {/* Signatures progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>חתימות שנאספו</span>
          <span className="font-medium">{mockProject.signed} / {mockProject.total} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-1">
        {STAGES.map((s, i) => (
          <span key={i} className={`text-xs px-2 py-1 rounded-full ${
            i < CURRENT_STAGE ? 'bg-green-100 text-green-700' :
            i === CURRENT_STAGE ? 'bg-blue-600 text-white font-medium' :
            'bg-gray-100 text-gray-400'
          }`}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function LeadershipCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">מי מוביל</h3>
      <div className="space-y-3">
        {[
          { label: 'מנהל פרויקט', ...mockLeadership.manager, icon: '🏢' },
          { label: 'עורך דין', name: mockLeadership.lawyer.name, company: mockLeadership.lawyer.firm, phone: mockLeadership.lawyer.phone, icon: '⚖️' },
          { label: 'ועד הבניין', name: mockLeadership.committee.name, company: mockLeadership.committee.role, phone: mockLeadership.committee.phone, icon: '🏠' }
        ].map((p) => (
          <div key={p.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xl">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{p.label}</p>
              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-500 truncate">{p.company}</p>
            </div>
            <a href={`tel:${p.phone}`} className="text-blue-600 text-sm shrink-0">{p.phone}</a>
          </div>
        ))}
      </div>
    </div>
  )
}

function PendingActionsCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">פעולות נדרשות</h3>
      {mockDocs.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <span className="text-3xl">✅</span>
          <p className="text-sm mt-2">אין פעולות ממתינות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mockDocs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                  {doc.urgent && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">דחוף</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">עד {doc.dueDate}</p>
              </div>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">חתום →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectTimeline() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">ציר זמן</h3>
      <div className="space-y-1">
        {STAGES.map((stage, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
              i < CURRENT_STAGE ? 'bg-green-500 text-white' :
              i === CURRENT_STAGE ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < CURRENT_STAGE ? '✓' : i + 1}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`absolute w-0.5 h-4 mt-6 mr-3 ${i < CURRENT_STAGE ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
            <span className={`text-sm ${
              i < CURRENT_STAGE ? 'text-green-700 line-through' :
              i === CURRENT_STAGE ? 'text-blue-700 font-semibold' :
              'text-gray-400'
            }`}>{stage}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        <ProjectStatusCard />
        <LeadershipCard />
        <PendingActionsCard />
        <ProjectTimeline />
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2">
        <div className="max-w-lg mx-auto flex justify-around">
          {[['🏠','ראשי','/dashboard'],['📄','מסמכים','/documents'],['👤','פרופיל','/profile']].map(([icon,label,path]) => (
            <a key={path} href={path} className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
              <span className="text-xl">{icon}</span>{label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
