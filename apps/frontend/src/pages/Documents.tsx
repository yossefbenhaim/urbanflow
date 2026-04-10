import PageLayout from '../components/PageLayout'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'

interface StageDoc {
  id: string
  title: string
  summary: string
  type: 'SIGN_REQUIRED' | 'INFO_ONLY'
}

interface Stage {
  key: string
  label: string
  icon: string
  docs: StageDoc[]
}

const STAGES: Stage[] = [
  {
    key: 'INITIAL', label: 'התארגנות', icon: '📋',
    docs: [
      { id: 'join_form', title: 'אישור הצטרפות לפרויקט', summary: 'טופס הצטרפות רשמי לפרויקט הפינוי-בינוי', type: 'SIGN_REQUIRED' },
      { id: 'tenant_survey', title: 'שאלון פרטי דייר', summary: 'מילוי פרטים אישיים ומידע על הדירה הקיימת', type: 'SIGN_REQUIRED' },
      { id: 'tenant_declaration', title: 'הצהרת דייר', summary: 'הצהרה על זכויות, מצב הדירה ונתונים אישיים', type: 'SIGN_REQUIRED' },
      { id: 'info_receipt', title: 'אישור קבלת מידע', summary: 'אישור שקיבלת וקראת את כל מסמכי הפרויקט', type: 'SIGN_REQUIRED' },
      { id: 'ownership_docs', title: 'מסמכי בעלות (נסח טאבו)', summary: 'העלאת נסח טאבו או אישור זכויות להוכחת בעלות', type: 'INFO_ONLY' },
      { id: 'rights_verification', title: 'אישור בדיקת זכויות', summary: 'בדיקת זכויות רשומות בנכס ואימות בעלות', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'REPRESENTATION', label: 'בחירת נציגות', icon: '🏛️',
    docs: [
      { id: 'election_form', title: 'טופס בחירת נציגות', summary: 'בחירת נציגי הדיירים שינהלו את המו"מ עם היזם', type: 'SIGN_REQUIRED' },
      { id: 'power_of_attorney', title: 'ייפוי כוח לעורך דין', summary: 'הסמכת עורך הדין לפעול בשמך מול היזם והרשויות', type: 'SIGN_REQUIRED' },
    ],
  },
  {
    key: 'NEGOTIATION', label: 'משא ומתן', icon: '🤝',
    docs: [
      { id: 'disclosure_letter', title: 'מכתב גילוי נאות', summary: 'הצהרת היזם על מצבו הפיננסי, ניסיונו וכשירותו', type: 'INFO_ONLY' },
      { id: 'meeting_summary', title: 'סיכומי פגישות מו"מ', summary: 'תיעוד הפגישות וההסכמות שהושגו עם היזם', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'AGREEMENT', label: 'הסכם', icon: '📝',
    docs: [
      { id: 'agreement_principles', title: 'הסכם עקרונות', summary: 'הסכמה על עקרונות הפרויקט — שטחים, תמורות, לוח זמנים', type: 'SIGN_REQUIRED' },
      { id: 'conditions_appendix', title: 'נספח תנאים', summary: 'תנאים מתלים, מפרט טכני ותנאים מיוחדים', type: 'SIGN_REQUIRED' },
    ],
  },
  {
    key: 'SIGNATURES', label: 'חתימות', icon: '✍️',
    docs: [
      { id: 'final_agreement', title: 'הסכם מפורט סופי', summary: 'ההסכם המלא והמחייב בין הדיירים ליזם', type: 'SIGN_REQUIRED' },
      { id: 'tenant_signatures', title: 'אישור חתימות דיירים', summary: 'מעקב אחר חתימות כלל הדיירים בבניין', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'PLANNING', label: 'תכנון', icon: '📐',
    docs: [
      { id: 'arch_plans', title: 'תוכניות אדריכליות', summary: 'תוכניות הבניין החדש וחלוקת הדירות', type: 'INFO_ONLY' },
      { id: 'appraisal_report', title: 'דו"ח שמאי', summary: 'הערכת שווי הנכסים הקיימים והחדשים', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'PERMIT', label: 'היתר', icon: '🏗️',
    docs: [
      { id: 'building_permit', title: 'היתר בנייה', summary: 'אישור הוועדה המקומית לתחילת עבודות הבנייה', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'EVACUATION', label: 'פינוי', icon: '🚚',
    docs: [
      { id: 'alt_housing', title: 'הסכם דיור חלופי', summary: 'פרטי הדירה החלופית, שכ"ד ותנאי הפינוי', type: 'SIGN_REQUIRED' },
      { id: 'evac_protocol', title: 'פרוטוקול פינוי', summary: 'תיעוד מצב הדירה הקיימת לפני הפינוי', type: 'SIGN_REQUIRED' },
    ],
  },
  {
    key: 'CONSTRUCTION', label: 'בנייה', icon: '🏢',
    docs: [
      { id: 'progress_reports', title: 'דו"חות התקדמות', summary: 'עדכונים שוטפים על מצב הבנייה', type: 'INFO_ONLY' },
      { id: 'quality_checks', title: 'בדיקות איכות', summary: 'תוצאות בדיקות איכות ובטיחות באתר', type: 'INFO_ONLY' },
    ],
  },
  {
    key: 'DELIVERY', label: 'מסירה', icon: '🔑',
    docs: [
      { id: 'delivery_protocol', title: 'פרוטוקול מסירה', summary: 'בדיקת הדירה החדשה ותיעוד ליקויים', type: 'SIGN_REQUIRED' },
      { id: 'form4', title: 'תעודת גמר (טופס 4)', summary: 'אישור אכלוס מטעם הרשות המקומית', type: 'INFO_ONLY' },
    ],
  },
]

// ── Upload Modal for a specific doc ──────────────────────────
function DocUploadModal({ docId, docTitle, onClose, onSuccess }: {
  docId: string; docTitle: string; onClose: () => void; onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveMutation = trpc.tenant.saveTenantDocument.useMutation({
    onSuccess: () => {
      toast.success('המסמך הועלה בהצלחה!')
      onSuccess()
      onClose()
    },
  })

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error('הקובץ גדול מ-10MB'); return }
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const token = localStorage.getItem('sb-token')
      if (!token) throw new Error('אינך מחובר')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const storagePath = `tenants/signed_forms/${docId}/${Date.now()}-${safeName}`

      const uploadRes = await fetch(`/api/upload?path=${encodeURIComponent(storagePath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}))
        throw new Error(errJson.error || `שגיאה ${uploadRes.status}`)
      }

      const fileUrl = `https://supabase.byclick.co.il/storage/v1/object/public/documents/${storagePath}`
      await saveMutation.mutateAsync({
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category: 'signed_forms',
        description: docTitle,
        storagePath,
        linkedDocId: docId,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהעלאה')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e3a5f]">העלאת מסמך חתום</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f1f5f9] text-[#64748b] text-xl">x</button>
        </div>
        <div className="p-5 space-y-4" dir="rtl">
          <p className="text-sm text-[#64748b]">העלה את המסמך <strong>"{docTitle}"</strong> חתום</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver ? 'border-[#3b6b9c] bg-[#ebf1f7]' : file ? 'border-green-300 bg-green-50' : 'border-[#d1d5db] hover:border-[#3b6b9c]'
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
            {file ? (
              <div>
                <span className="text-2xl">✅</span>
                <p className="text-sm font-semibold text-[#1e3a5f] mt-2">{file.name}</p>
                <p className="text-xs text-[#64748b]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <span className="text-3xl">📁</span>
                <p className="text-sm text-[#64748b] mt-2">גרור קובץ או לחץ לבחירה</p>
                <p className="text-xs text-[#94a3b8] mt-1">PDF, Word, תמונות (עד 10MB)</p>
              </div>
            )}
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 bg-gradient-to-l from-[#1e3a5f] to-[#3b6b9c]"
          >
            {uploading ? 'מעלה...' : 'העלה מסמך'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Doc Card ─────────────────────────────────────────────────
function DocCard({ doc, isSigned, uploadedFile }: {
  doc: StageDoc
  isSigned: boolean
  uploadedFile?: { file_url: string; file_name: string }
}) {
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const utils = trpc.useUtils()
  const isSign = doc.type === 'SIGN_REQUIRED'
  const isDone = isSigned || !!uploadedFile

  return (
    <>
      <div className={`rounded-xl border p-3.5 transition-all ${
        isDone ? 'bg-[#f0faf2] border-[#4a8c5c]/30' : 'bg-white border-[#e2e8f0]'
      }`}>
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
            isDone ? 'bg-[#4a8c5c] text-white' :
            isSign ? 'bg-[#1e3a5f] text-white' : 'bg-[#ebf1f7] text-[#3b6b9c]'
          }`}>
            {isDone ? '✅' : isSign ? '✍️' : '📄'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm ${isDone ? 'text-[#4a8c5c]' : 'text-[#1e3a5f]'}`}>
              {doc.title}
            </h4>
            <p className="text-xs text-[#64748b] mt-0.5 truncate">{doc.summary}</p>
            {isDone && (
              <p className="text-[10px] text-[#4a8c5c] font-semibold mt-1">
                {isSigned ? 'נחתם דיגיטלית' : `הועלה: ${uploadedFile?.file_name}`}
              </p>
            )}
          </div>

          {/* Badge */}
          <div className="flex-shrink-0">
            {isDone ? (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-[#edf5ef] text-[#4a8c5c]">הושלם</span>
            ) : (
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                isSign ? 'bg-[#1e3a5f] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
              }`}>
                {isSign ? 'לחתימה' : 'לעיון'}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isDone && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[#e2e8f0]">
            <button
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#1a3350] transition-colors border-none cursor-pointer"
            >
              {isSign ? '✍️ קרא וחתום' : '📄 צפה במסמך'}
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#3b6b9c] bg-[#ebf1f7] hover:bg-[#dce6f0] transition-colors border-none cursor-pointer"
            >
              📁 העלה חתום
            </button>
          </div>
        )}

        {/* If done, show view/download */}
        {isDone && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[#4a8c5c]/20">
            <button
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#4a8c5c] bg-[#edf5ef] hover:bg-[#dceee0] transition-colors border-none cursor-pointer"
            >
              📄 צפה במסמך
            </button>
            {uploadedFile && (
              <a
                href={uploadedFile.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#3b6b9c] bg-[#ebf1f7] hover:bg-[#dce6f0] transition-colors no-underline"
              >
                ⬇️ הורד קובץ
              </a>
            )}
          </div>
        )}
      </div>

      {showUpload && (
        <DocUploadModal
          docId={doc.id}
          docTitle={doc.title}
          onClose={() => setShowUpload(false)}
          onSuccess={() => utils.tenant.getDocumentStatuses.invalidate()}
        />
      )}
    </>
  )
}

// ── Stage Section ────────────────────────────────────────────
function StageSection({ stage, index, signedSlugs, uploadedMap }: {
  stage: Stage; index: number
  signedSlugs: Set<string>
  uploadedMap: Record<string, { file_url: string; file_name: string }>
}) {
  const [open, setOpen] = useState(index === 0)
  const completedCount = stage.docs.filter(d => signedSlugs.has(d.id) || uploadedMap[d.id]).length

  return (
    <div className="rounded-2xl border border-[#e2e8f0] overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-right bg-gradient-to-l from-[#1e3a5f] to-[#2d5a8c] text-white hover:from-[#1a3350] hover:to-[#28507a] transition-all"
      >
        <span className="text-xl">{stage.icon}</span>
        <div className="flex-1 text-right">
          <span className="font-bold text-sm">{stage.label}</span>
          <span className="text-[11px] text-white/60 mr-2">({stage.docs.length} מסמכים)</span>
        </div>
        {completedCount > 0 && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            completedCount === stage.docs.length ? 'bg-[#4a8c5c] text-white' : 'bg-white/20 text-white'
          }`}>
            {completedCount === stage.docs.length ? '✅ הושלם' : `${completedCount}/${stage.docs.length}`}
          </span>
        )}
        <span className="bg-white/15 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          שלב {index + 1}
        </span>
        <span className="text-white/70 text-xs mr-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-[#fafbfc]">
          {stage.docs.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              isSigned={signedSlugs.has(doc.id)}
              uploadedFile={uploadedMap[doc.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function Documents() {
  const { data: statuses } = trpc.tenant.getDocumentStatuses.useQuery()
  const signedSlugs = new Set(statuses?.signedSlugs ?? [])
  const uploadedMap = statuses?.uploadedMap ?? {}

  const totalDocs = STAGES.reduce((sum, s) => sum + s.docs.length, 0)
  const completedDocs = STAGES.reduce((sum, s) =>
    sum + s.docs.filter(d => signedSlugs.has(d.id) || uploadedMap[d.id]).length, 0
  )

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#3b6b9c] flex items-center justify-center text-xl text-white shadow-md">
            📄
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f]">מסמכי הפרויקט</h1>
            <p className="text-sm text-[#64748b]">
              {completedDocs}/{totalDocs} מסמכים הושלמו
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {completedDocs > 0 && (
          <div className="mb-5 bg-[#ebf1f7] rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#4a8c5c] to-[#6ab07a] rounded-full transition-all duration-500"
              style={{ width: `${(completedDocs / totalDocs) * 100}%` }}
            />
          </div>
        )}

        <div className="space-y-4">
          {STAGES.map((stage, i) => (
            <StageSection
              key={stage.key}
              stage={stage}
              index={i}
              signedSlugs={signedSlugs}
              uploadedMap={uploadedMap}
            />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
