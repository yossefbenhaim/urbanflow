import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'

const DISPUTE_TYPES = [
  { value: 'inheritance', label: '📜 ירושה', desc: 'סכסוך בין יורשים על הבעלות' },
  { value: 'divorce', label: '⚖️ גירושין', desc: 'חלוקת רכוש בין בני זוג' },
  { value: 'unclear', label: '❓ בעלות לא ברורה', desc: 'אין מסמכים ברורים על הבעלות' },
  { value: 'other', label: '📋 אחר', desc: 'סוג סכסוך אחר' },
]

export default function OwnershipDisputeForm() {
  const [form, setForm] = useState({
    apartmentId: '',
    disputeType: 'inheritance' as 'inheritance' | 'divorce' | 'unclear' | 'other',
    parties: '',
    description: '',
    documents: [] as string[],
    newDocUrl: '',
  })
  const [success, setSuccess] = useState(false)

  const { data: disputes, refetch } = trpc.tenant.getOwnershipDisputes.useQuery()
  const report = trpc.tenant.reportOwnershipDispute.useMutation({
    onSuccess: () => { setSuccess(true); refetch(); setTimeout(() => setSuccess(false), 3000) },
  })

  return (
    <div className="min-h-screen bg-[#f8f9fa]" dir="rtl">
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-[22px] font-bold text-[#212121] mb-1">⚖️ דיווח סכסוך בעלות</h1>
        <p className="text-[#5a5a6e] text-sm mb-6">דווח על סכסוך בעלות בדירה — הדירה תיחסם מהצבעה עד לפתרון</p>

        <div className="sc-card p-6 mb-6">
          <h3 className="text-[17px] font-bold text-[#212121] mb-4">טופס דיווח</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">מזהה דירה *</label>
              <input className="sc-input" placeholder="UUID הדירה" value={form.apartmentId}
                onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-2">סוג הסכסוך *</label>
              <div className="flex flex-col gap-2">
                {DISPUTE_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, disputeType: t.value as any }))}
                    className={`p-3 rounded-xl border-2 text-right transition-all ${
                      form.disputeType === t.value
                        ? 'border-[#3b6b9c] bg-[#ebf1f7]'
                        : 'border-[#eeeeee] bg-white'
                    }`}>
                    <p className={`text-sm font-semibold ${form.disputeType === t.value ? 'text-[#3b6b9c]' : 'text-[#212121]'}`}>{t.label}</p>
                    <p className="text-xs text-[#5a5a6e] mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">צדדים מעורבים</label>
              <input className="sc-input" placeholder="שמות הצדדים (מופרדים בפסיקים)" value={form.parties}
                onChange={e => setForm(f => ({ ...f, parties: e.target.value }))} />
              <p className="text-[11px] text-[#5a5a6e] mt-1">לדוג׳: יוסי כהן, רחל לוי</p>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">תיאור הסכסוך *</label>
              <textarea className="sc-input resize-y" rows={4} placeholder="תאר את הסכסוך בפירוט..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">מסמכים תומכים</label>
              <div className="flex gap-2">
                <input className="sc-input flex-1" placeholder="URL של מסמך" value={form.newDocUrl}
                  onChange={e => setForm(f => ({ ...f, newDocUrl: e.target.value }))} />
                <button
                  onClick={() => {
                    if (form.newDocUrl) {
                      setForm(f => ({ ...f, documents: [...f.documents, f.newDocUrl], newDocUrl: '' }))
                    }
                  }}
                  className="sc-btn-primary px-4 py-2 text-sm flex-shrink-0"
                >+ הוסף</button>
              </div>
              {form.documents.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.documents.map((doc, i) => (
                    <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                      📎 מסמך {i + 1}
                      <button onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))}
                        className="bg-transparent border-none text-red-500 cursor-pointer text-xs">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-red-500/10 border border-sc-error/30 rounded-xl p-3">
              <p className="text-xs text-red-500 m-0">
                🚫 <strong>שים לב:</strong> דירה עם סכסוך בעלות פתוח תיחסם מהצבעה עד לפתרון הסכסוך
              </p>
            </div>

            {success && (
              <div className="bg-[#4a8c5c]/10 border border-sc-success/30 rounded-xl p-3">
                <p className="text-xs text-[#4a8c5c] font-semibold m-0">✅ הדיווח נשלח בהצלחה</p>
              </div>
            )}

            <button
              onClick={() => report.mutate({
                apartmentId: form.apartmentId,
                disputeType: form.disputeType,
                parties: form.parties ? form.parties.split(',').map(s => s.trim()) : [],
                description: form.description,
                documents: form.documents,
              })}
              disabled={report.isPending || !form.apartmentId || !form.description}
              className="sc-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {report.isPending ? 'שולח...' : '📤 שלח דיווח'}
            </button>
          </div>
        </div>

        {/* Existing Disputes */}
        {disputes && disputes.length > 0 && (
          <div>
            <h3 className="text-[15px] font-bold text-[#212121] mb-3">סכסוכים קיימים</h3>
            <div className="flex flex-col gap-2.5">
              {disputes.map((d: any) => (
                <div key={d.id} className="sc-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#212121]">
                      {DISPUTE_TYPES.find(t => t.value === d.dispute_type)?.label ?? d.dispute_type}
                    </span>
                    <span className={`sc-badge text-xs ${d.status === 'open' ? 'bg-red-500/15 text-red-500' : 'bg-[#4a8c5c]/15 text-[#4a8c5c]'}`}>
                      {d.status === 'open' ? '🔴 פתוח' : '✅ נפתר'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5a5a6e]">{d.description}</p>
                  {d.parties?.length > 0 && (
                    <p className="text-xs text-[#5a5a6e] mt-1">צדדים: {d.parties.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
