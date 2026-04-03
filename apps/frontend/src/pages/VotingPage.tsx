import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'

const VOTE_TYPES: Record<string, { title: string; icon: string; description: string }> = {
  developer_selection: { title: 'בחירת יזם', icon: '🏗️', description: 'הצבעה לבחירת היזם שיבצע את הפרויקט' },
  lawyer_approval: { title: 'אישור עו"ד', icon: '⚖️', description: 'אישור עורך הדין שייצג את הדיירים' },
  proposal_approval: { title: 'אישור הצעה', icon: '📝', description: 'אישור הצעה שהוגשה לפרויקט' },
  representative_election: { title: 'בחירת נציג', icon: '👤', description: 'בחירת נציג הוועד מבין הדיירים' },
  apartment_count: { title: 'ספירת דירות', icon: '🏢', description: 'אימות כמות הדירות בבניין' },
}

const STATUS_ICONS: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  open: { icon: '⏳', label: 'מתקיימת כעת', color: 'text-[#8b6f47]', bg: 'bg-[#8b6f47]/10' },
  resolved: { icon: '✅', label: 'הסתיימה', color: 'text-[#4a8c5c]', bg: 'bg-[#4a8c5c]/10' },
  closed: { icon: '🔒', label: 'סגורה', color: 'text-[#5a5a6e]', bg: 'bg-gray-100' },
}

export default function VotingPage() {
  const { data: group, isLoading: groupLoading } = trpc.tenant.getMyBuildingGroup.useQuery()

  const { data: messages = [], isLoading: msgsLoading } = trpc.tenant.getChatMessages.useQuery(
    { groupId: (group as any)?.id ?? '' },
    { enabled: !!(group as any)?.id }
  )

  const isLoading = groupLoading || msgsLoading
  const polls = (messages as any[]).filter(m => m.message_type === 'poll' && m.poll_id)

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <BuildingLoader size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (!group) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="text-5xl mb-4">🗳️</div>
          <p className="text-[#5a5a6e] text-lg">אין קבוצת בניין פעילה</p>
          <p className="text-[#5a5a6e] text-[13px] mt-1">הצבעות יופיעו כאן לאחר הצטרפות לבניין</p>
        </div>
      </PageLayout>
    )
  }

  // Categorize polls by relevance
  const relevantTypes = ['developer_selection', 'lawyer_approval', 'proposal_approval', 'representative_election']
  const relevantPolls = polls.filter((p: any) => {
    // All polls are relevant in tenant flow
    return true
  })

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <PageTitle>🗳️ הצבעות</PageTitle>
        <p className="text-[13px] text-[#5a5a6e] -mt-3 mb-6">
          כאן מוצגות כל ההצבעות הרלוונטיות לפרויקט — בחירת יזם, אישור עו"ד, ועוד
        </p>

        {relevantPolls.length === 0 && (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] p-10 text-center">
            <div className="text-5xl mb-3">🗳️</div>
            <p className="text-[#5a5a6e] text-[15px]">אין הצבעות פעילות כרגע</p>
            <p className="text-[#5a5a6e] text-[13px] mt-1">כשיהיו הצבעות חדשות, תקבל/י הודעה</p>
          </div>
        )}

        <div className="space-y-4">
          {relevantPolls.map((msg: any) => (
            <VotePollCard key={msg.poll_id} pollId={msg.poll_id} />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

function VotePollCard({ pollId }: { pollId: string }) {
  const { data: poll, refetch } = trpc.tenant.getPollDetails.useQuery({ pollId })
  const castVote = trpc.tenant.castVote.useMutation({ onSuccess: () => refetch() })

  if (!poll) return null
  const p = poll as any

  const voteType = VOTE_TYPES[p.poll_type] ?? { title: p.question, icon: '📊', description: '' }
  const statusInfo = STATUS_ICONS[p.status] ?? STATUS_ICONS.open
  const pct = p.votePercent ?? 0
  const thresholdPct = p.threshold_pct ?? 60
  const hasVoted = !!p.myVote

  return (
    <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-[12px] bg-[#1e3a5f]/8 flex items-center justify-center text-xl flex-shrink-0">
            {voteType.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold text-[#212121]">{p.question}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>
            {voteType.description && (
              <p className="text-[12px] text-[#5a5a6e] mt-1">{voteType.description}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[12px] text-[#5a5a6e] mb-1.5">
            <span>{p.voteCount} מתוך {p.memberCount} דירות הצביעו</span>
            <span className={`font-bold ${pct >= thresholdPct ? 'text-[#4a8c5c]' : 'text-[#3b6b9c]'}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-[#f0f0f0] rounded-full h-3 relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= thresholdPct ? 'bg-[#4a8c5c]' : 'bg-[#3b6b9c]'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#8b6f47]"
              style={{ left: `${thresholdPct}%` }}
              title={`סף נדרש: ${thresholdPct}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#5a5a6e] mt-1">
            <span>0%</span>
            <span className="text-[#8b6f47]">סף: {thresholdPct}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* User vote status */}
        {hasVoted ? (
          <div className="flex items-center gap-2 bg-[#4a8c5c]/10 px-4 py-2.5 rounded-xl">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-[13px] font-semibold text-[#4a8c5c]">הצבעת בהצלחה</p>
              <p className="text-[11px] text-[#5a5a6e]">הבחירה שלך: {p.myVote}</p>
            </div>
          </div>
        ) : p.status === 'open' ? (
          <div className="bg-[#8b6f47]/8 px-4 py-2.5 rounded-xl">
            <p className="text-[13px] font-semibold text-[#8b6f47] mb-2">⏳ ממתין להצבעתך</p>

            {/* Voting options */}
            {p.candidates && p.candidates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {p.candidates.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => castVote.mutate({ pollId, value: c.id })}
                    disabled={castVote.isPending}
                    className="bg-white border border-[#8b6f47]/20 rounded-xl px-3 py-2.5 text-[13px] text-[#212121] font-medium hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition disabled:opacity-50"
                  >
                    👤 {c.full_name}
                  </button>
                ))}
              </div>
            ) : p.options && Array.isArray(p.options) ? (
              <div className="grid grid-cols-2 gap-2">
                {p.options.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => castVote.mutate({ pollId, value: opt })}
                    disabled={castVote.isPending}
                    className="bg-white border border-[#8b6f47]/20 rounded-xl px-3 py-2.5 text-[13px] text-[#212121] font-medium hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#5a5a6e]">ההצבעה מתנהלת בצ'אט הבניין</p>
            )}

            {castVote.isError && (
              <p className="text-red-500 text-[12px] mt-2">{castVote.error.message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-xl">
            <span className="text-lg">🔒</span>
            <p className="text-[13px] text-[#5a5a6e]">ההצבעה הסתיימה</p>
            {p.result_value && (
              <span className="mr-auto text-[13px] font-bold text-[#4a8c5c]">תוצאה: {p.result_value}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
