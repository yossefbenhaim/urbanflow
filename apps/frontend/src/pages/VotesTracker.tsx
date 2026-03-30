import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'
import BuildingLoader from '../components/BuildingLoader'

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  voted:       { icon: '✅', label: 'הצביעה',              color: 'text-green-600',  bg: 'bg-green-50' },
  pending:     { icon: '⏳', label: 'ממתינה לבעלים נוספים', color: 'text-amber-600',  bg: 'bg-amber-50' },
  blocked:     { icon: '🔒', label: 'חסומה (סכסוך)',       color: 'text-red-600',    bg: 'bg-red-50' },
  proxy:       { icon: '📜', label: 'מיופה כוח הצביע',     color: 'text-purple-600', bg: 'bg-purple-50' },
  not_started: { icon: '⬜', label: 'לא הצביעה',           color: 'text-gray-500',   bg: 'bg-gray-50' },
}

export default function VotesTracker() {
  const navigate = useNavigate()
  const [activePollId, setActivePollId] = useState<string | null>(null)

  const { data: group } = trpc.committee.getMyBuildingGroup.useQuery()

  // Get all polls in building group
  const { data: messages = [] } = trpc.tenant.getChatMessages.useQuery(
    { groupId: (group as any)?.id ?? '' },
    { enabled: !!(group as any)?.id }
  )

  const polls = (messages as any[]).filter(m => m.message_type === 'poll' && m.poll_id)

  if (!group) return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64"><BuildingLoader size="lg" /></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sc-bg page-content" dir="rtl">
      <Navbar />
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/committee-actions')}
            className="bg-sc-bg border-none rounded-[10px] px-3.5 py-2 cursor-pointer text-sc-blue font-semibold text-sm">
            ‹ חזרה
          </button>
          <div>
            <h1 className="sc-section-title text-xl m-0">📊 מעקב הצבעות לפי דירות</h1>
            <p className="mt-0.5 text-[13px] text-sc-gray">דירה = קול אחד · מעקב בזמן אמת</p>
          </div>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-16 text-sc-gray">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-[15px]">אין סקרים עדיין בקבוצת הבניין</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {polls.map((msg: any) => (
              <ApartmentPollCard
                key={msg.poll_id}
                pollId={msg.poll_id}
                isActive={activePollId === msg.poll_id}
                onToggle={() => setActivePollId(activePollId === msg.poll_id ? null : msg.poll_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
  const p = poll as any

  const totalApt = apartmentData?.totalApartments ?? 0
  const votedApt = apartmentData?.votedCount ?? 0
  const pct = totalApt > 0 ? Math.round((votedApt / totalApt) * 100) : 0

  return (
    <div className="sc-card overflow-hidden border-t-4 border-t-sc-blue">
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer text-right">
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 ${
          p.status === 'open' ? 'bg-sc-blue-pale' : 'bg-green-100'
        }`}>
          {p.status === 'open' ? '📊' : '✅'}
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-bold text-sc-dark">{p.question}</div>
          <div className="text-xs text-sc-gray mt-0.5">
            {votedApt}/{totalApt} דירות הצביעו · {p.status === 'open' ? '🟢 פתוח' : '🔴 סגור'}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`text-base font-extrabold ${pct >= (p.threshold_pct ?? 60) ? 'text-green-600' : 'text-sc-blue'}`}>
            {pct}%
          </div>
          <span className="text-[11px] text-sc-gray">{isActive ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 relative">
        <div
          className="h-full bg-sc-blue transition-all duration-500 rounded-r"
          style={{ width: `${pct}%` }}
        />
        {p.threshold_pct && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-400"
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
              (apartmentData.apartments as any[]).reduce((acc: Record<string, number>, a: any) => {
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
          <div className="text-xs font-bold text-sc-blue mb-2.5 uppercase tracking-wider">
            רשימת דירות
          </div>
          <div className="space-y-1.5">
            {(apartmentData.apartments as any[]).map((apt: any) => {
              const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.not_started
              return (
                <div key={apt.apartmentId} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg} transition-colors`}>
                  <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-sc-dark">
                      דירה {apt.unitNumber} · קומה {apt.floor}
                    </div>
                    <div className={`text-[11px] ${cfg.color}`}>
                      {cfg.label}
                      {apt.voteValue && apt.status !== 'blocked' && (
                        <span className="mr-1 text-gray-500">· {apt.voteValue}</span>
                      )}
                      {apt.decidedBy && apt.status === 'voted' && apt.decidedBy !== 'unanimous' && (
                        <span className="mr-1 text-gray-400">({apt.decidedBy === 'majority' ? 'רוב' : apt.decidedBy})</span>
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
