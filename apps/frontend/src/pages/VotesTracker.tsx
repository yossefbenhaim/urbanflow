import { useState } from 'react'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import LoadingScreen from '../components/LoadingScreen'

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string; order: number }> = {
  not_started: { icon: '⬜', label: 'לא הצביעה',           color: 'text-[#5a5a6e]',  bg: 'bg-[#f8f9fa]',      order: 0 },
  pending:     { icon: '⏳', label: 'ממתינה לבעלים נוספים', color: 'text-[#8b6f47]',  bg: 'bg-[#8b6f47]/10',   order: 1 },
  blocked:     { icon: '🔒', label: 'חסומה (סכסוך)',       color: 'text-red-500',    bg: 'bg-red-500/10',     order: 2 },
  proxy:       { icon: '📜', label: 'מיופה כוח הצביע',     color: 'text-[#4DB6C4]', bg: 'bg-[#4DB6C4]/10',   order: 3 },
  voted:       { icon: '✅', label: 'הצביעה',              color: 'text-[#4a8c5c]',  bg: 'bg-[#4a8c5c]/10',   order: 4 },
}

const VOTE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  'בעד':  { icon: '👍', label: 'בעד',  color: 'text-[#4a8c5c]' },
  'נגד':  { icon: '👎', label: 'נגד',  color: 'text-red-500' },
  'נמנע': { icon: '🤷', label: 'נמנע', color: 'text-[#8b6f47]' },
}

export default function VotesTracker() {
  const [activePollId, setActivePollId] = useState<string | null>(null)

  const { data: group } = trpc.committee.getMyBuildingGroup.useQuery()

  const { data: messages = [] } = trpc.tenant.getChatMessages.useQuery(
    { groupId: (group as { id?: string } | undefined)?.id ?? '' },
    { enabled: !!(group as { id?: string } | undefined)?.id }
  )

  const polls = messages.filter((m: { message_type?: string; poll_id?: string }) => m.message_type === 'poll' && m.poll_id)

  const votesTrackerSidebar = [
    { to: '/committee', icon: '🏠', label: 'ראשי' },
    { to: '/votes-tracker', icon: '📊', label: 'מעקב הצבעות' },
    { to: '/committee-actions', icon: '📢', label: 'שידורים' },
    { to: '/committee', icon: '📝', label: 'פרוטוקולים' },
    { to: '/committee', icon: '👥', label: 'דיירים' },
  ]

  if (!group) return (
    <PageLayout sidebarItems={votesTrackerSidebar}>
      <LoadingScreen />
    </PageLayout>
  )

  return (
    <PageLayout sidebarItems={votesTrackerSidebar}>
      <div>
        <PageTitle>📊 מעקב הצבעות לפי דירות</PageTitle>
        <p className="mt-0.5 text-[13px] text-[#5a5a6e] mb-6">דירה = קול אחד · מעקב בזמן אמת</p>

        {polls.length === 0 ? (
          <div className="text-center py-16 text-[#5a5a6e]">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-[15px]">אין סקרים עדיין בקבוצת הבניין</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {polls.map((msg: { poll_id?: string }) => (
              <ApartmentPollCard
                key={msg.poll_id}
                pollId={msg.poll_id!}
                isActive={activePollId === msg.poll_id}
                onToggle={() => setActivePollId(activePollId === msg.poll_id ? null : msg.poll_id ?? null)}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

type ApartmentInfo = {
  apartmentId: string
  unitNumber: string
  floor: string
  status: string
  voteValue?: string
  decidedBy?: string
}

function ApartmentPollCard({ pollId, isActive, onToggle }: {
  pollId: string
  isActive: boolean
  onToggle: () => void
}) {
  const { data: poll } = trpc.tenant.getPollDetails.useQuery({ pollId })
  const { data: apartmentData } = trpc.committee.getApartmentVotesForPoll.useQuery(
    { pollId },
    { enabled: isActive }
  )

  if (!poll) return null
  const p = poll as { question?: string; status?: string; threshold_pct?: number }

  const totalApt = apartmentData?.totalApartments ?? 0
  const votedApt = apartmentData?.votedCount ?? 0
  const pct = totalApt > 0 ? Math.round((votedApt / totalApt) * 100) : 0
  const threshold = p.threshold_pct ?? 60

  const apartments = (apartmentData?.apartments ?? []) as unknown as ApartmentInfo[]

  // Count by vote value
  const voteCounts = apartments.reduce((acc, apt) => {
    if (apt.voteValue && (apt.status === 'voted' || apt.status === 'proxy')) {
      acc[apt.voteValue] = (acc[apt.voteValue] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Count by status
  const statusCounts = apartments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Sort apartments: not voted first, then pending, blocked, proxy, voted
  const sortedApartments = [...apartments].sort((a, b) => {
    const orderA = STATUS_CONFIG[a.status]?.order ?? 5
    const orderB = STATUS_CONFIG[b.status]?.order ?? 5
    if (orderA !== orderB) return orderA - orderB
    return Number(a.floor) - Number(b.floor)
  })

  const notVotedCount = (statusCounts['not_started'] ?? 0) + (statusCounts['pending'] ?? 0)

  return (
    <div className="sc-card overflow-hidden border-t-4 border-t-sc-primary">
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer text-right">
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 ${
          p.status === 'open' ? 'bg-[#ebf1f7]' : 'bg-[#4a8c5c]/15'
        }`}>
          {p.status === 'open' ? '📊' : '✅'}
        </div>
        <div className="flex-1 text-right min-w-0">
          <div className="text-sm font-bold text-[#212121] truncate">{p.question}</div>
          <div className="text-xs text-[#5a5a6e] mt-0.5">
            {votedApt}/{totalApt} דירות הצביעו · {p.status === 'open' ? <span className="bg-[#fcf4e7] text-[#c4841d] text-[10px] rounded-full px-2 py-0.5 font-semibold">פתוח</span> : <span className="bg-[#edf5ef] text-[#4a8c5c] text-[10px] rounded-full px-2 py-0.5 font-semibold">סגור</span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`text-base font-extrabold ${pct >= threshold ? 'text-[#4a8c5c]' : 'text-[#3b6b9c]'}`}>
            {pct}%
          </div>
          <span className="text-[11px] text-[#5a5a6e]">{isActive ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-2 bg-[#f0f0f0] relative mx-4 rounded-full mb-3">
        <div
          className="h-full bg-[#3b6b9c] transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        {p.threshold_pct && (
          <div
            className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-red-500 rounded"
            style={{ left: `${p.threshold_pct}%` }}
            title={`סף: ${p.threshold_pct}%`}
          />
        )}
      </div>

      {/* Expanded: full breakdown */}
      {isActive && apartmentData && (
        <div className="px-4 pb-4">

          {/* Vote results summary - how many for/against */}
          {Object.keys(voteCounts).length > 0 && (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-3 mb-3">
              <div className="text-xs font-bold text-[#3b6b9c] mb-2">תוצאות ההצבעה</div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(voteCounts).map(([value, count]) => {
                  const vl = VOTE_LABELS[value]
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <span className="text-lg">{vl?.icon ?? '📌'}</span>
                      <div>
                        <div className={`text-lg font-extrabold ${vl?.color ?? 'text-[#212121]'}`}>{count}</div>
                        <div className="text-[11px] text-[#5a5a6e]">{vl?.label ?? value}</div>
                      </div>
                    </div>
                  )
                })}
                {notVotedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">❓</span>
                    <div>
                      <div className="text-lg font-extrabold text-[#5a5a6e]">{notVotedCount}</div>
                      <div className="text-[11px] text-[#5a5a6e]">חסרים</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(statusCounts)
              .sort(([a], [b]) => (STATUS_CONFIG[a]?.order ?? 5) - (STATUS_CONFIG[b]?.order ?? 5))
              .map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started
                return (
                  <span key={status} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon} {count} {cfg.label}
                  </span>
                )
              })}
          </div>

          {/* Apartment list - scrollable */}
          <div className="text-xs font-bold text-[#3b6b9c] mb-2 uppercase tracking-wider">
            רשימת דירות ({totalApt})
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-[#e5e7eb] divide-y divide-[#e5e7eb]">
            {sortedApartments.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.not_started
              const vl = apt.voteValue ? VOTE_LABELS[apt.voteValue] : null
              return (
                <div key={apt.apartmentId} className={`flex items-center gap-3 p-3 ${cfg.bg}`}>
                  <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#212121]">
                      דירה {apt.unitNumber} · קומה {apt.floor}
                    </div>
                    <div className={`text-[11px] ${cfg.color}`}>
                      {cfg.label}
                    </div>
                  </div>
                  {/* Vote value badge */}
                  {apt.voteValue && apt.status !== 'blocked' && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      vl ? `${vl.color} bg-white border border-current/20` : 'text-[#5a5a6e] bg-white'
                    }`}>
                      {vl?.icon} {vl?.label ?? apt.voteValue}
                    </div>
                  )}
                  {/* Decided by */}
                  {apt.decidedBy && apt.status === 'voted' && apt.decidedBy !== 'unanimous' && (
                    <span className="text-[10px] text-[#5a5a6e] bg-white/60 px-1.5 py-0.5 rounded">
                      {apt.decidedBy === 'majority' ? 'רוב' : apt.decidedBy}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
