import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'

export default function TabuUploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const uploadTabu = trpc.tenant.uploadTabu.useMutation()

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
    else setError('יש להעלות קובץ PDF בלבד')
  }, [])

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.type === 'application/pdf') { setFile(f); setError('') }
    else if (f) setError('יש להעלות קובץ PDF בלבד')
  }, [])

  const handleUpload = async () => {
    if (!file || !agreedToTerms) return
    setUploading(true)
    setError('')
    try {
      const token = localStorage.getItem('sb-token')
      if (!token) throw new Error('אינך מחובר')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const storagePath = `tabu/${Date.now()}-${safeName}`

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
      await uploadTabu.mutateAsync({ fileUrl })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאה')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <PageLayout>
        <div className="max-w-[480px] mx-auto px-4 py-12 text-center">
          <div className="sc-card p-8">
            <span className="text-5xl block mb-4">✅</span>
            <h2 className="text-xl font-bold text-[#212121] mb-2">נסח הטאבו הועלה בהצלחה!</h2>
            <p className="text-sm text-[#5a5a6e]">מעביר אותך לדף הראשי...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-[480px] mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-[#3b6b9c] text-sm mb-4 bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          → חזרה
        </button>

        <div className="sc-card p-6">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-3">📄</span>
            <h1 className="text-xl font-bold text-[#212121] mb-1">העלאת נסח טאבו</h1>
            <p className="text-sm text-[#5a5a6e]">
              העלה נסח טאבו עדכני להוכחת בעלות על הנכס
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-[#eeeeee] rounded-xl p-8 text-center cursor-pointer hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 transition-colors mb-5"
            onClick={() => document.getElementById('tabu-file-input')?.click()}
          >
            <input
              id="tabu-file-input"
              type="file"
              accept="application/pdf"
              onChange={handleSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl">✅</span>
                <p className="text-sm font-semibold text-[#212121]">{file.name}</p>
                <p className="text-xs text-[#5a5a6e]">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-red-500 underline bg-transparent border-none cursor-pointer mt-1"
                >הסר קובץ</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">📄</span>
                <p className="text-sm font-semibold text-[#212121]">גרור קובץ PDF לכאן</p>
                <p className="text-xs text-[#5a5a6e]">או לחץ לבחירת קובץ</p>
              </div>
            )}
          </div>

          {/* Terms of service */}
          <label className="flex items-start gap-3 p-4 bg-[#f8f9fa] rounded-xl border border-[#eeeeee] mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#3b6b9c] flex-shrink-0"
            />
            <div className="text-[13px] text-[#212121] leading-relaxed">
              <span className="font-semibold">אני מאשר/ת את תנאי השימוש</span>
              <p className="text-[11px] text-[#5a5a6e] mt-1 mb-0">
                אני מצהיר/ה כי נסח הטאבו שאני מעלה הוא עדכני ומשקף נכונה את מצב הזכויות בנכס.
                המסמך ישמש לצורכי הוכחת בעלות בלבד ויהיה חסוי בהתאם למדיניות הפרטיות של המערכת.
                ידוע לי כי לאחר שעה מההעלאה, המסמך ייננעל ולא ניתן יהיה לשנותו.
              </p>
            </div>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-600 m-0">{error}</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || !agreedToTerms || uploading}
            className="sc-btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {uploading ? 'מעלה...' : 'העלה נסח טאבו'}
          </button>

          <div className="mt-4 space-y-2">
            <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
              <p className="text-xs text-[#8b6f47] m-0">
                ⏰ <strong>שים לב:</strong> לאחר שעה מההעלאה, נסח הטאבו ננעל ולא ניתן לשנות אותו
              </p>
            </div>
            <div className="bg-[#3b6b9c]/10 border border-[#3b6b9c]/30 rounded-xl p-3">
              <p className="text-xs text-[#3b6b9c] m-0">
                🔒 <strong>סודיות:</strong> מסמך זה מסומן כסודי — גישה לדייר, מלווה ונציגות מאושרת בלבד
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
