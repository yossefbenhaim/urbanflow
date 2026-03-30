import { useState } from 'react'
import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

const OWNERSHIP_TYPES = [
  { value: 'owner', label: '🏠 בעלים' },
  { value: 'heir', label: '📜 יורש' },
  { value: 'divorced', label: '⚖️ גרוש/ה' },
  { value: 'proxy', label: '📋 מיופה כוח' },
  { value: 'abroad', label: '✈️ בעלים בחו"ל' },
]

export default function ApartmentOwners({ apartmentId }: { apartmentId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    userId: '',
    ownershipType: 'owner' as 'owner' | 'heir' | 'divorced' | 'proxy' | 'abroad',
    ownershipPct: 100,
    hasProxy: false,
    proxyUserId: '',
  })

  const { data: owners, refetch } = trpc.tenant.getCoOwners.useQuery({ apartmentId })
  const addOwner = trpc.tenant.addCoOwner.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ userId: '', ownershipType: 'owner', ownershipPct: 100, hasProxy: false, proxyUserId: '' }) },
  })

  return (
    <div className="sc-card p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sc-blue flex items-center justify-center text-xl">👥</div>
          <div>
            <h3 className="text-[17px] font-bold text-sc-dark m-0">בעלי הדירה</h3>
            <p className="text-[13px] text-sc-gray mt-0.5">{owners?.length ?? 0} בעלים רשומים</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="sc-btn-primary px-4 py-2 text-sm">
          {showForm ? 'ביטול' : '+ הוסף בעלים'}
        </button>
      </div>

      {/* Owners List */}
      <div className="flex flex-col gap-2.5 mb-4">
        {(owners ?? []).map((o: any) => (
          <div key={o.id} className="flex items-center gap-3 p-3 bg-sc-bg rounded-xl border border-sc-gray-light">
            <div className="w-9 h-9 rounded-full bg-sc-blue-pale flex items-center justify-center text-lg">
              {OWNERSHIP_TYPES.find(t => t.value === o.ownership_type)?.label?.split(' ')[0] ?? '👤'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-sc-dark">{o.user?.full_name ?? 'משתמש'}</p>
              <p className="text-xs text-sc-gray">
                {OWNERSHIP_TYPES.find(t => t.value === o.ownership_type)?.label ?? o.ownership_type} — {o.ownership_pct}%
              </p>
            </div>
            {o.has_proxy && (
              <span className="sc-badge bg-sc-warning/15 text-sc-warning text-xs">מיופה כוח</span>
            )}
            <span className={`sc-badge text-xs ${o.status === 'active' ? 'bg-sc-success/15 text-sc-success' : 'bg-sc-gray-light text-sc-gray'}`}>
              {o.status === 'active' ? 'פעיל' : o.status}
            </span>
          </div>
        ))}
        {(!owners || owners.length === 0) && (
          <div className="text-center py-6 text-sc-gray text-sm">
            <span className="text-3xl block mb-2">🏠</span>
            אין בעלים רשומים עדיין
          </div>
        )}
      </div>

      {/* Add Owner Form */}
      {showForm && (
        <div className="bg-sc-bg rounded-xl p-5 border border-sc-blue-light">
          <h4 className="text-[15px] font-bold text-sc-dark mb-4">הוספת בעלים חדש</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-sc-dark mb-1">מזהה משתמש (UUID) *</label>
              <input className="sc-input" placeholder="מזהה המשתמש" value={form.userId}
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sc-dark mb-2">סוג בעלות *</label>
              <div className="grid grid-cols-2 gap-2">
                {OWNERSHIP_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, ownershipType: t.value as any }))}
                    className={`p-2.5 rounded-xl border-2 text-[13px] text-right transition-all ${
                      form.ownershipType === t.value
                        ? 'border-sc-blue bg-sc-blue-pale text-sc-blue font-semibold'
                        : 'border-sc-gray-light bg-white text-sc-gray'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sc-dark mb-1">אחוז בעלות</label>
              <input className="sc-input" type="number" min="0" max="100" value={form.ownershipPct}
                onChange={e => setForm(f => ({ ...f, ownershipPct: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hasProxy" checked={form.hasProxy}
                onChange={e => setForm(f => ({ ...f, hasProxy: e.target.checked }))} />
              <label htmlFor="hasProxy" className="text-[13px] text-sc-dark">יש מיופה כוח</label>
            </div>
            {form.hasProxy && (
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">מזהה מיופה כוח</label>
                <input className="sc-input" placeholder="UUID של מיופה הכוח" value={form.proxyUserId}
                  onChange={e => setForm(f => ({ ...f, proxyUserId: e.target.value }))} />
              </div>
            )}
            <button
              onClick={() => addOwner.mutate({
                apartmentId,
                userId: form.userId,
                ownershipType: form.ownershipType,
                ownershipPct: form.ownershipPct,
                hasProxy: form.hasProxy,
                proxyUserId: form.hasProxy ? form.proxyUserId : undefined,
              })}
              disabled={addOwner.isPending || !form.userId}
              className="sc-btn-primary w-full py-2.5 text-sm disabled:opacity-50 mt-2"
            >
              {addOwner.isPending ? 'שומר...' : '✓ הוסף בעלים'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
