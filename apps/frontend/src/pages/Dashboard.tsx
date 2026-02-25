import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

const STAGES = ['סקר','ייצוג','מו"מ','הסכם','חתימות','תכנון','היתר','פינוי','בנייה','מסירה']

const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

function StageIndex(status?: string) {
  const order = ['INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT',
    'SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY']
  return order.indexOf(status ?? '') ?? 0
}

export default function Dashboard() {
  const { data: project, isLoading } = trpc.tenant.getMyProject.useQuery()
  const { data: docs } = trpc.tenant.getDocuments.useQuery()
  const { data: leadership } = trpc.tenant.getLeadership.useQuery()
  const signDoc = trpc.tenant.signDocument.useMutation()

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    </div>
  )

  const currentStage = StageIndex(project?.status)
  const signed = project?.signatures?.length ?? 0
  const total = project?.milestones?.length ?? 0
  const pct = total ? Math.round((signed / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Project Status Card */}
        {project ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {project.type?.replace('_', ' ')}
                </span>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>חתימות שנאספו</span>
                  <span className="font-medium">{signed} / {total} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {STAGES.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                  i < currentStage ? 'bg-green-100 text-green-700' :
                  i === currentStage ? 'bg-blue-600 text-white font-medium' :
                  'bg-gray-100 text-gray-400'
                }`}>{s}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
            <div className="text-4xl mb-2">🏗️</div>
            <p>טרם שויכת לפרויקט. פנה למנהל הפרויקט.</p>
          </div>
        )}

        {/* Leadership */}
        {leadership && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">מי מוביל</h3>
            <div className="space-y-3">
              {[
                { label: 'מנהל פרויקט', name: leadership.manager?.full_name, phone: leadership.manager?.phone, icon: '🏢' },
              ].filter(p => p.name).map((p) => (
                <div key={p.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">{p.label}</p>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.phone && <p className="text-xs text-blue-600">{p.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {docs && docs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">מסמכים לחתימה</h3>
            <div className="space-y-3">
              {docs.map((doc: any) => {
                const isSigned = doc.signatures?.length > 0
                return (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isSigned ? 'border-green-200 bg-green-50' :
                    doc.type === 'SIGN_REQUIRED' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      {doc.due_date && <p className="text-xs text-gray-500">עד {doc.due_date}</p>}
                    </div>
                    {isSigned ? (
                      <span className="text-green-600 text-sm font-medium">✅ חתום</span>
                    ) : doc.type === 'SIGN_REQUIRED' ? (
                      <button
                        onClick={() => signDoc.mutate({ docId: doc.id })}
                        disabled={signDoc.isPending}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        חתום עכשיו
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
