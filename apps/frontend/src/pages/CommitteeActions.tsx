import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'

// ── Types ──────────────────────────────────────────────────────────────────────
type ModalType = 'poll' | 'document' | 'broadcast' | 'meeting' | 'signature' | 'invite' | null

// ── Bottom Sheet ───────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl border-b border-[#eeeeee] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#212121]">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sc-border text-[#5a5a6e] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Poll Wizard ────────────────────────────────────────────────────────────────
function PollWizard({ groupId, onSuccess }: { groupId: string; onSuccess: () => void }) {
  const [step, setStep] = useState(1)
  const [question, setQuestion] = useState('')
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [options, setOptions] = useState(['', ''])
  const [closeAt, setCloseAt] = useState('')
  const [thresholdPct, setThresholdPct] = useState(60)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createPoll = trpc.committee.createPoll.useMutation({ onSuccess })

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (question.trim().length < 5) e.question = 'השאלה חייבת להכיל לפחות 5 תווים'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    const filled = options.filter(o => o.trim())
    if (filled.length < 2) e.options = 'חייבים לפחות 2 אפשרויות'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    const filled = options.filter(o => o.trim())
    createPoll.mutate({ question, options: filled, isAnonymous, pollType, closeAt: closeAt || undefined, thresholdPct, groupId })
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s <= step ? 'bg-[#3b6b9c] text-white' : 'bg-sc-border text-[#5a5a6e]'}`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-0.5 w-8 ${s < step ? 'bg-[#3b6b9c]' : 'bg-sc-border'}`} />}
          </div>
        ))}
        <span className="text-sm text-[#5a5a6e] mr-auto">שלב {step} מתוך 3</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">שאלת הסקר *</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className={`sc-input resize-none h-24 ${errors.question ? 'border-sc-error' : ''}`}
              placeholder="מה ברצונכם לשאול את הדיירים?"
            />
            {errors.question && <p className="text-red-500 text-xs mt-1">{errors.question}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">סוג הסקר</label>
            <div className="flex gap-2">
              {[{ v: 'single', l: '⚪ בחירה יחידה' }, { v: 'multiple', l: '☑️ ריבוי בחירות' }].map(({ v, l }) => (
                <button key={v} onClick={() => setPollType(v as any)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors active:scale-95 ${pollType === v ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] text-[#5a5a6e]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#f8f9fa] rounded-xl p-3">
            <span className="text-sm font-medium text-[#212121]">🔒 סקר אנונימי</span>
            <div
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-11 h-6 rounded-xl cursor-pointer flex-shrink-0 relative transition-colors ${isAnonymous ? 'bg-[#3b6b9c]' : 'bg-sc-border'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isAnonymous ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
          </div>
          <button onClick={() => validateStep1() && setStep(2)}
            className="sc-btn-primary w-full active:scale-95 transition-transform">
            המשך →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-[#212121]">אפשרויות תשובה</h3>
          {errors.options && <p className="text-red-500 text-sm">{errors.options}</p>}
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o) }}
                className="sc-input flex-1"
                placeholder={`אפשרות ${i + 1}`}
              />
              {options.length > 2 && (
                <button onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-xl">✕</button>
              )}
            </div>
          ))}
          <button onClick={() => setOptions([...options, ''])}
            className="w-full border-2 border-dashed border-[#eeeeee] rounded-xl py-2 text-sm text-[#5a5a6e] hover:border-[#3b6b9c] hover:text-[#3b6b9c] transition-colors">
            + הוסף אפשרות
          </button>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="sc-btn-secondary flex-1 active:scale-95">← חזרה</button>
            <button onClick={() => validateStep2() && setStep(3)} className="sc-btn-primary flex-1 active:scale-95">המשך →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-1">תאריך סגירה (אופציונלי)</label>
            <input type="date" value={closeAt} onChange={e => setCloseAt(e.target.value)}
              className="sc-input" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-[#212121]">רף רוב</span>
              <span className="font-bold text-[#3b6b9c]">{thresholdPct}%</span>
            </div>
            <input type="range" min={50} max={90} value={thresholdPct} onChange={e => setThresholdPct(Number(e.target.value))}
              className="w-full accent-sc-primary" />
            <div className="flex justify-between text-xs text-[#5a5a6e] mt-1"><span>50%</span><span>90%</span></div>
          </div>

          {/* Preview */}
          <div className="bg-[#ebf1f7] rounded-xl p-4 border border-[#3b6b9c]-light">
            <p className="text-xs font-semibold text-[#3b6b9c] mb-2 uppercase tracking-wide">תצוגה מקדימה</p>
            <p className="font-semibold text-[#212121] text-sm mb-2">{question || '(שאלה)'}</p>
            <div className="space-y-1">
              {options.filter(o => o.trim()).map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#5a5a6e]">
                  <div className={`w-4 h-4 rounded-${pollType === 'single' ? 'full' : 'sm'} border-2 border-[#3b6b9c]`} />
                  {o}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2 text-xs text-[#5a5a6e]">
              <span>{isAnonymous ? '🔒 אנונימי' : '👁 גלוי'}</span>
              <span>•</span>
              <span>רף: {thresholdPct}%</span>
              {closeAt && <><span>•</span><span>נסגר: {closeAt}</span></>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="sc-btn-secondary flex-1 active:scale-95">← חזרה</button>
            <button onClick={handleSubmit} disabled={createPoll.isPending}
              className="sc-btn-primary flex-1 active:scale-95 disabled:opacity-60">
              {createPoll.isPending ? 'מפרסם...' : '📊 פרסם לקבוצה'}
            </button>
          </div>
          {createPoll.error && <p className="text-red-500 text-sm text-center">{createPoll.error.message}</p>}
        </div>
      )}
    </div>
  )
}

// ── Document Upload ────────────────────────────────────────────────────────────
function DocumentUpload({ buildingId, groupId, onSuccess }: { buildingId: string; groupId?: string; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [docType, setDocType] = useState<'contract' | 'protocol' | 'letter' | 'other'>('other')
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [shareToGroup, setShareToGroup] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const uploadDoc = trpc.committee.uploadDocument.useMutation({ onSuccess })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'שם המסמך חובה'
    if (!file) e.file = 'יש לבחור קובץ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !file) return
    setUploading(true)
    try {
      // Sanitize filename: remove Hebrew/spaces, keep extension
      const ext = file.name.split('.').pop() || 'bin'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const path = `${buildingId}/${Date.now()}-${safeName}`
      const token = localStorage.getItem('sb-token')
      if (!token) throw new Error('אינך מחובר — נסה להתנתק ולהתחבר מחדש')
      const uploadRes = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}))
        throw new Error('העלאת הקובץ נכשלה: ' + (errJson.error || uploadRes.status))
      }
      const fileUrl = `https://supabase.byclick.co.il/storage/v1/object/public/documents/${path}`
      await uploadDoc.mutateAsync({ name, docType, fileUrl, description: description || undefined, shareToGroup, buildingId, groupId: groupId || undefined })
    } catch (err: any) {
      setErrors({ submit: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">שם המסמך *</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className={`sc-input ${errors.name ? 'border-sc-error' : ''}`}
          placeholder="לדוגמה: חוזה שירות 2024" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">סוג המסמך</label>
        <select value={docType} onChange={e => setDocType(e.target.value as any)}
          className="sc-input">
          <option value="contract">📜 חוזה</option>
          <option value="protocol">📋 פרוטוקול</option>
          <option value="letter">✉️ מכתב</option>
          <option value="other">📄 אחר</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">קובץ (PDF / תמונה, עד 10MB) *</label>
        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${errors.file ? 'border-sc-error' : 'border-[#eeeeee] hover:border-[#3b6b9c]'}`}>
          <span className="text-2xl mb-1">📎</span>
          <span className="text-sm text-[#5a5a6e]">{file ? file.name : 'לחץ לבחירת קובץ'}</span>
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">תיאור (אופציונלי)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          className="sc-input resize-none h-16"
          placeholder="תיאור קצר של המסמך..." />
      </div>
      {groupId && (
        <label className="flex items-center gap-3 bg-[#8b6f47]/10 rounded-xl px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={shareToGroup} onChange={e => setShareToGroup(e.target.checked)} className="w-4 h-4 accent-sc-gold-dark" />
          <span className="text-sm font-medium text-[#212121]">📢 שתף עם כל הדיירים בקבוצה</span>
        </label>
      )}
      {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
      <button onClick={handleSubmit} disabled={uploading}
        className="sc-btn-primary w-full active:scale-95 disabled:opacity-60 transition-transform">
        {uploading ? 'מעלה...' : '📄 העלה מסמך'}
      </button>
    </div>
  )
}

// ── Broadcast ─────────────────────────────────────────────────────────────────
function BroadcastForm({ buildingId, groupId, onSuccess }: { buildingId: string; groupId?: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [target, setTarget] = useState<'all' | 'group'>('all')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sendBroadcast = trpc.committee.sendBroadcast.useMutation({ onSuccess })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'כותרת חובה'
    if (content.trim().length < 5) e.content = 'תוכן חייב להכיל לפחות 5 תווים'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">כותרת *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className={`sc-input ${errors.title ? 'border-sc-error' : ''}`}
          placeholder="נושא ההודעה" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">תוכן *</label>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className={`sc-input resize-none h-28 ${errors.content ? 'border-sc-error' : ''}`}
          placeholder="תוכן ההודעה לדיירים..." />
        {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-2">עדיפות</label>
        <div className="flex gap-2">
          <button onClick={() => setPriority('normal')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium active:scale-95 transition-colors ${priority === 'normal' ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] text-[#5a5a6e]'}`}>
            🔔 רגילה
          </button>
          <button onClick={() => setPriority('urgent')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium active:scale-95 transition-colors ${priority === 'urgent' ? 'border-sc-error bg-red-500/10 text-red-500' : 'border-[#eeeeee] text-[#5a5a6e]'}`}>
            🔴 דחוף
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-2">שלח ל</label>
        <div className="flex gap-2">
          <button onClick={() => setTarget('all')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium active:scale-95 transition-colors ${target === 'all' ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] text-[#5a5a6e]'}`}>
            🏢 כל הדיירים
          </button>
          <button onClick={() => setTarget('group')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium active:scale-95 transition-colors ${target === 'group' ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] text-[#5a5a6e]'}`}>
            👥 חברי הקבוצה
          </button>
        </div>
      </div>
      <button onClick={() => { if (validate()) sendBroadcast.mutate({ title, content, priority, target, buildingId, groupId }) }}
        disabled={sendBroadcast.isPending}
        className="sc-btn-primary w-full active:scale-95 disabled:opacity-60 transition-transform">
        {sendBroadcast.isPending ? 'שולח...' : '📢 שלח הודעה'}
      </button>
      {sendBroadcast.error && <p className="text-red-500 text-sm text-center">{sendBroadcast.error.message}</p>}
    </div>
  )
}

// ── Meeting Scheduler ──────────────────────────────────────────────────────────
function MeetingForm({ buildingId, groupId, onSuccess }: { buildingId: string; groupId?: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('')
  const [notifyAll, setNotifyAll] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const scheduleMeeting = trpc.committee.scheduleMeeting.useMutation({ onSuccess })

  const validate = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 3) e.title = 'נושא חייב להכיל לפחות 3 תווים'
    if (!scheduledAt) e.scheduledAt = 'יש לבחור תאריך ושעה'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">נושא הישיבה *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className={`sc-input ${errors.title ? 'border-sc-error' : ''}`}
          placeholder="לדוגמה: ישיבת ועד חודש מרץ" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">תאריך ושעה *</label>
        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
          className={`sc-input ${errors.scheduledAt ? 'border-sc-error' : ''}`} />
        {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">מיקום</label>
        <input value={location} onChange={e => setLocation(e.target.value)}
          className="sc-input"
          placeholder="לדוגמה: לובי הבניין" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">סדר יום</label>
        <textarea value={agenda} onChange={e => setAgenda(e.target.value)}
          className="sc-input resize-none h-20"
          placeholder="נושאים לדיון..." />
      </div>
      <label className="flex items-center gap-3 bg-[#4a8c5c]/10 rounded-xl px-4 py-3 cursor-pointer">
        <input type="checkbox" checked={notifyAll} onChange={e => setNotifyAll(e.target.checked)} className="w-4 h-4 accent-sc-success" />
        <span className="text-sm font-medium text-[#212121]">📲 שתף בקבוצה + שלח התראה לכולם</span>
      </label>
      <button onClick={() => { if (validate()) scheduleMeeting.mutate({ title, scheduledAt, location: location || undefined, agenda: agenda || undefined, buildingId, groupId, notifyAll }) }}
        disabled={scheduleMeeting.isPending}
        className="sc-btn-primary w-full bg-[#4a8c5c] hover:bg-[#4a8c5c]/90 active:scale-95 disabled:opacity-60 transition-transform">
        {scheduleMeeting.isPending ? 'קובע...' : '📅 קבע ישיבה'}
      </button>
      {scheduleMeeting.error && <p className="text-red-500 text-sm text-center">{scheduleMeeting.error.message}</p>}
    </div>
  )
}

// ── Signature Request ──────────────────────────────────────────────────────────
function SignatureForm({ buildingId, groupId, onSuccess }: { buildingId: string; groupId?: string; onSuccess: () => void }) {
  const [documentId, setDocumentId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const docs = trpc.committee.getBuildingDocuments.useQuery()
  const tenants = trpc.committee.getBuildingTenants.useQuery()
  const requestSig = trpc.committee.requestSignatures.useMutation({ onSuccess })

  const allTenantIds = (tenants.data ?? []).map((t: any) => t.userId)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!documentId) e.doc = 'יש לבחור מסמך'
    if (selectedTenants.length === 0) e.tenants = 'יש לבחור לפחות דייר אחד'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const toggleTenant = (uid: string) =>
    setSelectedTenants(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">מסמך לחתימה *</label>
        {docs.isLoading ? <p className="text-sm text-[#5a5a6e]">טוען מסמכים...</p> : (
          <select value={documentId} onChange={e => setDocumentId(e.target.value)}
            className={`sc-input ${errors.doc ? 'border-sc-error' : ''}`}>
            <option value="">— בחר מסמך —</option>
            {(docs.data ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        )}
        {errors.doc && <p className="text-red-500 text-xs mt-1">{errors.doc}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#212121] mb-1">הסבר (אופציונלי)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          className="sc-input resize-none h-16"
          placeholder="למה צריכים לחתום?" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#212121]">דיירים לחתימה *</label>
          <button onClick={() => setSelectedTenants(selectedTenants.length === allTenantIds.length ? [] : allTenantIds)}
            className="text-xs text-[#3b6b9c] font-medium">
            {selectedTenants.length === allTenantIds.length ? 'בטל הכל' : 'בחר הכל'}
          </button>
        </div>
        {errors.tenants && <p className="text-red-500 text-xs mb-2">{errors.tenants}</p>}
        {tenants.isLoading ? <p className="text-sm text-[#5a5a6e]">טוען דיירים...</p> : (
          <div className="space-y-1 max-h-40 overflow-y-auto border border-[#eeeeee] rounded-xl p-2">
            {(tenants.data ?? []).map((t: any) => (
              <label key={t.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f8f9fa] cursor-pointer">
                <input type="checkbox" checked={selectedTenants.includes(t.userId)} onChange={() => toggleTenant(t.userId)} className="w-4 h-4 accent-sc-primary" />
                <span className="text-sm text-[#212121]">{t.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => { if (validate()) requestSig.mutate({ documentId, message: message || undefined, tenantIds: selectedTenants }) }}
        disabled={requestSig.isPending}
        className="sc-btn-primary w-full active:scale-95 disabled:opacity-60 transition-transform">
        {requestSig.isPending ? 'שולח...' : '✍️ שלח בקשת חתימה'}
      </button>
      {requestSig.error && <p className="text-red-500 text-sm text-center">{requestSig.error.message}</p>}
    </div>
  )
}

// ── Building Status ────────────────────────────────────────────────────────────
function BuildingStatus({ status }: { status: any }) {
  if (!status) return null
  const { building, tenants, documents, upcomingMeetings } = status
  const totalUnits = building?.total_units ?? 0
  const onboarded = (tenants ?? []).filter((t: any) => t.is_onboarded).length
  const progress = totalUnits > 0 ? Math.round((onboarded / totalUnits) * 100) : 0

  return (
    <div className="sc-card p-4 border-t-4 border-t-sc-primary mb-4">
      <h3 className="font-bold text-[#212121] mb-3 flex items-center gap-2">📈 סטטוס הבניין</h3>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#5a5a6e]">Onboarding דיירים</span>
          <span className="font-bold text-[#3b6b9c]">{onboarded}/{totalUnits}</span>
        </div>
        <div className="h-2.5 bg-sc-border rounded-full overflow-hidden">
          <div className="h-full bg-[#3b6b9c] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-[#5a5a6e] mt-1">{progress}% השלימו תהליך</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#f8f9fa] rounded-xl p-2 text-center shadow-sm">
          <p className="text-lg font-bold text-[#3b6b9c]">{tenants?.length ?? 0}</p>
          <p className="text-xs text-[#5a5a6e]">דיירים</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-2 text-center shadow-sm">
          <p className="text-lg font-bold text-[#8b6f47]">{documents?.length ?? 0}</p>
          <p className="text-xs text-[#5a5a6e]">מסמכים</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-2 text-center shadow-sm">
          <p className="text-lg font-bold text-[#4a8c5c]">{upcomingMeetings?.length ?? 0}</p>
          <p className="text-xs text-[#5a5a6e]">ישיבות קרובות</p>
        </div>
      </div>

      {/* Upcoming meetings */}
      {upcomingMeetings?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#5a5a6e] mb-1">📅 ישיבות קרובות</p>
          {upcomingMeetings.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 text-xs text-[#5a5a6e] py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8c5c] flex-shrink-0" />
              <span className="font-medium">{m.title || 'ישיבה'}</span>
              <span className="text-[#5a5a6e] mr-auto">{m.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent docs */}
      {documents?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#5a5a6e] mb-1">📄 מסמכים אחרונים</p>
          {documents.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 text-xs text-[#5a5a6e] py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b6f47] flex-shrink-0" />
              <span>{d.title}</span>
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-[#3b6b9c] mr-auto">צפה</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function InviteForm({ buildingId, senderName }: { buildingId: string; senderName?: string }) {
  const [contact, setContact] = useState('')
  const [type, setType] = useState<'phone' | 'email'>('phone')
  const appUrl = 'https://urbanflow.byclick.co.il'
  const phone = contact.replace(/[^0-9]/g, '').replace(/^0/, '972')
  const senderLine = senderName ? senderName + ' מזמין אותך' : 'אני מזמין אותך'
  const msgText = 'היי! 👋\n' + senderLine + ' להצטרף ל-Silver Castle — האפליקציה שלנו לניהול הפרויקט בבניין.\n\nכניסה / הרשמה: ' + appUrl + '\n\nנתראה שם! 🏢'

  const sendWhatsApp = () => window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msgText), '_blank')
  const sendSMS = () => window.open('sms:+' + phone + '&body=' + encodeURIComponent(msgText), '_blank')
  const sendEmail = () => {
    const subj = encodeURIComponent('הזמנה להצטרף ל-Silver Castle 🏢')
    window.open('mailto:' + contact + '?subject=' + subj + '&body=' + encodeURIComponent(msgText), '_blank')
  }
  const copyLink = () => { navigator.clipboard.writeText(appUrl); alert('הקישור הועתק! 📋') }

  return (
    <div className="space-y-5">
      <div className="flex rounded-xl overflow-hidden border border-[#eeeeee] text-sm font-medium">
        <button onClick={() => setType('phone')}
          className={`flex-1 py-2.5 transition-colors ${type === 'phone' ? 'bg-[#3b6b9c] text-white' : 'bg-white text-[#5a5a6e] hover:bg-[#f8f9fa]'}`}>
          📱 טלפון
        </button>
        <button onClick={() => setType('email')}
          className={`flex-1 py-2.5 transition-colors ${type === 'email' ? 'bg-[#3b6b9c] text-white' : 'bg-white text-[#5a5a6e] hover:bg-[#f8f9fa]'}`}>
          ✉️ מייל
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[#212121]">
            {type === 'phone' ? 'מספר טלפון' : 'כתובת מייל'}
          </label>
          {type === 'phone' && 'contacts' in navigator && (
            <button
              onClick={async () => {
                try {
                  const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false })
                  if (contacts && contacts.length > 0 && contacts[0].tel?.length > 0) {
                    setContact(contacts[0].tel[0])
                  }
                } catch {}
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#3b6b9c] bg-[#ebf1f7] hover:bg-[#ebf1f7]/70 px-3 py-1.5 rounded-lg transition-colors"
            >
              📇 בחר מאנשי קשר
            </button>
          )}
        </div>
        <input
          type={type === 'phone' ? 'tel' : 'email'}
          placeholder={type === 'phone' ? '050-000-0000' : 'name@example.com'}
          value={contact}
          onChange={e => setContact(e.target.value)}
          className="sc-input text-right"
          dir="ltr"
        />
      </div>

      <div className="bg-[#ebf1f7] rounded-2xl p-4 border border-[#3b6b9c]-light">
        <p className="text-xs text-[#3b6b9c] font-semibold mb-2">תצוגה מקדימה:</p>
        <p className="text-sm text-[#212121] leading-relaxed whitespace-pre-line">{msgText}</p>
      </div>

      <div className="space-y-3">
        {type === 'phone' ? (
          <>
            <button onClick={sendWhatsApp} disabled={phone.length < 10}
              className="sc-btn-primary w-full flex items-center justify-center gap-3 bg-[#4a8c5c] hover:bg-[#4a8c5c]/90 disabled:opacity-40 text-sm">
              <span className="text-lg">📱</span> שלח דרך WhatsApp
            </button>
            <button onClick={sendSMS} disabled={phone.length < 10}
              className="sc-btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-40 text-sm">
              <span className="text-lg">💬</span> שלח דרך SMS
            </button>
          </>
        ) : (
          <button onClick={sendEmail} disabled={!contact.includes('@')}
            className="sc-btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-40 text-sm">
            <span className="text-lg">✉️</span> שלח דרך מייל
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-sc-border" />
        <span className="text-xs text-[#5a5a6e]">או</span>
        <div className="flex-1 h-px bg-sc-border" />
      </div>
      <button onClick={copyLink}
        className="sc-btn-secondary w-full flex items-center justify-center gap-2 text-sm">
        🔗 העתק קישור לאפליקציה
      </button>
    </div>
  )
}

export default function CommitteeActions() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<ModalType>(null)
  const [success, setSuccess] = useState('')

  const { data: profile, isLoading } = trpc.auth.me.useQuery()
  const isRep = (profile as any)?.isBuildingRepresentative

  const statusQuery = trpc.committee.getBuildingStatus.useQuery(undefined, { enabled: !!isRep })
  const groupQuery = trpc.committee.getMyBuildingGroup.useQuery(undefined, { enabled: !!isRep })
  const { data: myRole } = trpc.tenant.getMyRole.useQuery(undefined, { enabled: !!isRep })

  const building = statusQuery.data?.building
  const buildingId = building?.id ?? ''
  const groupId = groupQuery.data?.id

  const handleSuccess = (msg: string) => {
    setModal(null)
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
    statusQuery.refetch()
  }


  if (!isRep) return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">🔒</span>
      <h1 className="text-xl font-bold text-[#212121]">גישה מוגבלת</h1>
      <p className="text-[#5a5a6e]">דף זה מיועד לנציגי ועד בניין בלבד</p>
      <button onClick={() => navigate('/dashboard')} className="sc-btn-primary mt-2">חזרה לדף הבית</button>
    </div>
  )

  const actions = [
    {
      id: 'poll' as ModalType, icon: '📊', title: 'פתיחת סקר',
      desc: 'שאל את הדיירים שאלה והצבע על החלטות',
    },
    {
      id: 'document' as ModalType, icon: '📄', title: 'העלאת מסמך',
      desc: 'שתף חוזים, פרוטוקולים ומכתבים',
    },
    {
      id: 'broadcast' as ModalType, icon: '📢', title: 'הודעה לדיירים',
      desc: 'שלח הודעה לכל הדיירים בבניין',
    },
    {
      id: 'meeting' as ModalType, icon: '📅', title: 'קביעת ישיבה',
      desc: 'תאם ישיבת ועד ושלח הזמנות',
    },
    {
      id: 'signature' as ModalType, icon: '✍️', title: 'בקשת חתימה',
      desc: 'בקש חתימות על מסמכים חשובים',
    },
    {
      id: 'invite' as ModalType, icon: '🔗', title: 'הזמן דייר',
      desc: 'שלח קישור הצטרפות לדייר דרך WhatsApp, SMS או מייל',
    },
  ]

  const modalTitles: Record<string, string> = {
    poll: '📊 פתיחת סקר', document: '📄 העלאת מסמך',
    broadcast: '📢 הודעה לדיירים', meeting: '📅 קביעת ישיבה', signature: '✍️ בקשת חתימה', invite: '🔗 הזמן דייר',
  }

  return (
    <PageLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="mb-5">
          <PageTitle>פעולות ועד</PageTitle>
          {building && (
            <p className="text-[#5a5a6e] text-[13px] mt-0.5">נציג ועד בניין — {building.address || `${building.street} ${building.number}`}</p>
          )}
        </div>

        {/* Success toast */}
        {success && (
          <div className="mb-4 bg-[#4a8c5c] text-white rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
            ✅ {success}
          </div>
        )}

        {/* Building Status */}
        <BuildingStatus status={statusQuery.data} />

        {/* Action cards */}
        <h2 className="text-[16px] font-bold text-[#212121] mb-3">פעולות מהירות</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {actions.map((action, i) => (
            <button
              key={action.id}
              onClick={() => setModal(action.id)}
              className={`sc-card p-4 text-right active:scale-95 transition-transform hover:bg-[#ebf1f7] ${i === 4 ? 'col-span-2' : ''}`}
            >
              <div className="inline-flex w-12 h-12 bg-[#ebf1f7] rounded-[12px] items-center justify-center text-xl mb-2">
                {action.icon}
              </div>
              <h3 className="font-bold text-[#212121] text-[18px]">{action.title}</h3>
              <p className="text-[#5a5a6e] text-[11px] mt-0.5 leading-snug">{action.desc}</p>
            </button>
          ))}
        </div>

        {/* Recent tenants list */}
        {statusQuery.data?.tenants && statusQuery.data.tenants.length > 0 && (
          <div className="sc-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#eeeeee]">
              <h2 className="font-bold text-[#212121] text-sm">👥 דיירי הבניין</h2>
            </div>
            <div className="divide-y divide-sc-bg">
              {statusQuery.data.tenants.slice(0, 8).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-[#ebf1f7] rounded-full flex items-center justify-center text-[#3b6b9c] text-sm font-bold flex-shrink-0">
                    {t.profile?.full_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#212121] truncate">{t.profile?.full_name ?? t.profile?.email ?? 'דייר'}</p>
                    <p className="text-xs text-[#5a5a6e]">{t.is_onboarded ? '✅ הצטרף' : '⏳ בתהליך'}</p>
                  </div>
                  <div className="flex gap-1">
                    {t.profile?.is_building_representative && (
                      <span className="sc-badge bg-[#ebf1f7] text-[#3b6b9c]">ועד</span>
                    )}
                    {t.signatures?.length > 0 && (
                      <span className="sc-badge bg-[#4a8c5c]/15 text-[#4a8c5c]">חתם</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BottomSheet open={!!modal} onClose={() => setModal(null)} title={modal ? modalTitles[modal] : ''}>
        {modal === 'poll' && buildingId && groupId && (
          <PollWizard groupId={groupId} onSuccess={() => handleSuccess('הסקר פורסם בהצלחה!')} />
        )}
        {modal === 'poll' && !groupId && (
          <p className="text-[#5a5a6e] text-center py-4">לא נמצאה קבוצת בניין. יש ליצור קבוצה תחילה.</p>
        )}
        {modal === 'document' && buildingId && (
          <DocumentUpload buildingId={buildingId} groupId={groupId} onSuccess={() => handleSuccess('המסמך הועלה בהצלחה!')} />
        )}
        {modal === 'broadcast' && buildingId && (
          <BroadcastForm buildingId={buildingId} groupId={groupId} onSuccess={() => handleSuccess('ההודעה נשלחה בהצלחה!')} />
        )}
        {modal === 'meeting' && buildingId && (
          <MeetingForm buildingId={buildingId} groupId={groupId} onSuccess={() => handleSuccess('הישיבה נקבעה בהצלחה!')} />
        )}
        {modal === 'signature' && buildingId && (
          <SignatureForm buildingId={buildingId} groupId={groupId} onSuccess={() => handleSuccess('בקשות החתימה נשלחו בהצלחה!')} />
        )}
        {modal === 'invite' && buildingId && (
          <InviteForm buildingId={buildingId} senderName={myRole?.fullName ?? undefined} />
        )}
        {!buildingId && modal && (
          <p className="text-[#5a5a6e] text-center py-4">לא נמצא בניין משויך. צור קשר עם המנהל.</p>
        )}
      </BottomSheet>
    </PageLayout>
  )
}
