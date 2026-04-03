import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'

type InspectionType =
  | 'architectural_feasibility' | 'planning_check' | 'cluster_feasibility' | 'constraints_check'
  | 'economic_feasibility' | 'property_valuation' | 'rental_assessment' | 'commercial_appraisal'

const TYPE_META: Record<InspectionType, { title: string; icon: string; isArchitect: boolean }> = {
  architectural_feasibility: { title: 'בדיקת היתכנות אדריכלית', icon: '🏗️', isArchitect: true },
  planning_check: { title: `בדיקת תב"ע`, icon: '📋', isArchitect: true },
  cluster_feasibility: { title: 'בדיקת מתחם', icon: '🏘️', isArchitect: true },
  constraints_check: { title: 'בדיקת מגבלות', icon: '⚠️', isArchitect: true },
  economic_feasibility: { title: 'בדיקת כדאיות כלכלית', icon: '💰', isArchitect: false },
  property_valuation: { title: 'הערכת שווי דירות', icon: '🏠', isArchitect: false },
  rental_assessment: { title: 'הערכת דמי שכירות', icon: '📅', isArchitect: false },
  commercial_appraisal: { title: 'שמאות מסחרית', icon: '🏪', isArchitect: false },
}

const ARCHITECT_CONCLUSIONS = [
  { value: 'single_building', label: '✅ אפשר בניין בודד' },
  { value: 'prefer_cluster', label: '🏘️ עדיף מתחם' },
  { value: 'complex', label: '⚠️ מורכב' },
  { value: 'not_recommended', label: '❌ לא כדאי' },
]

const APPRAISER_CONCLUSIONS = [
  { value: 'economic', label: '✅ כלכלי' },
  { value: 'borderline', label: '⚠️ גבולי' },
  { value: 'not_economic', label: '❌ לא כלכלי' },
]

export default function NewInspectionPage() {
  const { projectId, inspectionType } = useParams<{ projectId: string; inspectionType: InspectionType }>()
  const navigate = useNavigate()
  const meta = TYPE_META[inspectionType as InspectionType]
  const isArchitect = meta?.isArchitect

  const [form, setForm] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'files'>('form')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const saveDraft = trpc.inspections.saveDraft.useMutation()
  const submitInspection = trpc.inspections.submit.useMutation()
  const { data: slotData } = trpc.inspections.getSlotCount.useQuery({
    projectId: projectId!,
    inspectionType: inspectionType as any,
  })

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async () => {
    setError('')
    if (!form.conclusion) { setError('חובה לבחור מסקנה'); return }
    try {
      const data = await saveDraft.mutateAsync({
        projectId: projectId!,
        inspectionType: inspectionType as any,
        ...form,
      } as any)
      setSavedId((data as any).id)
      setStep('files')
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בשמירה')
    }
  }

  const handleSubmit = async () => {
    if (!savedId) return
    try {
      await submitInspection.mutateAsync({ inspectionId: savedId })
      navigate('/provider-dashboard', { state: { successMsg: '✅ הבדיקה הוגשה בהצלחה!' } })
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (slotData?.isFull) {
    return (
      <PageLayout>
        
        <div className="max-w-lg mx-auto p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-[#212121] mb-2">הבדיקה מלאה</h2>
          <p className="text-[#5a5a6e] mb-6">כבר הוגשו 3 בדיקות מסוג זה לפרויקט זה</p>
          <button onClick={() => navigate(-1)} className="sc-btn-primary">חזרה</button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      
      <div className="max-w-lg mx-auto p-4 pb-12">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-[#5a5a6e] text-sm mb-3 flex items-center gap-1">
            ← חזרה
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta?.icon}</span>
            <div>
              <h1 className="sc-section-title text-xl">{meta?.title}</h1>
              <p className="text-sm text-[#5a5a6e]">
                מיקום {(slotData?.count ?? 0) + 1} מתוך 3
                {(slotData?.count ?? 0) === 0 && ' — ראשון מקבל ניקוד בונוס! 🏆'}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${step === 'form' ? 'bg-[#3b6b9c] text-white' : 'bg-sc-border text-[#5a5a6e]'}`}>
              <span>1</span> פרטים
            </div>
            <div className="w-8 h-px bg-sc-border" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${step === 'files' ? 'bg-[#3b6b9c] text-white' : 'bg-sc-border text-[#5a5a6e]'}`}>
              <span>2</span> קבצים
            </div>
          </div>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            {/* Common fields */}
            <Section title="פרטי בניין">
              <Field label="כתובת" value={form.buildingAddress} onChange={v => set('buildingAddress', v)} placeholder="רחוב + מספר" />
              <Row>
                <Field label="מס׳ דירות" value={form.apartmentCount} onChange={v => set('apartmentCount', +v)} type="number" />
                <Field label="מס׳ קומות" value={form.floorCount} onChange={v => set('floorCount', +v)} type="number" />
              </Row>
            </Section>

            {/* ─── Architect Forms ─── */}
            {inspectionType === 'architectural_feasibility' && (
              <>
                <Section title="תכנון">
                  <Field label={`תב"ע רלוונטית`} value={form.relevantPlan} onChange={v => set('relevantPlan', v)} />
                  <Field label="זכויות בנייה" value={form.buildingRights} onChange={v => set('buildingRights', v)} />
                  <Field label="מגבלות גובה" value={form.heightRestriction} onChange={v => set('heightRestriction', v)} />
                </Section>
                <Section title="מגבלות">
                  <Toggle label="שימור" value={form.heritageSite} onChange={v => set('heritageSite', v)} />
                  <Toggle label="עתיקות" value={form.antiquities} onChange={v => set('antiquities', v)} />
                  <Field label="חניה" value={form.parkingNotes} onChange={v => set('parkingNotes', v)} />
                  <Field label="תשתיות" value={form.infrastructureNotes} onChange={v => set('infrastructureNotes', v)} />
                </Section>
              </>
            )}

            {inspectionType === 'planning_check' && (
              <Section title={`נתוני תב"ע`}>
                <Field label={`מספר תב"ע`} value={form.planNumber} onChange={v => set('planNumber', v)} />
                <Field label="ייעוד קרקע" value={form.landUse} onChange={v => set('landUse', v)} />
                <Field label="אחוזי בנייה (%)" value={form.buildingCoveragePct} onChange={v => set('buildingCoveragePct', +v)} type="number" />
                <Field label="מגבלות תכנון" value={form.planningLimitations} onChange={v => set('planningLimitations', v)} textarea />
              </Section>
            )}

            {inspectionType === 'cluster_feasibility' && (
              <Section title="ניתוח מתחם">
                <Toggle label="הבניין מתאים לבד" value={form.suitableStandalone} onChange={v => set('suitableStandalone', v)} />
                <Field label="מספר בניינים מומלץ" value={form.recommendedClusterCount} onChange={v => set('recommendedClusterCount', +v)} type="number" />
                <Field label="הערות מתחם" value={form.clusterNotes} onChange={v => set('clusterNotes', v)} textarea />
              </Section>
            )}

            {inspectionType === 'constraints_check' && (
              <Section title="מגבלות מפורטות">
                <Field label="שימור" value={form.heritageConstraint} onChange={v => set('heritageConstraint', v)} textarea />
                <Field label="עתיקות" value={form.antiquitiesConstraint} onChange={v => set('antiquitiesConstraint', v)} textarea />
                <Field label="מגבלות תשתית" value={form.infrastructureConstraint} onChange={v => set('infrastructureConstraint', v)} textarea />
                <Field label="רוחב רחוב" value={form.streetWidthConstraint} onChange={v => set('streetWidthConstraint', v)} />
              </Section>
            )}

            {/* ─── Appraiser Forms ─── */}
            {inspectionType === 'economic_feasibility' && (
              <Section title="נתונים כלכליים">
                <Row>
                  <Field label={`יח"ד קיימות`} value={form.existingUnits} onChange={v => set('existingUnits', +v)} type="number" />
                  <Field label={`שטח ממוצע (מ"ר)`} value={form.avgSqm} onChange={v => set('avgSqm', +v)} type="number" />
                </Row>
                <Row>
                  <Field label="שווי דירה קיימת (₪)" value={form.currentUnitValue} onChange={v => set('currentUnitValue', +v)} type="number" />
                  <Field label="שווי דירה חדשה (₪)" value={form.newUnitValue} onChange={v => set('newUnitValue', +v)} type="number" />
                </Row>
                <Field label={`עלות בנייה למ"ר (₪)`} value={form.constructionCostPerSqm} onChange={v => set('constructionCostPerSqm', +v)} type="number" />
              </Section>
            )}

            {inspectionType === 'property_valuation' && (
              <Section title="נתוני שווי">
                <Field label="שווי ממוצע (₪)" value={form.avgPropertyValue} onChange={v => set('avgPropertyValue', +v)} type="number" />
                <Field label="שונות בין קומות (%)" value={form.floorVariancePct} onChange={v => set('floorVariancePct', +v)} type="number" />
              </Section>
            )}

            {inspectionType === 'rental_assessment' && (
              <Section title="שכירות">
                <Field label="שכירות ממוצעת לחודש (₪)" value={form.avgMonthlyRent} onChange={v => set('avgMonthlyRent', +v)} type="number" />
                <Field label="תקופת פינוי (חודשים)" value={form.evacuationPeriodMonths} onChange={v => set('evacuationPeriodMonths', +v)} type="number" />
              </Section>
            )}

            {inspectionType === 'commercial_appraisal' && (
              <Section title="שמאות מסחרית">
                <Field label="סוג שימוש" value={form.commercialUseType} onChange={v => set('commercialUseType', v)} />
                <Field label="שווי מסחרי (₪)" value={form.commercialValue} onChange={v => set('commercialValue', +v)} type="number" />
              </Section>
            )}

            {/* Notes */}
            <Section title="הערות">
              <Field label="הערות כלליות" value={form.notes} onChange={v => set('notes', v)} textarea />
            </Section>

            {/* Conclusion */}
            <Section title="מסקנה *">
              <div className="grid grid-cols-2 gap-2">
                {(isArchitect ? ARCHITECT_CONCLUSIONS : APPRAISER_CONCLUSIONS).map(c => (
                  <button
                    key={c.value}
                    onClick={() => set('conclusion', c.value)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-right
                      ${form.conclusion === c.value ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] text-[#5a5a6e]'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Section>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saveDraft.isPending}
              className="sc-btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              {saveDraft.isPending ? 'שומר...' : 'המשך → העלאת קבצים'}
            </button>
          </div>
        )}

        {step === 'files' && (
          <FilesStep
            inspectionId={savedId!}
            inspectionType={inspectionType as InspectionType}
            isArchitect={!!isArchitect}
            onSubmit={handleSubmit}
            isSubmitting={submitInspection.isPending}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

// ── Files Step ────────────────────────────────────────────
const FILE_TYPES_BY_INSPECTION: Record<InspectionType, { key: string; label: string; required?: boolean }[]> = {
  architectural_feasibility: [
    { key: 'report_pdf', label: 'דוח בדיקה PDF', required: true },
    { key: 'sketch', label: 'סקיצה' },
    { key: 'blueprint', label: 'תשריט בסיסי' },
  ],
  planning_check: [
    { key: 'tama_doc', label: `מסמך תב"ע`, required: true },
    { key: 'blueprint', label: 'תשריט' },
  ],
  cluster_feasibility: [
    { key: 'map', label: 'מפה', required: true },
    { key: 'cluster_map', label: 'תרשים מתחם' },
  ],
  constraints_check: [
    { key: 'report_pdf', label: 'מסמך מגבלות', required: true },
    { key: 'photo', label: 'תמונות' },
  ],
  economic_feasibility: [
    { key: 'report_pdf', label: 'דוח כלכלי PDF', required: true },
  ],
  property_valuation: [
    { key: 'valuation_report', label: 'דוח שווי', required: true },
  ],
  rental_assessment: [
    { key: 'rent_table', label: 'טבלת שוק שכירות', required: true },
  ],
  commercial_appraisal: [
    { key: 'commercial_report', label: 'דוח שמאות מסחרית', required: true },
  ],
}

function FilesStep({ inspectionId, inspectionType, isArchitect, onSubmit, isSubmitting, error }: {
  inspectionId: string
  inspectionType: InspectionType
  isArchitect: boolean
  onSubmit: () => void
  isSubmitting: boolean
  error: string
}) {
  const [uploaded, setUploaded] = useState<Set<string>>(new Set())
  const addFile = trpc.inspections.addFile.useMutation()
  const fileTypes = FILE_TYPES_BY_INSPECTION[inspectionType] ?? []

  const handleUpload = async (fileTypeKey: string, file: File) => {
    // בפרודקשן: upload לsupabase storage ואז addFile
    // כרגע: mock URL
    const mockUrl = `https://supabase.byclick.co.il/storage/v1/object/inspections/${inspectionId}/${file.name}`
    await addFile.mutateAsync({
      inspectionId,
      fileType: fileTypeKey as any,
      fileName: file.name,
      fileUrl: mockUrl,
      fileSizeBytes: file.size,
    })
    setUploaded(s => new Set([...s, fileTypeKey]))
  }

  const requiredCount = fileTypes.filter(f => f.required).length
  const uploadedRequired = fileTypes.filter(f => f.required && uploaded.has(f.key)).length
  const canSubmit = uploadedRequired >= requiredCount

  return (
    <div className="space-y-4">
      <div className="bg-[#ebf1f7] rounded-2xl p-4">
        <h3 className="font-bold text-[#1e3a5f] mb-1">העלאת קבצים</h3>
        <p className="text-xs text-[#3b6b9c]">
          {uploadedRequired}/{requiredCount} קבצים חובה הועלו
        </p>
      </div>

      {fileTypes.map(ft => (
        <div key={ft.key} className={`sc-card p-4 ${ft.required && !uploaded.has(ft.key) ? 'border-[#8b6f47]' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-[#212121]">
              {ft.label} {ft.required && <span className="text-[#8b6f47]">*</span>}
            </span>
            {uploaded.has(ft.key) && <span className="text-[#4a8c5c] text-sm">✅ הועלה</span>}
          </div>
          <label className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${uploaded.has(ft.key) ? 'border-sc-success/30 bg-[#4a8c5c]/5' : 'border-[#eeeeee] hover:border-[#3b6b9c] hover:bg-[#ebf1f7]'}`}>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.dwg,.xlsx,.csv"
              onChange={e => { if (e.target.files?.[0]) handleUpload(ft.key, e.target.files[0]) }}
            />
            <span className="text-sm text-[#5a5a6e]">{uploaded.has(ft.key) ? 'החלף קובץ' : '📎 לחץ להעלאה'}</span>
          </label>
        </div>
      ))}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-colors
          ${canSubmit ? 'bg-[#4a8c5c] text-white hover:bg-[#4a8c5c]/90' : 'bg-sc-border text-[#5a5a6e] cursor-not-allowed'}`}
      >
        {isSubmitting ? 'מגיש...' : '✅ הגש בדיקה'}
      </button>

      {!canSubmit && (
        <p className="text-center text-xs text-[#5a5a6e]">יש להעלות את כל הקבצים החובה לפני הגשה</p>
      )}
    </div>
  )
}

// ── UI Components ─────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sc-card p-4">
      <h3 className="font-semibold text-[#212121] text-sm mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder }: {
  label: string; value: any; onChange: (v: string) => void;
  type?: string; textarea?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      {textarea ? (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className="sc-input resize-none" />
      ) : (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="sc-input" />
      )}
    </PageLayout>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#212121]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-[#3b6b9c]' : 'bg-sc-border'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? 'translate-x-6' : ''}`} />
      </button>
    </PageLayout>
  )
}
