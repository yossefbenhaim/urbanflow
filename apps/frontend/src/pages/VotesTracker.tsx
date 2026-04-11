import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import LoadingScreen from '../components/LoadingScreen'

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  voted:       { icon: '✅', label: 'הצביעה',              color: 'text-[#4a8c5c]',  bg: 'bg-[#4a8c5c]/10' },
  pending:     { icon: '⏳', label: 'ממתינה לבעלים נוספים', color: 'text-[#8b6f47]',  bg: 'bg-[#8b6f47]/10' },
  blocked:     { icon: '🔒', label: 'חסומה (סכסוך)',       color: 'text-red-500',    bg: 'bg-red-500/10' },
  proxy:       { icon: '📜', label: 'מיופה כוח הצביע',     color: 'text-[#4DB6C4]', bg: 'bg-[#4DB6C4]/10' },
  not_started: { icon: '⬜', label: 'לא הצביעה',           color: 'text-[#5a5a6e]',   bg: 'bg-[#f8f9fa]' },
}

export default function VotesTracker() {
  const navigate = useNavigate()
  const [activePollId, setActivePollId] = useState<string | null>(null)

  const { data: group } = trpc.committee.getMyBuildingGroup.useQuery()

  // Get all polls in building group
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

  return (
    <div className="sc-card overflow-hidden border-t-4 border-t-sc-primary">
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer text-right">
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 ${
          p.status === 'open' ? 'bg-[#ebf1f7]' : 'bg-[#4a8c5c]/15'
        }`}>
          {p.status === 'open' ? '📊' : '✅'}
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-bold text-[#212121]">{p.question}</div>
          <div className="text-xs text-[#5a5a6e] mt-0.5">
            {votedApt}/{totalApt} דירות הצביעו · {p.status === 'open' ? <span className="bg-[#fcf4e7] text-[#c4841d] text-[10px] rounded-full px-2 py-0.5 font-semibold">פתוח</span> : <span className="bg-[#edf5ef] text-[#4a8c5c] text-[10px] rounded-full px-2 py-0.5 font-semibold">סגור</span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`text-base font-extrabold ${pct >= (p.threshold_pct ?? 60) ? 'text-[#4a8c5c]' : 'text-[#3b6b9c]'}`}>
            {pct}%
          </div>
          <span className="text-[11px] text-[#5a5a6e]">{isActive ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#f8f9fa] relative">
        <div
          className="h-full bg-[#3b6b9c] transition-all duration-500 rounded-r"
          style={{ width: `${pct}%` }}
        />
        {p.threshold_pct && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${p.threshold_pct}%` }}
            title={`סף: ${p.threshold_pct}%`}
          />
        )}
      </div>

      {/* Expanded: apartment list */}
      {isActive && apartmentData && (
        <div className="p-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(
              (apartmentData.apartments as { status: string }[]).reduce((acc: Record<string, number>, a) => {
                acc[a.status] = (acc[a.status] ?? 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started
              return (
                <span key={status} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon} {count} {cfg.label}
                </span>
              )
            })}
          </div>

          {/* Apartment grid */}
          <div className="text-xs font-bold text-[#3b6b9c] mb-2.5 uppercase tracking-wider">
            רשימת דירות
          </div>
          <div className="space-y-1.5">
            {(apartmentData.apartments as unknown as { apartmentId: string; unitNumber: string; floor: string; status: string; voteValue?: string; decidedBy?: string }[]).map((apt) => {
              const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.not_started
              return (
                <div key={apt.apartmentId} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg} transition-colors`}>
                  <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#212121]">
                      דירה {apt.unitNumber} · קומה {apt.floor}
                    </div>
                    <div className={`text-[11px] ${cfg.color}`}>
                      {cfg.label}
                      {apt.voteValue && apt.status !== 'blocked' && (
                        <span className="mr-1 text-[#5a5a6e]">· {apt.voteValue}</span>
                      )}
                      {apt.decidedBy && apt.status === 'voted' && apt.decidedBy !== 'unanimous' && (
                        <span className="mr-1 text-[#5a5a6e]">({apt.decidedBy === 'majority' ? 'רוב' : apt.decidedBy})</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
