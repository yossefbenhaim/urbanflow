import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'

// Friendly labels for inspection types
const TYPE_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  architectural_feasibility: {
    label: 'בדיקת היתכנות אדריכלית',
    icon: '🏗️',
    description: 'בדיקה האם הבניין מתאים להריסה ובנייה מחדש מבחינה אדריכלית',
  },
  planning_check: {
    label: 'בדיקת תב"ע',
    icon: '📋',
    description: 'בדיקה האם תכנית המתאר מאפשרת בנייה חדשה באזור',
  },
  cluster_feasibility: {
    label: 'בדיקת מתחם',
    icon: '🏘️',
    description: 'בדיקה האם כדאי לאחד מספר בניינים לפרויקט משותף',
  },
  constraints_check: {
    label: 'בדיקת מגבלות',
    icon: '⚠️',
    description: 'בדיקה האם יש מגבלות מיוחדות (שימור, עתיקות, תשתיות)',
  },
  economic_feasibility: {
    label: 'כדאיות כלכלית',
    icon: '💰',
    description: 'בדיקה האם הפרויקט כדאי מבחינה כלכלית ליזם ולדיירים',
  },
  property_valuation: {
    label: 'הערכת שווי דירות',
    icon: '🏠',
    description: 'הערכת שווי הדירות הקיימות והחדשות',
  },
  rental_assessment: {
    label: 'הערכת דמי שכירות',
    icon: '📅',
    description: 'הערכת דמי השכירות שידרשו בתקופת הפינוי',
  },
  commercial_appraisal: {
    label: 'שמאות מסחרית',
    icon: '🏪',
    description: 'הערכת שווי שטחים מסחריים בבניין',
  },
}

// Friendly conclusion labels
const CONCLUSION_FRIENDLY: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  single_building: { icon: '✅', label: 'אפשרי — בניין בודד', color: '#16a34a', bg: '#f0fdf4' },
  prefer_cluster: { icon: '🏘️', label: 'עדיף מתחם', color: '#2563eb', bg: '#eff6ff' },
  complex: { icon: '⚠️', label: 'מורכב — דורש בדיקה נוספת', color: '#ca8a04', bg: '#fefce8' },
  not_recommended: { icon: '❌', label: 'לא מומלץ', color: '#dc2626', bg: '#fef2f2' },
  economic: { icon: '✅', label: 'כלכלי — כדאי', color: '#16a34a', bg: '#f0fdf4' },
  borderline: { icon: '⚠️', label: 'גבולי — יש לבדוק', color: '#ca8a04', bg: '#fefce8' },
  not_economic: { icon: '❌', label: 'לא כלכלי', color: '#dc2626', bg: '#fef2f2' },
}

export default function TenantInspectionView() {
  const navigate = useNavigate()
  const { data: inspections, isLoading } = trpc.tenant.getProjectInspections.useQuery()

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <BuildingLoader size="md" />
        </div>
      </PageLayout>
    )
  }

  const inspectionList = (inspections ?? []) as any[]

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-12" dir="rtl">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[#3b6b9c] text-sm font-medium flex items-center gap-1 mb-4"
        >
          → חזרה לדף הבית
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-bold text-[#212121] mb-2">תוצאות בדיקות</h1>
          <p className="text-[#5a5a6e] text-sm">
            סיכום הבדיקות המקצועיות שבוצעו עבור הפרויקט שלך
          </p>
        </div>

        {inspectionList.length === 0 ? (
          <div className="sc-card p-8 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-[#212121] mb-2">
              עדיין אין תוצאות בדיקות
            </h3>
            <p className="text-[#5a5a6e] text-sm">
              ברגע שבדיקות יוגשו ויאושרו, התוצאות יופיעו כאן
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="sc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h2 className="font-bold text-[#212121]">סיכום</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-[#f0fdf4]">
                  <p className="text-2xl font-bold text-[#16a34a]">
                    {
                      inspectionList.filter(
                        (i: any) =>
                          i.conclusion === 'single_building' ||
                          i.conclusion === 'economic'
                      ).length
                    }
                  </p>
                  <p className="text-xs text-[#5a5a6e]">✅ חיובי</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[#fefce8]">
                  <p className="text-2xl font-bold text-[#ca8a04]">
                    {
                      inspectionList.filter(
                        (i: any) =>
                          i.conclusion === 'complex' ||
                          i.conclusion === 'borderline' ||
                          i.conclusion === 'prefer_cluster'
                      ).length
                    }
                  </p>
                  <p className="text-xs text-[#5a5a6e]">⚠️ מעורב</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[#fef2f2]">
                  <p className="text-2xl font-bold text-[#dc2626]">
                    {
                      inspectionList.filter(
                        (i: any) =>
                          i.conclusion === 'not_recommended' ||
                          i.conclusion === 'not_economic'
                      ).length
                    }
                  </p>
                  <p className="text-xs text-[#5a5a6e]">❌ שלילי</p>
                </div>
              </div>
            </div>

            {/* Inspection Cards */}
            {inspectionList.map((insp: any) => {
              const typeInfo = TYPE_LABELS[insp.inspection_type] ?? {
                label: insp.inspection_type,
                icon: '📄',
                description: '',
              }
              const conclusion = CONCLUSION_FRIENDLY[insp.conclusion] ?? {
                icon: '🔍',
                label: insp.conclusion ?? 'ממתין',
                color: '#5a5a6e',
                bg: '#f8f9fa',
              }

              return (
                <div
                  key={insp.id}
                  className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden"
                >
                  {/* Type Header */}
                  <div className="p-4 border-b border-[#eeeeee]">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5">{typeInfo.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#212121] text-sm">
                          {typeInfo.label}
                        </h3>
                        <p className="text-xs text-[#5a5a6e] mt-0.5">
                          {typeInfo.description}
                        </p>
                      </div>
                      {insp.is_useful && (
                        <span className="sc-badge bg-[#4a8c5c]/10 text-[#4a8c5c] text-[10px]">
                          שימושי
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div
                    className="p-4"
                    style={{ backgroundColor: conclusion.bg }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{conclusion.icon}</span>
                      <div>
                        <p
                          className="font-bold text-sm"
                          style={{ color: conclusion.color }}
                        >
                          {conclusion.label}
                        </p>
                        <p className="text-xs text-[#5a5a6e] mt-0.5">
                          מסקנה מקצועית
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes (if any) */}
                  {insp.notes && (
                    <div className="px-4 py-3 border-t border-[#eeeeee]">
                      <p className="text-xs text-[#5a5a6e] mb-1">הערות:</p>
                      <p className="text-sm text-[#333] leading-relaxed">
                        {insp.notes}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="px-4 py-2 bg-[#f8f9fa] text-xs text-[#5a5a6e]">
                    {insp.submitted_at
                      ? `הוגש: ${new Date(insp.submitted_at).toLocaleDateString('he-IL')}`
                      : 'תאריך לא זמין'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
