import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'

type Candidate = { userId: string; fullName: string; avatarUrl: string | null }

const STEP_LABELS = ['הצגת מועמדים', 'הצבעה', 'תוצאות']

export default function ElectRepresentatives() {
  const navigate = useNavigate()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [nominees, setNominees] = useState<Set<string>>(new Set())
  const [selectedVotes, setSelectedVotes] = useState<Set<string>>(new Set())
  const MAX_REPS = 4
  const MIN_REPS = 2

  const token = localStorage.getItem('sb-token')
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!token })
  const currentUserId = (me as any)?.id ?? ''

  const { data: tenants, isLoading } = trpc.tenant.getBuildingTenants.useQuery()
  const { data: existingReps } = trpc.tenant.getBuildingRepresentatives.useQuery()
  const { data: group } = trpc.tenant.getMyBuildingGroup.useQuery()

  // If there are already active reps, show results
  useEffect(() => {
    if (existingReps && existingReps.length >= MIN_REPS) {
      setStep(2)
    }
  }, [existingReps])

  // Auto-include self as nominee
  const toggleNominee = (userId: string) => {
    setNominees(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else if (next.size < 6) next.add(userId) // max 6 candidates
      return next
    })
  }

  const toggleVote = (userId: string) => {
    setSelectedVotes(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else if (next.size < MAX_REPS) next.add(userId)
      return next
    })
  }

  const createElectionPoll = trpc.committee.createPoll.useMutation({
    onSuccess: () => setStep(1),
  })

  const handleStartElection = () => {
    if (!group?.id || nominees.size < MIN_REPS) return
    const candidateNames = (tenants ?? [])
      .filter((t: Candidate) => nominees.has(t.userId))
      .map((t: Candidate) => t.fullName)
    createElectionPoll.mutate({
      question: 'בחר נציגים לוועד הבניין (2-4)',
      options: candidateNames,
      isAnonymous: false,
      pollType: 'multiple',
      thresholdPct: 50,
      groupId: group.id,
    })
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <BuildingLoader size="md" />
        </div>
      </PageLayout>
    )
  }

  const tenantList = (tenants ?? []) as Candidate[]

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-12" dir="rtl">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[#3b6b9c] text-sm font-medium flex items-center gap-1 mb-4"
        >
          → חזרה לדף הבית
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🗳️</div>
          <h1 className="text-2xl font-bold text-[#212121] mb-2">בחירת נציגות הבניין</h1>
          <p className="text-[#5a5a6e] text-sm">בחרו 2-4 נציגים שייצגו את הדיירים מול היזם</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step > i
                      ? 'bg-[#4a8c5c] text-white'
                      : step === i
                      ? 'bg-[#3b6b9c] text-white shadow-[0_0_0_4px_rgba(59,107,156,0.2)]'
                      : 'bg-[#eeeeee] text-[#5a5a6e]'
                  }`}
                >
                  {step > i ? '✓' : i + 1}
                </div>
                <span
                  className={`text-[10px] whitespace-nowrap ${
                    step === i ? 'text-[#3b6b9c] font-semibold' : 'text-[#5a5a6e]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 mb-5 ${
                    step > i ? 'bg-[#4a8c5c]' : 'bg-[#eeeeee]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Nominate Candidates */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="sc-card p-5">
              <h2 className="text-lg font-bold text-[#212121] mb-1">הצעת מועמדים</h2>
              <p className="text-sm text-[#5a5a6e] mb-4">
                בחרו מועמדים מרשימת הדיירים (לפחות {MIN_REPS})
              </p>
              <div className="space-y-2">
                {tenantList.map((t) => {
                  const isNominated = nominees.has(t.userId)
                  const isMe = t.userId === currentUserId
                  return (
                    <button
                      key={t.userId}
                      onClick={() => toggleNominee(t.userId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${
                        isNominated
                          ? 'border-[#3b6b9c] bg-[#ebf1f7]'
                          : 'border-[#eeeeee] bg-white hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isNominated
                            ? 'bg-[#3b6b9c] text-white'
                            : 'bg-[#eeeeee] text-[#5a5a6e]'
                        }`}
                      >
                        {isNominated ? '✓' : t.fullName?.[0] ?? '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#212121] text-sm">
                          {t.fullName} {isMe && <span className="text-[#3b6b9c]">(אני)</span>}
                        </p>
                      </div>
                      {isNominated && (
                        <span className="sc-badge bg-[#3b6b9c]/10 text-[#3b6b9c] text-xs">
                          מועמד/ת
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {nominees.size > 0 && (
              <div className="sc-card p-4 bg-[#ebf1f7]/50">
                <p className="text-sm text-[#3b6b9c] font-semibold mb-2">
                  {nominees.size} מועמדים נבחרו
                </p>
                <div className="flex flex-wrap gap-2">
                  {tenantList
                    .filter((t) => nominees.has(t.userId))
                    .map((t) => (
                      <span
                        key={t.userId}
                        className="bg-[#3b6b9c] text-white text-xs px-3 py-1.5 rounded-full font-medium"
                      >
                        {t.fullName}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={handleStartElection}
              disabled={nominees.size < MIN_REPS || createElectionPoll.isPending || !group?.id}
              className="sc-btn-primary w-full py-3 text-base disabled:opacity-40"
            >
              {createElectionPoll.isPending
                ? 'יוצר הצבעה...'
                : `התחל הצבעה (${nominees.size} מועמדים)`}
            </button>
            {!group?.id && (
              <p className="text-center text-sm text-red-500">
                יש להצטרף לקבוצת הבניין לפני בחירת נציגות
              </p>
            )}
          </div>
        )}

        {/* Step 1: Voting In Progress */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="sc-card p-6 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-xl font-bold text-[#212121] mb-2">ההצבעה פעילה!</h2>
              <p className="text-[#5a5a6e] text-sm mb-6">
                ההצבעה נשלחה לקבוצת הבניין. היכנסו לצ'אט כדי להצביע.
              </p>
              <button
                onClick={() => group?.id && navigate(`/building-chat/${group.id}`)}
                className="sc-btn-primary px-8 py-3"
              >
                🏢 עבור לצ'אט הבניין
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && existingReps && existingReps.length > 0 && (
          <div className="space-y-4">
            <div className="sc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <h2 className="text-lg font-bold text-[#212121]">הנציגות שנבחרה</h2>
              </div>
              <div className="space-y-3">
                {(existingReps as any[]).map((rep, i) => (
                  <div
                    key={rep.id || i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#f0fdf4] border border-[#4a8c5c]/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#4a8c5c] flex items-center justify-center text-white font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#212121] text-sm">
                        {rep.profile?.full_name ?? 'נציג'}
                      </p>
                      <p className="text-xs text-[#5a5a6e]">נציג/ת בניין</p>
                    </div>
                    <span className="sc-badge bg-[#4a8c5c]/10 text-[#4a8c5c] text-xs">
                      ✅ פעיל
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/committee-protocol')}
              className="sc-btn-primary w-full py-3 text-base"
            >
              ✍️ המשך לחתימה על פרוטוקול
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
