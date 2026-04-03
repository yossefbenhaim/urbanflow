import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'

export default function UnlocatedTenantForm() {
  const [form, setForm] = useState({
    apartmentId: '',
    attemptedPhone: false,
    attemptedEmail: false,
    attemptedVisit: false,
    notes: '',
  })
  const [success, setSuccess] = useState(false)

  const { data: reports, refetch } = trpc.tenant.getUnlocatedTenants.useQuery()
  const report = trpc.tenant.reportUnlocated.useMutation({
    onSuccess: () => { setSuccess(true); refetch(); setTimeout(() => setSuccess(false), 3000) },
  })

  return (
    <div className="min-h-screen bg-[#f8f9fa]" dir="rtl">
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-[22px] font-bold text-[#212121] mb-1">🔍 דיווח על דייר לא מאותר</h1>
        <p className="text-[#5a5a6e] text-sm mb-6">דווח על דייר שלא ניתן ליצור עימו קשר</p>

        <div className="sc-card p-6 mb-6">
          <h3 className="text-[17px] font-bold text-[#212121] mb-4">טופס דיווח</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">מזהה דירה *</label>
              <input className="sc-input" placeholder="UUID הדירה" value={form.apartmentId}
                onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-2">ניסיונות איתור שבוצעו</label>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'attemptedPhone', label: '📞 ניסיון טלפוני', icon: '📞' },
                  { key: 'attemptedEmail', label: '📧 ניסיון במייל', icon: '📧' },
                  { key: 'attemptedVisit', label: '🚪 ביקור בדירה', icon: '🚪' },
                ].map(opt => (
                  <label key={opt.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    (form as any)[opt.key]
                      ? 'border-[#3b6b9c] bg-[#ebf1f7]'
                      : 'border-[#eeeeee] bg-white'
                  }`}>
                    <input type="checkbox" checked={(form as any)[opt.key]}
                      onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                      className="w-4 h-4" />
                    <span className="text-sm text-[#212121]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">הערות</label>
              <textarea className="sc-input resize-y" rows={3} placeholder="פירוט על ניסיונות האיתור..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {success && (
              <div className="bg-[#4a8c5c]/10 border border-sc-success/30 rounded-xl p-3">
                <p className="text-xs text-[#4a8c5c] font-semibold m-0">✅ הדיווח נשלח בהצלחה</p>
              </div>
            )}

            <button
              onClick={() => report.mutate({
                apartmentId: form.apartmentId,
                attemptedPhone: form.attemptedPhone,
                attemptedEmail: form.attemptedEmail,
                attemptedVisit: form.attemptedVisit,
                notes: form.notes || undefined,
              })}
              disabled={report.isPending || !form.apartmentId}
              className="sc-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {report.isPending ? 'שולח...' : '📤 שלח דיווח'}
            </button>
          </div>
        </div>

        {/* Existing Reports */}
        {reports && reports.length > 0 && (
          <div>
            <h3 className="text-[15px] font-bold text-[#212121] mb-3">דיווחים קודמים</h3>
            <div className="flex flex-col gap-2.5">
              {reports.map((r: any) => (
                <div key={r.id} className="sc-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#5a5a6e]">{new Date(r.created_at).toLocaleDateString('he-IL')}</span>
                    <span className={`sc-badge text-xs ${r.status === 'open' ? 'bg-[#8b6f47]/15 text-[#8b6f47]' : 'bg-[#4a8c5c]/15 text-[#4a8c5c]'}`}>
                      {r.status === 'open' ? '⏳ פתוח' : '✅ טופל'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#5a5a6e]">
                    {r.attempted_phone && <span>📞 טלפון</span>}
                    {r.attempted_email && <span>📧 מייל</span>}
                    {r.attempted_visit && <span>🚪 ביקור</span>}
                  </div>
                  {r.notes && <p className="text-xs text-[#212121] mt-2">{r.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
