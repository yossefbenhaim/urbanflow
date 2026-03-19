import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'
import { BuildingLoader } from '../components/BuildingLoader'

// ── Types ─────────────────────────────────────────────────
type InspectionType =
  | 'architectural_feasibility' | 'planning_check' | 'cluster_feasibility' | 'constraints_check'
  | 'economic_feasibility' | 'property_valuation' | 'rental_assessment' | 'commercial_appraisal'

const ARCHITECT_TYPES: { key: InspectionType; label: string; icon: string }[] = [
  { key: 'architectural_feasibility', label: 'היתכנות אדריכלית', icon: '🏗️' },
  { key: 'planning_check', label: 'בדיקת תב"ע', icon: '📋' },
  { key: 'cluster_feasibility', label: 'בדיקת מתחם', icon: '🏘️' },
  { key: 'constraints_check', label: 'בדיקת מגבלות', icon: '⚠️' },
]

const APPRAISER_TYPES: { key: InspectionType; label: string; icon: string }[] = [
  { key: 'economic_feasibility', label: 'כדאיות כלכלית', icon: '💰' },
  { key: 'property_valuation', label: 'הערכת שווי דירות', icon: '🏠' },
  { key: 'rental_assessment', label: 'דמי שכירות', icon: '📅' },
  { key: 'commercial_appraisal', label: 'שמאות מסחרית', icon: '🏪' },
]

const CONCLUSION_LABELS: Record<string, string> = {
  single_building: '✅ אפשר בניין בודד',
  prefer_cluster: '🏘️ עדיף מתחם',
  complex: '⚠️ מורכב',
  not_recommended: '❌ לא כדאי',
  economic: '✅ כלכלי',
  borderline: '⚠️ גבולי',
  not_economic: '❌ לא כלכלי',
}

// ── Main Page ─────────────────────────────────────────────
export default function InspectionsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<InspectionType | null>(null)
  const [activeTab, setActiveTab] = useState<'projects' | 'my-inspections' | 'notifications'>('projects')

  const { data: planData } = trpc.inspections.getMyPlan.useQuery()
  const { data: projectsData, isLoading } = trpc.inspections.getOpenProjects.useQuery()
  const { data: myInspections } = trpc.inspections.getMyInspections.useQuery()
  const { data: notifications } = trpc.inspections.getNotifications.useQuery()
  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  const markRead = trpc.inspections.markNotificationRead.useMutation()
  const upgradeToPro = trpc.inspections.upgradeToPro.useMutation()

  const isPro = planData?.plan === 'pro'

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      {/* Plan Banner */}
      <div className={`${isPro ? 'bg-gradient-to-l from-amber-500 to-yellow-400' : 'bg-gray-800'} text-white py-3 px-4`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isPro ? '⭐' : '🔒'}</span>
            <div>
              <p className="font-bold text-sm">{isPro ? 'חשבון Pro — גישה מלאה לבדיקות' : 'חשבון Basic'}</p>
              {isPro ? (
                <p className="text-xs opacity-80">
                  ניקוד: {planData?.ranking_score ?? 0} | תרומה: {planData?.contribution_score ?? 0} | איכות: {planData?.quality_score ?? 0}
                </p>
              ) : (
                <p className="text-xs opacity-80">שדרג ל-Pro לקבלת התראות ובדיקות</p>
              )}
            </div>
          </div>
          {!isPro && (
            <button
              onClick={() => upgradeToPro.mutate()}
              disabled={upgradeToPro.isPending}
              className="bg-amber-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              {upgradeToPro.isPending ? '...' : 'שדרג ל-Pro'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
        <div className="max-w-2xl mx-auto flex">
          {([
            ['projects', 'פרויקטים פתוחים', '🏗️'],
            ['my-inspections', 'הבדיקות שלי', '📄'],
            ['notifications', `התראות${unreadCount > 0 ? ` (${unreadCount})` : ''}`, '🔔'],
          ] as [string, string, string][]).map(([v, l, icon]) => (
            <button key={v} onClick={() => setActiveTab(v as any)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1
                ${activeTab === v ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              <span>{icon}</span> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-12">

        {/* ─── Projects Tab ─── */}
        {activeTab === 'projects' && (
          <>
            {!isPro ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">גישה ל-Pro בלבד</h3>
                <p className="text-gray-500 text-sm mb-6">שדרג ל-Pro כדי לראות פרויקטים פתוחים ולהגיש בדיקות</p>
                <button
                  onClick={() => upgradeToPro.mutate()}
                  className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-amber-600"
                >⭐ שדרג ל-Pro</button>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-16"><BuildingLoader size="md" /></div>
            ) : (
              <div className="space-y-4">
                {(projectsData?.projects ?? []).length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-2">🏗️</div>
                    <p>אין פרויקטים פתוחים כרגע</p>
                  </div>
                ) : (projectsData?.projects ?? []).map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onStartInspection={(type) => navigate(`/inspections/${project.id}/new/${type}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── My Inspections Tab ─── */}
        {activeTab === 'my-inspections' && (
          <div className="space-y-3">
            {(myInspections ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📄</div>
                <p>עדיין לא הגשת בדיקות</p>
              </div>
            ) : (myInspections ?? []).map((insp: any) => (
              <div key={insp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {ARCHITECT_TYPES.concat(APPRAISER_TYPES).find(t => t.key === insp.inspection_type)?.label ?? insp.inspection_type}
                    </p>
                    <p className="text-xs text-gray-500">{insp.project?.city} {insp.project?.street}</p>
                  </div>
                  <StatusBadge status={insp.status} />
                </div>
                {insp.conclusion && (
                  <p className="text-xs text-gray-600 mb-2">{CONCLUSION_LABELS[insp.conclusion]}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {insp.files?.length ?? 0} קבצים | מיקום {insp.slot_number} מתוך 3
                  </p>
                  {insp.is_useful && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ סומן שימושי</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Notifications Tab ─── */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {(notifications ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">🔔</div>
                <p>אין התראות</p>
              </div>
            ) : (notifications ?? []).map((notif: any) => (
              <div
                key={notif.id}
                onClick={() => { markRead.mutate(notif.id); if (notif.action_url) navigate(notif.action_url) }}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all
                  ${notif.is_read ? 'border-gray-100 opacity-70' : 'border-blue-200 bg-blue-50'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {notif.notification_type === 'new_project_opened' ? '🏗️' :
                     notif.notification_type === 'architect_inspection_needed' ? '📐' :
                     notif.notification_type === 'appraiser_inspection_needed' ? '💰' : '📍'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">{notif.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  {!notif.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Project Card ──────────────────────────────────────────
function ProjectCard({ project, onStartInspection }: { project: any; onStartInspection: (type: InspectionType) => void }) {
  const [expanded, setExpanded] = useState(false)

  const allTypes = [...ARCHITECT_TYPES, ...APPRAISER_TYPES]
  const availableTypes = allTypes.filter(t => (project.availableSlots?.[t.key] ?? 0) < 3)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-900">{project.street} {project.building_number}</h3>
            <p className="text-sm text-gray-500">{project.city}</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">פתוח לבדיקות</span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>🏠 {project.apartment_count ?? '?'} דירות</span>
          <span>📊 {availableTypes.length} בדיקות פנויות</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">בחר סוג בדיקה להגשה:</p>
          <div className="space-y-2">
            {allTypes.map(type => {
              const slotCount = project.availableSlots?.[type.key] ?? 0
              const isFull = slotCount >= 3
              return (
                <button
                  key={type.key}
                  onClick={() => !isFull && onStartInspection(type.key)}
                  disabled={isFull}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all
                    ${isFull
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                    }`}
                >
                  <span>{type.icon} {type.label}</span>
                  <span className={`text-xs font-medium ${isFull ? 'text-red-400' : 'text-blue-500'}`}>
                    {isFull ? 'מלא' : `מיקום ${slotCount + 1}/3`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    draft: { label: 'טיוטה', class: 'bg-gray-100 text-gray-600' },
    submitted: { label: 'הוגש', class: 'bg-blue-100 text-blue-700' },
    approved: { label: '✅ אושר', class: 'bg-green-100 text-green-700' },
    rejected: { label: '❌ נדחה', class: 'bg-red-100 text-red-700' },
  }
  const c = config[status] ?? config.draft
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.class}`}>{c.label}</span>
}
