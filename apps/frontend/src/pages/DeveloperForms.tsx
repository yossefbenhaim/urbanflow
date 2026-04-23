import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout from '../components/PageLayout'

type Tab = 'proposal' | 'accompaniment' | 'economic' | 'bids'

const TABS: { id: Tab; title: string; icon: string }[] = [
  { id: 'proposal', title: 'פתיחת פרויקט', icon: '🏗️' },
  { id: 'accompaniment', title: 'ליווי', icon: '🤝' },
  { id: 'economic', title: 'כלכלי', icon: '💰' },
  { id: 'bids', title: 'הצעות', icon: '📋' },
]

export default function DeveloperForms() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'proposal')
  const [activeProposalId, setActiveProposalId] = useState<string | null>(params.get('proposalId'))

  const changeTab = (t: Tab) => {
    setTab(t)
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }

  return (
    <PageLayout>
      <div dir="rtl" className="max-w-2xl mx-auto p-4 pb-12">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-[#5a5a6e] text-sm mb-3">← חזרה</button>
          <h1 className="sc-section-title text-xl">טפסי יזם</h1>
          <p className="text-sm text-[#5a5a6e]">ניהול הצעות פרויקט, ליווי, תכנון כלכלי והצעות מחיר</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
                ${tab === t.id ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
            >
              {t.icon} {t.title}
            </button>
          ))}
        </div>

        {tab === 'proposal' && <ProposalTab activeId={activeProposalId} onActivate={setActiveProposalId} />}
        {tab === 'accompaniment' && <AccompanimentTab proposalId={activeProposalId} />}
        {tab === 'economic' && <EconomicTab proposalId={activeProposalId} />}
        {tab === 'bids' && <BidsTab />}
      </div>
    </PageLayout>
  )
}

// ══════════════════════════════════════════════════════════
// Tab 1: Proposals list + creator (טופס פתיחת פרויקט)
// ══════════════════════════════════════════════════════════
function ProposalTab({ activeId, onActivate }: { activeId: string | null; onActivate: (id: string) => void }) {
  const { data: proposals = [], refetch } = trpc.developer.listProposals.useQuery()
  const createProposal = trpc.developer.createProposal.useMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      if (!form.address || !form.city || !form.projectType) {
        setError('כתובת, עיר וסוג פרויקט הם שדות חובה')
        return
      }
      const result = await createProposal.mutateAsync({
        address: String(form.address),
        city: String(form.city),
        projectType: form.projectType as 'pinuy_binuy' | 'tama_38_2' | 'chalufat_shaked' | 'binui_pinui',
        tenantsCount: form.tenantsCount ? +form.tenantsCount : undefined,
        complexType: (form.complexType || undefined) as 'single_building' | 'multi_building' | 'cluster' | undefined,
        profitTargetPct: form.profitTargetPct ? +form.profitTargetPct : undefined,
        riskLevel: (form.riskLevel || undefined) as 'low' | 'medium' | 'high' | undefined,
        notes: form.notes ? String(form.notes) : undefined,
      })
      setShowForm(false)
      setForm({})
      refetch()
      onActivate((result as { id: string }).id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת הצעה')
    }
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl bg-[#1e3a5f] text-white font-semibold"
        >
          + פרויקט חדש
        </button>
      )}

      {showForm && (
        <div className="sc-card p-4 space-y-3">
          <h3 className="font-bold text-[#1e3a5f]">פתיחת פרויקט חדש</h3>
          <FieldX label="כתובת *" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
          <FieldX label="עיר *" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          <SelectX
            label="סוג פרויקט *"
            value={form.projectType as string | undefined}
            onChange={v => setForm(f => ({ ...f, projectType: v }))}
            options={[
              { value: '', label: '— בחר —' },
              { value: 'pinuy_binuy', label: 'פינוי בינוי' },
              { value: 'tama_38_2', label: `תמ"א 38/2` },
              { value: 'chalufat_shaked', label: 'חלופת שקד' },
              { value: 'binui_pinui', label: 'בינוי פינוי' },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <FieldX label="מספר דיירים" type="number" value={form.tenantsCount} onChange={v => setForm(f => ({ ...f, tenantsCount: +v }))} />
            <FieldX label="יעד רווחיות (%)" type="number" value={form.profitTargetPct} onChange={v => setForm(f => ({ ...f, profitTargetPct: +v }))} />
          </div>
          <SelectX
            label="סוג מתחם"
            value={form.complexType as string | undefined}
            onChange={v => setForm(f => ({ ...f, complexType: v }))}
            options={[
              { value: '', label: '— בחר —' },
              { value: 'single_building', label: 'בניין יחיד' },
              { value: 'multi_building', label: 'מספר בניינים' },
              { value: 'cluster', label: 'מתחם' },
            ]}
          />
          <SelectX
            label="רמת סיכון רצויה"
            value={form.riskLevel as string | undefined}
            onChange={v => setForm(f => ({ ...f, riskLevel: v }))}
            options={[
              { value: '', label: '— בחר —' },
              { value: 'low', label: 'נמוכה' },
              { value: 'medium', label: 'בינונית' },
              { value: 'high', label: 'גבוהה' },
            ]}
          />
          <FieldX label="הערות" textarea value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={createProposal.isPending} className="flex-1 py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold">
              {createProposal.isPending ? 'שומר...' : 'שמור'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({}); setError('') }} className="px-4 py-3 rounded-xl border border-[#eeeeee] text-[#5a5a6e]">ביטול</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {proposals.length === 0 && !showForm && (
          <p className="text-center text-[#5a5a6e] text-sm py-8">אין הצעות פרויקט עדיין</p>
        )}
        {proposals.map((p: Record<string, unknown>) => (
          <div
            key={String(p.id)}
            onClick={() => onActivate(String(p.id))}
            className={`sc-card p-3 cursor-pointer transition-colors ${activeId === p.id ? 'border-[#3b6b9c]' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#212121]">{String(p.address)}, {String(p.city)}</div>
                <div className="text-xs text-[#5a5a6e]">
                  {PROJECT_TYPE_LABELS[String(p.project_type)] ?? String(p.project_type)} · {String(p.tenants_count ?? '?')} דיירים
                </div>
              </div>
              <StatusBadge status={String(p.status)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Tab 2: Accompaniment
// ══════════════════════════════════════════════════════════
function AccompanimentTab({ proposalId }: { proposalId: string | null }) {
  const { data, refetch } = trpc.developer.getAccompaniment.useQuery(proposalId ?? '', { enabled: !!proposalId })
  const upsert = trpc.developer.upsertAccompaniment.useMutation()
  const [form, setForm] = useState<Record<string, string>>({})
  const [ok, setOk] = useState(false)

  if (!proposalId) return <EmptyState text="בחר הצעת פרויקט בלשונית &quot;פתיחת פרויקט&quot;" />

  const current = { ...((data as Record<string, string>) ?? {}), ...form }

  const save = async () => {
    setOk(false)
    await upsert.mutateAsync({
      proposalId,
      contractorName: current.contractor_name || undefined,
      notes: current.notes || undefined,
    })
    setOk(true)
    refetch()
  }

  return (
    <div className="sc-card p-4 space-y-3">
      <h3 className="font-bold text-[#1e3a5f]">ליווי פרויקט</h3>
      <p className="text-xs text-[#5a5a6e]">ציין אנשי מקצוע שמלווים את הפרויקט</p>
      <FieldX
        label="קבלן מבצע"
        value={current.contractor_name}
        onChange={v => setForm(f => ({ ...f, contractor_name: v }))}
        placeholder="שם הקבלן או חברת בנייה"
      />
      <FieldX
        label="הערות"
        textarea
        value={current.notes}
        onChange={v => setForm(f => ({ ...f, notes: v }))}
        placeholder="מידע נוסף על מבנה הליווי — אדריכל, שמאי, מארגן וכד'"
      />
      {ok && <p className="text-[#4a8c5c] text-sm">✅ נשמר</p>}
      <button onClick={save} disabled={upsert.isPending} className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold">
        {upsert.isPending ? 'שומר...' : 'שמור'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Tab 3: Economic plan
// ══════════════════════════════════════════════════════════
function EconomicTab({ proposalId }: { proposalId: string | null }) {
  const { data, refetch } = trpc.developer.getEconomicPlan.useQuery(proposalId ?? '', { enabled: !!proposalId })
  const upsert = trpc.developer.upsertEconomicPlan.useMutation()
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [ok, setOk] = useState(false)

  if (!proposalId) return <EmptyState text="בחר הצעת פרויקט בלשונית &quot;פתיחת פרויקט&quot;" />

  const current = { ...((data as Record<string, string | number>) ?? {}), ...form }

  const save = async () => {
    setOk(false)
    await upsert.mutateAsync({
      proposalId,
      expectedProfit: current.expected_profit ? +current.expected_profit : undefined,
      constructionCosts: current.construction_costs ? +current.construction_costs : undefined,
      financingSource: current.financing_source ? String(current.financing_source) : undefined,
      financingAmount: current.financing_amount ? +current.financing_amount : undefined,
      timelineMonths: current.timeline_months ? +current.timeline_months : undefined,
      economicRisks: current.economic_risks ? String(current.economic_risks) : undefined,
      marketConditions: current.market_conditions ? String(current.market_conditions) : undefined,
    })
    setOk(true)
    refetch()
  }

  return (
    <div className="sc-card p-4 space-y-3">
      <h3 className="font-bold text-[#1e3a5f]">תוכנית כלכלית</h3>
      <div className="grid grid-cols-2 gap-2">
        <FieldX label="רווח צפוי (₪)" type="number" value={current.expected_profit} onChange={v => setForm(f => ({ ...f, expected_profit: +v }))} />
        <FieldX label="עלויות בנייה (₪)" type="number" value={current.construction_costs} onChange={v => setForm(f => ({ ...f, construction_costs: +v }))} />
      </div>
      <FieldX label="מקור מימון" value={current.financing_source} onChange={v => setForm(f => ({ ...f, financing_source: v }))} placeholder="בנק, קרן השקעה, מימון עצמי..." />
      <div className="grid grid-cols-2 gap-2">
        <FieldX label="סכום מימון (₪)" type="number" value={current.financing_amount} onChange={v => setForm(f => ({ ...f, financing_amount: +v }))} />
        <FieldX label={`לו"ז (חודשים)`} type="number" value={current.timeline_months} onChange={v => setForm(f => ({ ...f, timeline_months: +v }))} />
      </div>
      <FieldX label="תנאי שוק" textarea value={current.market_conditions} onChange={v => setForm(f => ({ ...f, market_conditions: v }))} />
      <FieldX label="סיכונים כלכליים" textarea value={current.economic_risks} onChange={v => setForm(f => ({ ...f, economic_risks: v }))} />
      {ok && <p className="text-[#4a8c5c] text-sm">✅ נשמר</p>}
      <button onClick={save} disabled={upsert.isPending} className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold">
        {upsert.isPending ? 'שומר...' : 'שמור'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Tab 4: Bids
// ══════════════════════════════════════════════════════════
function BidsTab() {
  const { data: bids = [], refetch } = trpc.developer.listBids.useQuery()
  const createBid = trpc.developer.createBid.useMutation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      if (!form.plainLanguageDetail || String(form.plainLanguageDetail).length < 10) {
        setError('תיאור בשפה פשוטה לדיירים חייב להיות לפחות 10 תווים')
        return
      }
      await createBid.mutateAsync({
        bidType: form.bidType ? String(form.bidType) : undefined,
        executionTerms: form.executionTerms ? String(form.executionTerms) : undefined,
        guarantees: form.guarantees ? String(form.guarantees) : undefined,
        warrantyPeriodMonths: form.warrantyPeriodMonths ? +form.warrantyPeriodMonths : undefined,
        plainLanguageDetail: String(form.plainLanguageDetail),
        priceTotal: form.priceTotal ? +form.priceTotal : undefined,
      })
      setShowForm(false)
      setForm({})
      refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-2xl bg-[#1e3a5f] text-white font-semibold">
          + הצעה חדשה
        </button>
      )}

      {showForm && (
        <div className="sc-card p-4 space-y-3">
          <h3 className="font-bold text-[#1e3a5f]">הצעה חדשה</h3>
          <FieldX label="סוג הצעה" value={form.bidType} onChange={v => setForm(f => ({ ...f, bidType: v }))} placeholder="בנייה מלאה, שיפוץ, ייעוץ..." />
          <FieldX label="תנאי ביצוע" textarea value={form.executionTerms} onChange={v => setForm(f => ({ ...f, executionTerms: v }))} />
          <FieldX label="ערבויות" textarea value={form.guarantees} onChange={v => setForm(f => ({ ...f, guarantees: v }))} placeholder="ערבות בנקאית, ביטוח ביצוע..." />
          <div className="grid grid-cols-2 gap-2">
            <FieldX label="אחריות (חודשים)" type="number" value={form.warrantyPeriodMonths} onChange={v => setForm(f => ({ ...f, warrantyPeriodMonths: +v }))} />
            <FieldX label="מחיר כולל (₪)" type="number" value={form.priceTotal} onChange={v => setForm(f => ({ ...f, priceTotal: +v }))} />
          </div>
          <FieldX
            label="תיאור לדיירים (בשפה פשוטה) *"
            textarea
            value={form.plainLanguageDetail}
            onChange={v => setForm(f => ({ ...f, plainLanguageDetail: v }))}
            placeholder="מה בפועל יקבלו הדיירים? נסח בלשון פשוטה ובהירה, בלי ז'רגון מקצועי."
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={createBid.isPending} className="flex-1 py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold">
              {createBid.isPending ? 'שומר...' : 'שמור טיוטה'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({}); setError('') }} className="px-4 py-3 rounded-xl border border-[#eeeeee] text-[#5a5a6e]">ביטול</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {bids.length === 0 && !showForm && (
          <p className="text-center text-[#5a5a6e] text-sm py-8">אין הצעות עדיין</p>
        )}
        {bids.map((b: Record<string, unknown>) => (
          <div key={String(b.id)} className="sc-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[#212121]">{String(b.bid_type ?? 'הצעה')}</span>
              <StatusBadge status={String(b.status)} />
            </div>
            {b.price_total !== null && (
              <div className="text-sm text-[#5a5a6e]">₪{Number(b.price_total).toLocaleString('he-IL')}</div>
            )}
            <div className="text-xs text-[#5a5a6e] mt-1 line-clamp-2">{String(b.plain_language_detail ?? '')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════
const PROJECT_TYPE_LABELS: Record<string, string> = {
  pinuy_binuy: 'פינוי בינוי',
  tama_38_2: `תמ"א 38/2`,
  chalufat_shaked: 'חלופת שקד',
  binui_pinui: 'בינוי פינוי',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  submitted: 'הוגשה',
  approved: 'אושר',
  rejected: 'נדחה',
  withdrawn: 'נמשכה',
  awarded: 'זכייה',
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-50 text-blue-700',
    approved: 'bg-green-50 text-green-700',
    awarded: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    withdrawn: 'bg-orange-50 text-orange-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function FieldX({ label, value, onChange, type = 'text', textarea = false, placeholder }: {
  label: string; value: string | number | undefined; onChange: (v: string) => void;
  type?: string; textarea?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      {textarea ? (
        <textarea value={String(value ?? '')} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className="sc-input resize-none" />
      ) : (
        <input type={type} value={String(value ?? '')} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="sc-input" />
      )}
    </div>
  )
}

function SelectX({ label, value, onChange, options }: {
  label: string; value: string | undefined; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="sc-input bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-[#5a5a6e] text-sm py-8">{text}</p>
}
