import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'
import BuildingLoader from '../components/BuildingLoader'

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
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />

      {/* Plan Banner */}
      <div className={`${isPro ? 'bg-gradient-to-l from-sc-gold to-sc-gold-dark' : 'bg-sc-navy'} text-white py-3 px-4`}>
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
              className="bg-sc-gold-dark text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-sc-gold-dark/90 transition-colors"
            >
              {upgradeToPro.isPending ? '...' : 'שדרג ל-Pro'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-sc-border sticky top-14 z-10">
        <div className="max-w-2xl mx-auto flex">
          {([
            ['projects', 'פרויקטים פתוחים', '🏗️'],
            ['my-inspections', 'הבדיקות שלי', '📄'],
            ['notifications', `התראות${unreadCount > 0 ? ` (${unreadCount})` : ''}`, '🔔'],
          ] as [string, string, string][]).map(([v, l, icon]) => (
            <button key={v} onClick={() => setActiveTab(v as any)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1
                ${activeTab === v ? 'border-sc-primary text-sc-primary' : 'border-transparent text-sc-text-light'}`}>
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
                <h3 className="text-xl font-bold text-sc-text mb-2">גישה ל-Pro בלבד</h3>
                <p className="text-sc-text-light text-sm mb-6">שדרג ל-Pro כדי לראות פרויקטים פתוחים ולהגיש בדיקות</p>
                <button
                  onClick={() => upgradeToPro.mutate()}
                  className="bg-sc-gold-dark text-white px-8 py-3 rounded-2xl font-bold hover:bg-sc-gold-dark/90"
                >⭐ שדרג ל-Pro</button>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-16"><BuildingLoader size="md" /></div>
            ) : (
              <div className="space-y-4">
                {(projectsData?.projects ?? []).length === 0 ? (
                  <div className="text-center py-16 text-sc-text-light">
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
              <div className="text-center py-16 text-sc-text-light">
                <div className="text-4xl mb-2">📄</div>
                <p>עדיין לא הגשת בדיקות</p>
              </div>
            ) : (myInspections ?? []).map((insp: any) => (
              <div key={insp.id} className="sc-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sc-text text-sm">
                      {ARCHITECT_TYPES.concat(APPRAISER_TYPES).find(t => t.key === insp.inspection_type)?.label ?? insp.inspection_type}
                    </p>
                    <p className="text-xs text-sc-text-light">{insp.project?.city} {insp.project?.street}</p>
                  </div>
                  <StatusBadge status={insp.status} />
                </div>
                {insp.conclusion && (
                  <p className="text-xs text-sc-text-light mb-2">{CONCLUSION_LABELS[insp.conclusion]}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-sc-text-light">
                    {insp.files?.length ?? 0} קבצים | מיקום {insp.slot_number} מתוך 3
                  </p>
                  {insp.is_useful && (
                    <span className="sc-badge bg-sc-success/10 text-sc-success">✅ סומן שימושי</span>
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
              <div className="text-center py-16 text-sc-text-light">
                <div className="text-4xl mb-2">🔔</div>
                <p>אין התראות</p>
              </div>
            ) : (notifications ?? []).map((notif: any) => (
              <div
                key={notif.id}
                onClick={() => { markRead.mutate(notif.id); if (notif.action_url) navigate(notif.action_url) }}
                className={`sc-card p-4 cursor-pointer transition-all
                  ${notif.is_read ? 'opacity-70' : 'border-sc-primary bg-sc-light-blue'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {notif.notification_type === 'new_project_opened' ? '🏗️' :
                     notif.notification_type === 'architect_inspection_needed' ? '📐' :
                     notif.notification_type === 'appraiser_inspection_needed' ? '💰' : '📍'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-sc-text">{notif.title}</p>
                    <p className="text-xs text-sc-text-light mt-0.5 whitespace-pre-line">{notif.body}</p>
                    <p className="text-xs text-sc-text-light mt-1">
                      {new Date(notif.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  {!notif.is_read && <div className="w-2 h-2 bg-sc-primary rounded-full mt-1 flex-shrink-0" />}
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
    <div className="sc-card overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-sc-text">{project.street} {project.building_number}</h3>
            <p className="text-sm text-sc-text-light">{project.city}</p>
          </div>
          <span className="sc-badge bg-sc-success/10 text-sc-success">פתוח לבדיקות</span>
        </div>
        <div className="flex gap-3 text-xs text-sc-text-light">
          <span>🏠 {project.apartment_count ?? '?'} דירות</span>
          <span>📊 {availableTypes.length} בדיקות פנויות</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-sc-border p-4">
          <p className="text-xs font-semibold text-sc-text mb-3">בחר סוג בדיקה להגשה:</p>
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
                      ? 'border-sc-border bg-sc-bg text-sc-text-light cursor-not-allowed'
                      : 'border-sc-light-blue bg-sc-light-blue text-sc-primary hover:bg-sc-light-blue/70 cursor-pointer'
                    }`}
                >
                  <span>{type.icon} {type.label}</span>
                  <span className={`text-xs font-medium ${isFull ? 'text-sc-error' : 'text-sc-primary'}`}>
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
    draft: { label: 'טיוטה', class: 'bg-sc-border text-sc-text-light' },
    submitted: { label: 'הוגש', class: 'bg-sc-light-blue text-sc-primary' },
    approved: { label: '✅ אושר', class: 'bg-sc-success/10 text-sc-success' },
    rejected: { label: '❌ נדחה', class: 'bg-sc-error/10 text-sc-error' },
  }
  const c = config[status] ?? config.draft
  return <span className={`sc-badge ${c.class}`}>{c.label}</span>
}
