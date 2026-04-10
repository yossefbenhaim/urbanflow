import { useState } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { trpc } from '../lib/trpc'

function WeeklyUpdateForm({ projectId }: { projectId: string }) {
  const [form, setForm] = useState({
    statusUpdate: '',
    progressPct: 0,
    blockers: '',
    nextSteps: '',
  })
  const utils = trpc.useUtils()
  const submit = trpc.provider.submitWeeklyUpdate.useMutation({
    onSuccess: () => {
      utils.provider.getTimeline.invalidate({ projectId })
      setForm({ statusUpdate: '', progressPct: 0, blockers: '', nextSteps: '' })
    },
  })

  return (
    <div className="sc-card p-6 border-t-4 border-t-sc-primary">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-xl">📝</div>
        <div>
          <h3 className="text-base font-bold text-[#212121]">עדכון שבועי</h3>
          <p className="text-xs text-[#5a5a6e]">עדכן את סטטוס העבודה השבועי</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#212121] mb-1">סטטוס עדכני *</label>
          <textarea
            value={form.statusUpdate}
            onChange={e => setForm(f => ({ ...f, statusUpdate: e.target.value }))}
            placeholder="מה בוצע השבוע?"
            rows={3}
            className="sc-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#212121] mb-1">אחוז התקדמות: {form.progressPct}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.progressPct}
            onChange={e => setForm(f => ({ ...f, progressPct: parseInt(e.target.value) }))}
            className="w-full accent-sc-primary"
          />
          <div className="flex justify-between text-xs text-[#5a5a6e]">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#212121] mb-1">חסמים</label>
          <textarea
            value={form.blockers}
            onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
            placeholder="יש משהו שמעכב? (אופציונלי)"
            rows={2}
            className="sc-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#212121] mb-1">צעדים הבאים</label>
          <textarea
            value={form.nextSteps}
            onChange={e => setForm(f => ({ ...f, nextSteps: e.target.value }))}
            placeholder="מה מתוכנן לשבוע הבא? (אופציונלי)"
            rows={2}
            className="sc-input w-full"
          />
        </div>

        <button
          onClick={() => submit.mutate({
            projectId,
            statusUpdate: form.statusUpdate,
            progressPct: form.progressPct,
            blockers: form.blockers || undefined,
            nextSteps: form.nextSteps || undefined,
          })}
          disabled={!form.statusUpdate || submit.isPending}
          className="sc-btn-primary w-full py-2.5 disabled:opacity-50"
        >
          {submit.isPending ? 'שולח...' : '📤 שלח עדכון'}
        </button>
        {submit.isError && <p className="text-red-500 text-sm text-center">שגיאה בשליחה</p>}
        {submit.isSuccess && <p className="text-[#4a8c5c] text-sm text-center">✅ העדכון נשלח בהצלחה!</p>}
      </div>
    </div>
  )
}

function TimelineView({ projectId }: { projectId: string }) {
  const { data: timeline, isLoading } = trpc.provider.getTimeline.useQuery({ projectId })

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
    </div>
  )

  if (!timeline || timeline.length === 0) return (
    <div className="sc-card p-8 text-center">
      <div className="text-4xl mb-3">📅</div>
      <p className="text-[#5a5a6e] text-sm">אין עדכונים עדיין</p>
    </div>
  )

  // Group by provider
  type TimelineEntry = typeof timeline[number]
  const byProvider: Record<string, TimelineEntry[]> = {}
  for (const entry of timeline) {
    const name = (entry as { provider?: { full_name?: string } }).provider?.full_name ?? 'לא ידוע'
    if (!byProvider[name]) byProvider[name] = []
    byProvider[name].push(entry)
  }

  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {Object.entries(byProvider).map(([providerName, entries]) => {
        const latest = entries[0]
        const isCurrentWeek = (latest as { week_start?: string }).week_start === weekStart
        const progress = (latest as { progress_pct?: number }).progress_pct ?? 0

        return (
          <div key={providerName} className="sc-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3b6b9c]/10 flex items-center justify-center text-lg">👷</div>
                <div>
                  <h3 className="text-base font-bold text-[#212121]">{providerName}</h3>
                  <p className="text-xs text-[#5a5a6e]">
                    עדכון אחרון: {new Date((latest as { updated_at?: string }).updated_at ?? '').toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              {!isCurrentWeek && (
                <span className="bg-[#8b6f47]/15 text-[#8b6f47] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  ⚠️ לא עודכן השבוע
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#5a5a6e]">התקדמות כללית</span>
                <span className="font-bold text-[#212121]">{progress}%</span>
              </div>
              <div className="w-full bg-sc-border rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    progress >= 75 ? 'bg-[#4a8c5c]/100' : progress >= 40 ? 'bg-[#3b6b9c]' : 'bg-[#8b6f47]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Timeline entries */}
            <div className="space-y-3 border-r-2 border-[#3b6b9c]/20 pr-4 mr-2">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="relative">
                  <div className="absolute -right-[1.35rem] top-1.5 w-3 h-3 rounded-full bg-[#3b6b9c] border-2 border-white" />
                  <div className="bg-[#f8f9fa] rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-[#3b6b9c]">
                        שבוע {new Date(entry.week_start).toLocaleDateString('he-IL')}
                      </span>
                      <span className="text-xs text-[#5a5a6e]">{entry.progress_pct}%</span>
                    </div>
                    <p className="text-sm text-[#212121]">{entry.status_update}</p>
                    {entry.blockers && (
                      <p className="text-xs text-[#8b6f47] mt-1">🚧 {entry.blockers}</p>
                    )}
                    {entry.next_steps && (
                      <p className="text-xs text-[#3b6b9c] mt-1">📋 {entry.next_steps}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TimelinePage() {
  const { data: project, isLoading: projectLoading } = trpc.tenant.getMyProject.useQuery(undefined, { retry: false })
  const { data: activeProjects } = trpc.provider.getActiveProjects.useQuery(undefined, { retry: false })
  const [activeTab, setActiveTab] = useState<'view' | 'update'>('view')

  const isProvider = activeProjects && activeProjects.length > 0
  const projectId = (project as { id?: string } | null)?.id ?? (activeProjects?.[0] as { id?: string } | undefined)?.id

  if (projectLoading) return (
    <PageLayout>
      
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
      </div>
    </PageLayout>
  )

  if (!projectId) return (
    <PageLayout>
      
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h1 className="text-xl font-bold text-[#212121] mb-2">לוח זמנים</h1>
        <p className="text-[#5a5a6e]">טרם שויכת לפרויקט</p>
      </div>
    </PageLayout>
  )

  return (
    <PageLayout>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-2xl">📅</div>
          <div>
            <h1 className="text-xl font-bold text-[#212121]">לוח זמנים — עדכונים שבועיים</h1>
            <p className="text-sm text-[#5a5a6e]">מעקב אחר התקדמות נותני השירות בפרויקט</p>
          </div>
        </div>

        {/* Tabs for providers */}
        {isProvider && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'view'
                  ? 'bg-[#3b6b9c] text-white'
                  : 'bg-white text-[#212121] border border-[#eeeeee]'
              }`}
            >
              📊 צפה בעדכונים
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'update'
                  ? 'bg-[#3b6b9c] text-white'
                  : 'bg-white text-[#212121] border border-[#eeeeee]'
              }`}
            >
              📝 שלח עדכון
            </button>
          </div>
        )}

        {activeTab === 'update' && isProvider ? (
          <WeeklyUpdateForm projectId={projectId} />
        ) : (
          <TimelineView projectId={projectId} />
        )}
      </div>
    </PageLayout>
  )
}
