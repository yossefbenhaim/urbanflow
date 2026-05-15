import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  invited:                { text: 'הזמנה נשלחה',     color: 'bg-[#fff4e0] text-[#8b6f47]' },
  accepted_by_provider:   { text: 'אושר ע״י נותן השירות', color: 'bg-[#e6f0ff] text-[#3b6b9c]' },
  in_negotiation:         { text: 'במשא ומתן',       color: 'bg-[#e6f0ff] text-[#3b6b9c]' },
  agreed_by_provider:     { text: 'הנותן אישר הסכם', color: 'bg-[#dff2e1] text-[#4a8c5c]' },
  agreed_by_committee:    { text: 'הוועד אישר הסכם', color: 'bg-[#dff2e1] text-[#4a8c5c]' },
  both_agreed:            { text: 'סוכם דו-צדדית',   color: 'bg-[#dff2e1] text-[#4a8c5c]' },
  polling:                { text: 'בהצבעת דיירים',  color: 'bg-[#fff4e0] text-[#8b6f47]' },
  approved:               { text: '✅ נבחר',          color: 'bg-[#dff2e1] text-[#4a8c5c]' },
  rejected_by_tenants:    { text: '❌ נדחה בהצבעה',  color: 'bg-[#ffe5e5] text-[#b94a4a]' },
  cancelled:              { text: 'בוטל',            color: 'bg-gray-100 text-gray-600' },
  superseded:             { text: 'הוחלף',           color: 'bg-gray-100 text-gray-600' },
}

const ROLE_LABEL: Record<string, string> = {
  architect: 'אדריכל', appraiser: 'שמאי', lawyer: 'עורך דין',
  developer: 'יזם', engineer: 'מהנדס', inspector: 'מפקח', other: 'אחר',
}

export default function NegotiationsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.negotiations.listMine.useQuery(undefined, { refetchInterval: 15000 })

  const asCommittee = data?.asCommittee ?? []
  const asProvider = data?.asProvider ?? []

  return (
    <PageLayout>
      <PageTitle>🤝 משא ומתן עם נותני שירות</PageTitle>

      {isLoading && <p className="text-[#5a5a6e] text-sm py-8 text-center">טוען…</p>}

      {!isLoading && asCommittee.length === 0 && asProvider.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-[#5a5a6e] text-sm">אין כרגע משאים ומתנים פעילים.</p>
        </div>
      )}

      {asCommittee.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-[#212121] mb-2">📨 הזמנות שאני שלחתי</h3>
          <div className="space-y-2">
            {asCommittee.map((n: any) => <NegRow key={n.id} n={n} onClick={() => navigate(`/negotiations/${n.id}`)} otherSide={n.provider} />)}
          </div>
        </section>
      )}

      {asProvider.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-[#212121] mb-2">📥 הזמנות שאני קיבלתי</h3>
          <div className="space-y-2">
            {asProvider.map((n: any) => <NegRow key={n.id} n={n} onClick={() => navigate(`/negotiations/${n.id}`)} otherSide={n.inviter} />)}
          </div>
        </section>
      )}
    </PageLayout>
  )
}

function NegRow({ n, onClick, otherSide }: { n: any; onClick: () => void; otherSide?: { full_name?: string } | null }) {
  const status = STATUS_LABEL[n.status] ?? { text: n.status, color: 'bg-gray-100 text-gray-600' }
  const roleLabel = ROLE_LABEL[n.provider_role] ?? n.provider_role
  const building = n.building?.address || 'בניין'
  return (
    <button onClick={onClick} className="sc-card w-full p-4 text-right hover:bg-[#f8f9fa] transition-colors active:scale-[0.99]">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-[#212121] text-sm">{otherSide?.full_name ?? 'משתמש'}</p>
        <span className={`sc-badge ${status.color}`}>{status.text}</span>
      </div>
      <p className="text-xs text-[#5a5a6e]">{roleLabel} · {building}</p>
      {n.poll_deadline && n.status === 'polling' && (
        <p className="text-xs text-[#8b6f47] mt-1">סקר עד {new Date(n.poll_deadline).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      )}
    </button>
  )
}
