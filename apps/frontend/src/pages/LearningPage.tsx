import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

const STAGE_LABELS: Record<string, string> = {
  initial: 'שלב ראשוני',
  representation: 'ייצוג דיירים',
  inspections: 'בדיקות ושמאות',
  tender: 'מכרז יזמים',
  evacuation: 'פינוי ובנייה',
}

const TYPE_ICONS: Record<string, string> = {
  video: '🎬',
  article: '📄',
  infographic: '📊',
  quiz: '🧠',
}

export default function LearningPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('sb-token'))
  }, [])

  const content = trpc.learning.getAllContent.useQuery()
  const progress = trpc.learning.getProgress.useQuery(undefined, { enabled: isLoggedIn })
  const markCompleted = trpc.learning.markCompleted.useMutation({
    onSuccess: () => progress.refetch(),
  })

  const completedIds = new Set(
    (progress.data?.progress ?? [])
      .filter((p: any) => p.completed)
      .map((p: any) => p.content_id)
  )

  const items = content.data ?? []

  // Group by stage
  const grouped: Record<string, any[]> = items.reduce((acc: Record<string, any[]>, item: any) => {
    const stage = item.stage || 'other'
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(item)
    return acc
  }, {} as Record<string, any[]>)

  const completedCount = progress.data?.completed ?? 0
  const totalCount = progress.data?.total ?? items.length

  return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-sc-dark mb-2">📚 מרכז הלמידה</h1>
          <p className="text-sc-gray text-sm">
            למד על תהליך פינוי בינוי — סרטונים ומאמרים בשפה פשוטה
          </p>
        </div>

        {/* Progress Bar */}
        {isLoggedIn && totalCount > 0 && (
          <div className="sc-card p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-sc-dark">
                התקדמות: {completedCount}/{totalCount} הושלמו
              </span>
              <span className="text-xs text-sc-gray">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                }}
              />
            </div>
          </div>
        )}

        {/* Content by Stage */}
        {content.isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">📚</div>
            <p className="text-sc-gray">טוען תכנים...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="sc-card p-8 text-center">
            <p className="text-sc-gray">אין תכנים זמינים כרגע.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([stage, stageItems]) => (
            <div key={stage} className="mb-8">
              <h2 className="text-lg font-bold text-sc-dark mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  {STAGE_LABELS[stage]?.[0] || '📋'}
                </span>
                {STAGE_LABELS[stage] || stage}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {stageItems.map((item: any) => {
                  const isCompleted = completedIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className={`sc-card overflow-hidden transition-all ${isCompleted ? 'ring-2 ring-green-400' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div
                        className="h-32 flex items-center justify-center text-5xl"
                        style={{
                          background: isCompleted
                            ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                            : 'linear-gradient(135deg, #dbeafe, #c7d2fe)',
                        }}
                      >
                        {isCompleted ? '✅' : TYPE_ICONS[item.content_type] || '📄'}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{TYPE_ICONS[item.content_type] || '📄'}</span>
                          <span className="text-xs text-sc-gray">
                            {item.content_type === 'video' ? 'סרטון' : 'מאמר'}
                            {item.duration_minutes ? ` · ${item.duration_minutes} דק'` : ''}
                          </span>
                        </div>
                        <h3 className="font-bold text-sc-dark text-base mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sc-gray text-sm mb-3 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={item.content_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sc-btn-primary text-sm px-4 py-2 flex-1 text-center"
                          >
                            👁️ צפה
                          </a>
                          {isLoggedIn && !isCompleted && (
                            <button
                              onClick={() => markCompleted.mutate({ contentId: item.id })}
                              disabled={markCompleted.isPending}
                              className="text-sm px-3 py-2 border border-green-400 text-green-600 rounded-lg hover:bg-green-50 transition"
                            >
                              ✓ סיימתי
                            </button>
                          )}
                          {isCompleted && (
                            <span className="text-sm px-3 py-2 text-green-600 font-medium">
                              ✅ הושלם
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
