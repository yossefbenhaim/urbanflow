import { useState } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { trpc } from '../lib/trpc'

const POA_TYPES = [
  { value: 'full', label: '📋 ייפוי כוח מלא', desc: 'כולל את כל ההחלטות והפעולות' },
  { value: 'partial', label: '📝 ייפוי כוח חלקי', desc: 'לפעולות מסוימות בלבד' },
  { value: 'voting_only', label: '🗳️ הצבעה בלבד', desc: 'מיופה הכוח מצביע במקום הבעלים' },
]

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ ממתין לאישור', cls: 'bg-[#8b6f47]/15 text-[#8b6f47]' },
  approved: { label: '✅ מאושר', cls: 'bg-[#4a8c5c]/15 text-[#4a8c5c]' },
  rejected: { label: '❌ נדחה', cls: 'bg-red-500/15 text-red-500' },
  expired: { label: '⌛ פג תוקף', cls: 'bg-sc-border text-[#5a5a6e]' },
}

export default function PowerOfAttorneyForm() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    receiverUserId: '',
    apartmentId: '',
    poaType: 'full' as 'full' | 'partial' | 'voting_only',
    fileUrl: '',
    notarized: false,
    validFrom: '',
    validUntil: '',
  })

  const { data: poas, refetch } = trpc.tenant.getMyPowerOfAttorneys.useQuery()
  const create = trpc.tenant.createPowerOfAttorney.useMutation({
    onSuccess: () => { refetch(); setShowForm(false) },
  })

  return (
    <PageLayout>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-[#212121] mb-1">📋 ייפוי כוח</h1>
            <p className="text-[#5a5a6e] text-sm">ניהול ייפויי כוח לדירות שלך</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="sc-btn-primary px-4 py-2 text-sm">
            {showForm ? 'ביטול' : '+ ייפוי כוח חדש'}
          </button>
        </div>

        {/* Existing POAs */}
        <div className="flex flex-col gap-3 mb-6">
          {(poas ?? []).map((poa: any) => (
            <div key={poa.id} className="sc-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-[#212121]">
                    {POA_TYPES.find(t => t.value === poa.poa_type)?.label ?? poa.poa_type}
                  </p>
                  <p className="text-xs text-[#5a5a6e] mt-1">
                    מנותן: {poa.granter?.full_name ?? '—'} → למקבל: {poa.receiver?.full_name ?? '—'}
                  </p>
                </div>
                <span className={`sc-badge text-xs ${STATUS_LABELS[poa.status]?.cls ?? 'bg-sc-border text-[#5a5a6e]'}`}>
                  {STATUS_LABELS[poa.status]?.label ?? poa.status}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-[#5a5a6e]">
                {poa.valid_from && <span>מתאריך: {poa.valid_from}</span>}
                {poa.valid_until && <span>עד: {poa.valid_until}</span>}
                {poa.notarized && <span className="text-[#4a8c5c] font-semibold">✓ נוטריוני</span>}
              </div>
              {poa.file_url && (
                <a href={poa.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#3b6b9c] underline mt-2 inline-block">
                  📎 צפייה במסמך
                </a>
              )}
            </div>
          ))}
          {(!poas || poas.length === 0) && !showForm && (
            <div className="sc-card p-8 text-center text-[#5a5a6e]">
              <span className="text-4xl block mb-2">📋</span>
              <p className="text-sm">אין ייפויי כוח פעילים</p>
            </div>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="sc-card p-6">
            <h3 className="text-[17px] font-bold text-[#212121] mb-4">יצירת ייפוי כוח חדש</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">מזהה מקבל ייפוי הכוח *</label>
                <input className="sc-input" placeholder="UUID של המשתמש המקבל" value={form.receiverUserId}
                  onChange={e => setForm(f => ({ ...f, receiverUserId: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">מזהה דירה *</label>
                <input className="sc-input" placeholder="UUID הדירה" value={form.apartmentId}
                  onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2">סוג ייפוי כוח *</label>
                <div className="flex flex-col gap-2">
                  {POA_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, poaType: t.value as any }))}
                      className={`p-3 rounded-xl border-2 text-right transition-all ${
                        form.poaType === t.value
                          ? 'border-[#3b6b9c] bg-[#ebf1f7]'
                          : 'border-[#eeeeee] bg-white'
                      }`}>
                      <p className={`text-sm font-semibold ${form.poaType === t.value ? 'text-[#3b6b9c]' : 'text-[#212121]'}`}>{t.label}</p>
                      <p className="text-xs text-[#5a5a6e] mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">קישור למסמך נוטריוני</label>
                <input className="sc-input" placeholder="URL של המסמך" value={form.fileUrl}
                  onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="notarized" checked={form.notarized}
                  onChange={e => setForm(f => ({ ...f, notarized: e.target.checked }))} />
                <label htmlFor="notarized" className="text-[13px] text-[#212121]">מסמך נוטריוני מאושר</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-1">תוקף מתאריך</label>
                  <input type="date" className="sc-input" value={form.validFrom}
                    onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-1">תוקף עד</label>
                  <input type="date" className="sc-input" value={form.validUntil}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
              </div>

              <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
                <p className="text-xs text-[#8b6f47] m-0">
                  ⚖️ <strong>חשוב:</strong> אם יש ייפוי כוח מאושר, רק מיופה הכוח יוכל להצביע בשם בעל הדירה
                </p>
              </div>

              <button
                onClick={() => create.mutate({
                  receiverUserId: form.receiverUserId,
                  apartmentId: form.apartmentId,
                  poaType: form.poaType,
                  fileUrl: form.fileUrl || undefined,
                  notarized: form.notarized,
                  validFrom: form.validFrom || undefined,
                  validUntil: form.validUntil || undefined,
                })}
                disabled={create.isPending || !form.receiverUserId || !form.apartmentId}
                className="sc-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
              >
                {create.isPending ? 'שומר...' : '✓ צור ייפוי כוח'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
