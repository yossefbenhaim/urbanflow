import { trpc } from '../lib/trpc'

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  winner: { label: 'זוכה 🏆', color: 'bg-[#4a8c5c]/15 text-[#4a8c5c]' },
  rejected: { label: 'נדחה', color: 'bg-red-500/15 text-red-500' },
  shortlisted: { label: 'ברשימה מצומצמת', color: 'bg-[#8b6f47]/15 text-[#8b6f47]' },
  submitted: { label: 'הוגש', color: 'bg-[#f8f9fa] text-[#5a5a6e]' },
}

interface Props {
  tenderId: string
  readOnly?: boolean
  onAward?: (winnerId: string) => void
}

export default function ProposalComparison({ tenderId, readOnly = false, onAward }: Props) {
  const { data: proposals } = trpc.tenders.getTenderProposals.useQuery({ tenderId })

  if (!proposals?.length) {
    return (
      <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] p-6 text-center">
        <p className="text-[#5a5a6e]">📭 עדיין לא הוגשו הצעות</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#1e3a5f]/5 text-[#212121] text-xs">
          <tr>
            <th className="px-3 py-2.5 text-right font-semibold">מציע</th>
            <th className="px-3 py-2.5 text-right font-semibold">מחיר (₪)</th>
            <th className="px-3 py-2.5 text-right font-semibold">לו"ז (חודשים)</th>
            <th className="px-3 py-2.5 text-right font-semibold">שנות ניסיון</th>
            <th className="px-3 py-2.5 text-right font-semibold">פרויקטים</th>
            <th className="px-3 py-2.5 text-right font-semibold">ערבויות</th>
            <th className="px-3 py-2.5 text-right font-semibold">סטטוס</th>
            {!readOnly && onAward && <th className="px-3 py-2.5 text-right font-semibold">פעולות</th>}
          </tr>
        </thead>
        <tbody>
          {proposals.map((p: any) => {
            const badge = STATUS_BADGES[p.status] || STATUS_BADGES.submitted
            return (
              <tr
                key={p.id}
                className={`border-t transition-colors ${
                  p.status === 'winner'
                    ? 'bg-[#4a8c5c]/8 border-[#4a8c5c]/20'
                    : 'hover:bg-[#f8f9fa]'
                }`}
              >
                <td className="px-3 py-3 font-medium text-[#212121]">
                  {p.status === 'winner' && <span className="ml-1">🏆</span>}
                  {p.provider?.full_name ?? 'ספק'}
                </td>
                <td className="px-3 py-3 text-[#333]">
                  {p.price ? `₪${Number(p.price).toLocaleString('he-IL')}` : '—'}
                </td>
                <td className="px-3 py-3 text-[#333]">{p.timeline_months ?? '—'}</td>
                <td className="px-3 py-3 text-[#333]">{p.experience_years ?? '—'}</td>
                <td className="px-3 py-3 text-[#333]">{p.past_projects_count ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-[#5a5a6e]">{p.warranty_details ?? '—'}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </td>
                {!readOnly && onAward && (
                  <td className="px-3 py-3">
                    {p.status === 'submitted' && (
                      <button
                        onClick={() => onAward(p.provider_id)}
                        className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1e3a5f]/90 transition"
                      >
                        🏆 בחר זוכה
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
