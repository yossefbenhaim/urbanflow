import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import PageLayout from '../components/PageLayout'

// ── Types ────────────────────────────────────────────────────────────────────
type DocCategory = 'signed_forms' | 'ownership' | 'personal' | 'correspondence' | 'contracts' | 'other'

interface TenantDoc {
  id: string
  file_url: string
  file_name: string
  file_size?: number
  mime_type?: string
  category: DocCategory
  description?: string
  storage_path: string
  created_at: string
}

const CATEGORIES: { key: DocCategory; label: string; icon: string; desc: string }[] = [
  { key: 'signed_forms', label: 'טפסים חתומים', icon: '✍️', desc: 'טפסים שחתמת עליהם' },
  { key: 'ownership', label: 'מסמכי בעלות', icon: '🏠', desc: 'טאבו, חוזה רכישה, אישור זכויות' },
  { key: 'personal', label: 'מסמכים אישיים', icon: '👤', desc: 'תעודת זהות, תעודות, אישורים' },
  { key: 'correspondence', label: 'התכתבויות', icon: '✉️', desc: 'מכתבים, אישורים, דואר' },
  { key: 'contracts', label: 'חוזים', icon: '📝', desc: 'חוזי שכירות, רכישה, שירות' },
  { key: 'other', label: 'אחר', icon: '📎', desc: 'מסמכים נוספים' },
]

function getCategoryInfo(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[5]
}

function formatFileSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocCategory>('other')
  const [description, setDescription] = useState('')
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
    if (f.size > 10 * 1024 * 1024) {
      toast.error('הקובץ גדול מ-10MB')
      return
    }
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const token = localStorage.getItem('sb-token')
      if (!token) throw new Error('אינך מחובר')

      const ext = file.name.split('.').pop() || 'bin'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const storagePath = `tenants/${category}/${Date.now()}-${safeName}`

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
        category,
        description: description || undefined,
        storagePath,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהעלאה')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl border-b border-[#eeeeee] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1e3a5f]">העלאת מסמך</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f1f5f9] text-[#64748b] text-xl">x</button>
        </div>

        <div className="p-5 space-y-4" dir="rtl">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver ? 'border-[#3b6b9c] bg-[#ebf1f7]' : file ? 'border-green-300 bg-green-50' : 'border-[#d1d5db] hover:border-[#3b6b9c] hover:bg-[#f8fafc]'
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv" />
            {file ? (
              <div>
                <span className="text-2xl">✅</span>
                <p className="text-sm font-semibold text-[#1e3a5f] mt-2">{file.name}</p>
                <p className="text-xs text-[#64748b]">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <span className="text-3xl">📁</span>
                <p className="text-sm text-[#64748b] mt-2">גרור קובץ לכאן או לחץ לבחירה</p>
                <p className="text-xs text-[#94a3b8] mt-1">PDF, Word, Excel, תמונות (עד 10MB)</p>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-2">קטגוריה</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all text-sm ${
                    category === cat.key
                      ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#1e3a5f] font-semibold'
                      : 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#3b6b9c]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="text-xs">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#1e3a5f] mb-1">תיאור (אופציונלי)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#3b6b9c]"
              rows={2}
              placeholder="תיאור קצר של המסמך..."
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 bg-gradient-to-l from-[#1e3a5f] to-[#3b6b9c] hover:from-[#1a3350] hover:to-[#28507a]"
          >
            {uploading ? 'מעלה...' : 'העלה מסמך'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Document Card ────────────────────────────────────────────────────────────
function DocCard({ doc, onDelete }: { doc: TenantDoc; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cat = getCategoryInfo(doc.category)

  const getFileIcon = () => {
    const mt = doc.mime_type || ''
    if (mt.includes('pdf')) return '📕'
    if (mt.includes('image')) return '🖼️'
    if (mt.includes('word') || mt.includes('document')) return '📘'
    if (mt.includes('sheet') || mt.includes('excel')) return '📗'
    return '📄'
  }

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-3.5 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#ebf1f7] flex items-center justify-center text-lg flex-shrink-0">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[#1e3a5f] text-sm truncate">{doc.file_name}</h4>
          {doc.description && <p className="text-xs text-[#64748b] mt-0.5 truncate">{doc.description}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebf1f7] text-[#3b6b9c] font-medium">
              {cat.icon} {cat.label}
            </span>
            {doc.file_size && (
              <span className="text-[10px] text-[#94a3b8]">{formatFileSize(doc.file_size)}</span>
            )}
            <span className="text-[10px] text-[#94a3b8]">{formatDate(doc.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-[#ebf1f7] flex items-center justify-center text-sm hover:bg-[#dce6f0] transition-colors no-underline"
            title="הורד"
          >
            ⬇️
          </a>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm hover:bg-red-200 transition-colors border-none cursor-pointer"
                title="אישור מחיקה"
              >
                ✓
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-sm hover:bg-[#e2e8f0] transition-colors border-none cursor-pointer"
                title="ביטול"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-sm hover:bg-red-50 transition-colors border-none cursor-pointer"
              title="מחק"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TenantDocuments() {
  const [showUpload, setShowUpload] = useState(false)
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all')

  const { data: docs = [], refetch, isLoading } = trpc.tenant.getTenantDocuments.useQuery(
    activeCategory === 'all' ? undefined : { category: activeCategory }
  )
  const { data: stats } = trpc.tenant.getTenantDocumentStats.useQuery()
  const deleteMutation = trpc.tenant.deleteTenantDocument.useMutation({
    onSuccess: () => { toast.success('המסמך נמחק'); refetch() },
    onError: (err) => toast.error(err.message),
  })

  const filteredDocs = docs as TenantDoc[]

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#3b6b9c] flex items-center justify-center text-xl text-white shadow-md">
              📁
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">המסמכים שלי</h1>
              <p className="text-sm text-[#64748b]">
                {stats?.total ?? 0} מסמכים
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-l from-[#1e3a5f] to-[#3b6b9c] hover:from-[#1a3350] hover:to-[#28507a] transition-all border-none cursor-pointer shadow-sm"
          >
            <span>+</span>
            <span>העלאה</span>
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#3b6b9c]'
            }`}
          >
            הכל ({stats?.total ?? 0})
          </button>
          {CATEGORIES.map(cat => {
            const count = stats?.byCategory?.[cat.key] ?? 0
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  activeCategory === cat.key
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#3b6b9c]'
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Documents list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#e2e8f0] p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e2e8f0]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#e2e8f0] rounded w-2/3" />
                    <div className="h-3 bg-[#f1f5f9] rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📂</span>
            <h3 className="text-[#1e3a5f] font-bold text-lg">
              {activeCategory === 'all' ? 'אין מסמכים עדיין' : `אין מסמכים בקטגוריה "${getCategoryInfo(activeCategory).label}"`}
            </h3>
            <p className="text-[#64748b] text-sm mt-1">לחץ על "העלאה" כדי להוסיף מסמך</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                onDelete={() => deleteMutation.mutate({ documentId: doc.id })}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </PageLayout>
  )
}
