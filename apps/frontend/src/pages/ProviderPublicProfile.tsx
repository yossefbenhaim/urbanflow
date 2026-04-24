import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import PageLayout from '../components/PageLayout'

const PROVIDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  architect: { label: 'אדריכל', icon: '🏛️' },
  appraiser: { label: 'שמאי', icon: '📊' },
  developer: { label: 'יזם', icon: '🏢' },
  lawyer: { label: 'עו״ד', icon: '⚖️' },
}

export default function ProviderPublicProfile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { profile: me } = useUser()

  const { data, isLoading } = trpc.directory.getPublicProviderProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId, refetchOnMount: 'always', staleTime: 0 }
  )
  const startChat = trpc.chat.startConversation.useMutation({
    onSuccess: ({ conversationId }) => navigate(`/chat/${conversationId}`),
  })

  if (isLoading) {
    return <PageLayout><p className="text-center text-[#5a5a6e] py-12">טוען פרופיל...</p></PageLayout>
  }
  if (!data) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto p-6 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-[#5a5a6e] mb-4">הפרופיל לא נמצא</p>
          <button onClick={() => navigate(-1)} className="sc-btn-primary">חזרה</button>
        </div>
      </PageLayout>
    )
  }

  const typeBadge = data.providerType ? PROVIDER_TYPE_LABELS[data.providerType] : null
  const isMe = me?.id === data.userId

  return (
    <PageLayout>
      <div dir="rtl" className="max-w-2xl mx-auto p-4 pb-12">
        <button onClick={() => navigate(-1)} className="text-[#5a5a6e] text-sm mb-4">← חזרה</button>

        {/* Header card */}
        <div className="sc-card p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#ebf1f7] flex items-center justify-center border-2 border-[#eeeeee] flex-shrink-0">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-[#1e3a5f] font-bold">
                  {(data.fullName || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-[#212121]">{data.fullName}</h1>
              {typeBadge && (
                <div className="inline-flex items-center gap-1 bg-[#ebf1f7] text-[#3b6b9c] rounded-full px-3 py-1 text-xs font-semibold mt-1">
                  {typeBadge.icon} {typeBadge.label}
                </div>
              )}
              {data.mainCity && (
                <p className="text-sm text-[#5a5a6e] mt-2">📍 {data.mainCity}</p>
              )}
              {data.company && (
                <p className="text-sm text-[#5a5a6e]">🏢 {data.company}</p>
              )}
              {data.ratingCount > 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <span className="text-[#c4841d]">★</span>
                  <span className="font-semibold text-[#212121]">{data.ratingAvg?.toFixed(1)}</span>
                  <span className="text-[#8e8e9e]">({data.ratingCount} חוות דעת)</span>
                </div>
              )}
            </div>
          </div>

          {!isMe && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => startChat.mutate({ recipientId: data.userId })}
                disabled={startChat.isPending}
                className="flex-1 sc-btn-primary disabled:opacity-50"
              >
                {startChat.isPending ? 'פותח...' : '💬 שלח הודעה'}
              </button>
            </div>
          )}
          {isMe && (
            <button
              onClick={() => navigate('/provider/onboarding')}
              className="mt-4 w-full py-2 rounded-xl bg-white border border-[#eeeeee] text-[#5a5a6e] font-semibold"
            >
              ✏️ ערוך את הפרופיל שלי
            </button>
          )}
        </div>

        {/* About */}
        {data.about && (
          <div className="sc-card p-5 mb-4">
            <h2 className="font-bold text-[#1e3a5f] mb-2">על המקצוע</h2>
            <p className="text-[#212121] text-sm leading-relaxed whitespace-pre-wrap">{data.about}</p>
          </div>
        )}

        {/* Experience + specializations */}
        {(data.experienceYears != null || data.completedProjects != null || data.specializations.length > 0) && (
          <div className="sc-card p-5 mb-4 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">ניסיון והתמחויות</h2>
            <div className="grid grid-cols-2 gap-3">
              {data.experienceYears != null && (
                <div>
                  <p className="text-xs text-[#5a5a6e]">שנות ניסיון</p>
                  <p className="text-[#212121] font-semibold">{data.experienceYears} שנים</p>
                </div>
              )}
              {data.completedProjects != null && (
                <div>
                  <p className="text-xs text-[#5a5a6e]">פרויקטים שבוצעו</p>
                  <p className="text-[#212121] font-semibold">{data.completedProjects}</p>
                </div>
              )}
            </div>
            {data.specializations.length > 0 && (
              <div>
                <p className="text-xs text-[#5a5a6e] mb-1">התמחויות</p>
                <div className="flex gap-2 flex-wrap">
                  {data.specializations.map(s => (
                    <span key={s} className="bg-[#ebf1f7] text-[#3b6b9c] px-2.5 py-1 rounded-full text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Portfolio links */}
        {data.portfolioUrls.length > 0 && (
          <div className="sc-card p-5 mb-4">
            <h2 className="font-bold text-[#1e3a5f] mb-2">תיק עבודות</h2>
            <div className="flex flex-col gap-1.5">
              {data.portfolioUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener" className="text-[#3b6b9c] text-sm underline break-all">
                  {safeHost(url)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* External reputation */}
        {data.externalLinks.length > 0 && (
          <div className="sc-card p-5 mb-4">
            <h2 className="font-bold text-[#1e3a5f] mb-2">דירוג באתרים חיצוניים</h2>
            <div className="flex flex-col gap-2">
              {data.externalLinks.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener" className="flex items-center justify-between bg-white border border-[#eeeeee] rounded-xl px-3 py-2 hover:bg-[#f8f9fa]">
                  <span className="text-sm text-[#212121]">{prettySource(l.source)}</span>
                  {l.rating != null && (
                    <span className="text-sm text-[#c4841d] font-semibold">★ {l.rating}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reviews / המלצות */}
        <div className="sc-card p-5 mb-4">
          <h2 className="font-bold text-[#1e3a5f] mb-2">המלצות מדיירים</h2>
          {data.reviews.length === 0 ? (
            <p className="text-[#8e8e9e] text-sm">אין עדיין המלצות לנותן שירות זה.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.reviews.map(r => (
                <div key={r.id} className="border-b border-[#eeeeee] pb-3 last:border-b-0 last:pb-0">
                  {r.rating != null && (
                    <div className="text-[#c4841d] text-sm mb-1">
                      {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}
                    </div>
                  )}
                  {r.text && <p className="text-sm text-[#212121]">{r.text}</p>}
                  <p className="text-xs text-[#8e8e9e] mt-1">{new Date(r.createdAt).toLocaleDateString('he-IL')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function safeHost(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function prettySource(source: string): string {
  const map: Record<string, string> = {
    yad2: 'יד2',
    google_maps: 'Google Maps',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    custom: 'אתר חיצוני',
  }
  return map[source] ?? source
}
