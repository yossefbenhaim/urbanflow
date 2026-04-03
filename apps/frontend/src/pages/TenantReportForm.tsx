import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'

const REPORT_TYPES = [
  { value: 'refusal', label: '🚫 סירוב', desc: 'דייר מסרב לשתף פעולה בפרויקט' },
  { value: 'threat', label: '⚠️ איום', desc: 'דייר מאיים על דיירים אחרים או על הוועד' },
  { value: 'disruption', label: '🔊 הפרעה', desc: 'דייר מפריע לתהליך הפרויקט' },
  { value: 'other', label: '📋 אחר', desc: 'סיבה אחרת' },
]

const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: '1️⃣ חד פעמי' },
  { value: 'recurring', label: '🔄 חוזר' },
]

export default function TenantReportForm() {
  const [form, setForm] = useState({
    apartmentId: '',
    reportType: 'refusal' as 'refusal' | 'threat' | 'disruption' | 'other',
    description: '',
    frequency: 'one_time' as 'one_time' | 'recurring',
    blocksProject: false,
  })
  const [success, setSuccess] = useState(false)

  const { data: reports, refetch } = trpc.tenant.getMyReports.useQuery()
  const report = trpc.tenant.reportProblem.useMutation({
    onSuccess: () => { setSuccess(true); refetch(); setTimeout(() => setSuccess(false), 3000) },
  })

  return (
    <div className="min-h-screen bg-[#f8f9fa]" dir="rtl">
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-[22px] font-bold text-[#212121] mb-1">🚨 דיווח על דייר בעייתי</h1>
        <p className="text-[#5a5a6e] text-sm mb-6">דווח על דייר שמפריע להתקדמות הפרויקט</p>

        <div className="sc-card p-6 mb-6">
          <h3 className="text-[17px] font-bold text-[#212121] mb-4">טופס דיווח</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">מזהה דירה *</label>
              <input className="sc-input" placeholder="UUID הדירה" value={form.apartmentId}
                onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-2">סוג הדיווח *</label>
              <div className="flex flex-col gap-2">
                {REPORT_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, reportType: t.value as any }))}
                    className={`p-3 rounded-xl border-2 text-right transition-all ${
                      form.reportType === t.value
                        ? 'border-[#3b6b9c] bg-[#ebf1f7]'
                        : 'border-[#eeeeee] bg-white'
                    }`}>
                    <p className={`text-sm font-semibold ${form.reportType === t.value ? 'text-[#3b6b9c]' : 'text-[#212121]'}`}>{t.label}</p>
                    <p className="text-xs text-[#5a5a6e] mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-1">תיאור *</label>
              <textarea className="sc-input resize-y" rows={4} placeholder="תאר את הבעיה בפירוט..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-2">תדירות</label>
              <div className="flex gap-3">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, frequency: opt.value as any }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm cursor-pointer transition-colors ${
                      form.frequency === opt.value
                        ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                        : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="blocksProject" checked={form.blocksProject}
                onChange={e => setForm(f => ({ ...f, blocksProject: e.target.checked }))} />
              <label htmlFor="blocksProject" className="text-[13px] text-[#212121]">חוסם את התקדמות הפרויקט</label>
            </div>

            {form.blocksProject && (
              <div className="bg-red-500/10 border border-sc-error/30 rounded-xl p-3">
                <p className="text-xs text-red-500 m-0">
                  🚨 <strong>דיווח חוסם פרויקט</strong> — הדיווח יועבר לטיפול מיידי
                </p>
              </div>
            )}

            {success && (
              <div className="bg-[#4a8c5c]/10 border border-sc-success/30 rounded-xl p-3">
                <p className="text-xs text-[#4a8c5c] font-semibold m-0">✅ הדיווח נשלח בהצלחה</p>
              </div>
            )}

            <button
              onClick={() => report.mutate({
                apartmentId: form.apartmentId,
                reportType: form.reportType,
                description: form.description,
                frequency: form.frequency,
                blocksProject: form.blocksProject,
              })}
              disabled={report.isPending || !form.apartmentId || !form.description}
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
                    <span className="text-sm font-semibold text-[#212121]">
                      {REPORT_TYPES.find(t => t.value === r.report_type)?.label ?? r.report_type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="sc-badge text-xs bg-sc-border text-[#5a5a6e]">
                        {FREQUENCY_OPTIONS.find(f => f.value === r.frequency)?.label ?? r.frequency}
                      </span>
                      {r.blocks_project && (
                        <span className="sc-badge text-xs bg-red-500/15 text-red-500">🚨 חוסם</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#5a5a6e]">{r.description}</p>
                  <p className="text-[11px] text-[#5a5a6e] mt-1">{new Date(r.created_at).toLocaleDateString('he-IL')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
