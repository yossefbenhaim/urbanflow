import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

const TYPE_LABELS: Record<string, string> = {
  PINUY_BINUY: 'פינוי בינוי', TAMA_38_1: 'תמ"א 38/1',
  TAMA_38_2: 'תמ"א 38/2', IBUY_BINUY: 'עיבוי בינוי',
}
const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

export default function ManagerDashboard() {
  const { data: projects, isLoading } = trpc.manager.getProjects.useQuery()

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">לוח הבקרה — מנהל פרויקט</h1>
            <p className="text-gray-500 text-sm mt-1">{projects?.length ?? 0} פרויקטים פעילים</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + פרויקט חדש
          </button>
        </div>

        {/* Projects grid */}
        {!projects || projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            <div className="text-5xl mb-4">🏗️</div>
            <p className="text-lg font-medium">אין פרויקטים עדיין</p>
            <p className="text-sm mt-1">לחץ על "פרויקט חדש" כדי להתחיל</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project: any) => (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {TYPE_LABELS[project.type] ?? project.type}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                    {STATUS_LABELS[project.status] ?? project.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>🏢 {project.buildings?.length ?? 0} בניינים</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
