import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import BuildingLoader from '../components/BuildingLoader'

const AGREEMENT_CONFIG: Record<string, { order: number; icon: string; description: string; action: string }> = {
  agreement_principles: {
    order: 1,
    icon: '📜',
    description: 'ההסכם הראשון שמגדיר את עקרונות העסקה — תמורות, לוח זמנים, ערבויות',
    action: 'חתום על הסכם',
  },
  power_of_attorney_lawyer: {
    order: 2,
    icon: '⚖️',
    description: 'מינוי עורך דין שייצג אותך במשא ומתן ובהליכים המשפטיים',
    action: 'חתום על ייפוי כוח',
  },
  disclosure_letter: {
    order: 3,
    icon: '📋',
    description: 'מכתב גילוי נאות מהיזם — מידע על ניסיון, מצב פיננסי, תביעות',
    action: 'צפה במכתב',
  },
}

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  unsigned: { icon: '⬜', label: 'טרם נחתם', color: 'text-[#5a5a6e]', bg: 'bg-gray-50 border-[#eeeeee]' },
  signed: { icon: '✍️', label: 'חתום', color: 'text-[#4a8c5c]', bg: 'bg-[#4a8c5c]/5 border-[#4a8c5c]/20' },
  pdf_available: { icon: '📄', label: 'PDF זמין', color: 'text-[#3b6b9c]', bg: 'bg-[#3b6b9c]/5 border-[#3b6b9c]/20' },
}

export default function AgreementHub() {
  const navigate = useNavigate()

  const { data: docs, isLoading } = trpc.tenant.getDocuments.useQuery()

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <BuildingLoader size="lg" />
        </div>
      </PageLayout>
    )
  }

  // Filter to agreements (documents with content_key matching our templates)
  const agreementKeys = Object.keys(AGREEMENT_CONFIG)
  const agreements = (docs ?? [])
    .filter((d: any) => d.content_key && agreementKeys.includes(d.content_key))
    .map((d: any) => {
      const config = AGREEMENT_CONFIG[d.content_key]
      const hasSig = d.signatures && d.signatures.length > 0 && d.signatures[0]?.signed_at
      const status = hasSig ? 'signed' : 'unsigned'
      return { ...d, config, status }
    })
    .sort((a: any, b: any) => (a.config?.order ?? 99) - (b.config?.order ?? 99))

  const signedCount = agreements.filter((a: any) => a.status === 'signed').length
  const totalCount = agreements.length
  const progressPct = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <PageTitle>📑 הסכמים וחתימות</PageTitle>
        <p className="text-[13px] text-[#5a5a6e] -mt-3 mb-6">
          כל ההסכמים הנדרשים לפרויקט — קרא/י בעיון וחתום/י דיגיטלית
        </p>

        {/* Overall Progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-[10px] bg-[#1e3a5f]/8 flex items-center justify-center text-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#212121]">התקדמות חתימות</h3>
                  <p className="text-[12px] text-[#5a5a6e]">{signedCount} מתוך {totalCount} הסכמים נחתמו</p>
                </div>
              </div>
              <div className={`text-xl font-extrabold ${progressPct === 100 ? 'text-[#4a8c5c]' : 'text-[#3b6b9c]'}`}>
                {progressPct}%
              </div>
            </div>
            <div className="w-full bg-[#f0f0f0] rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progressPct === 100 ? 'bg-[#4a8c5c]' : 'bg-[#3b6b9c]'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {progressPct === 100 && (
              <p className="text-[12px] text-[#4a8c5c] font-semibold mt-2 flex items-center gap-1">
                🎉 כל ההסכמים נחתמו בהצלחה!
              </p>
            )}
          </div>
        )}

        {/* No Agreements */}
        {totalCount === 0 && (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] p-10 text-center">
            <div className="text-5xl mb-3">📑</div>
            <p className="text-[#5a5a6e] text-[15px]">עדיין אין הסכמים לחתימה</p>
            <p className="text-[#5a5a6e] text-[13px] mt-1">כשיהיו הסכמים חדשים, הם יופיעו כאן</p>
          </div>
        )}

        {/* Agreement Cards */}
        <div className="space-y-4">
          {agreements.map((agreement: any) => {
            const config = agreement.config
            const statusDisplay = STATUS_DISPLAY[agreement.status] ?? STATUS_DISPLAY.unsigned
            const isDisclosure = agreement.content_key === 'disclosure_letter'

            return (
              <div
                key={agreement.id}
                className={`bg-white rounded-[14px] shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${statusDisplay.bg}`}
                onClick={() => navigate(`/documents/${agreement.id}`)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl flex-shrink-0 ${
                      agreement.status === 'signed' ? 'bg-[#4a8c5c]/15' : 'bg-[#1e3a5f]/8'
                    }`}>
                      {agreement.status === 'signed' ? '✅' : config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-[15px] font-bold text-[#212121]">{agreement.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusDisplay.color} ${
                          agreement.status === 'signed' ? 'bg-[#4a8c5c]/12' : 'bg-gray-100'
                        }`}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#5a5a6e] leading-relaxed">{config.description}</p>

                      {/* Signature info */}
                      {agreement.status === 'signed' && agreement.signatures?.[0]?.signed_at && (
                        <p className="text-[11px] text-[#4a8c5c] mt-2">
                          ✍️ נחתם ב-{new Date(agreement.signatures[0].signed_at).toLocaleDateString('he-IL')}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      <div className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition ${
                        agreement.status === 'signed'
                          ? 'bg-[#4a8c5c]/10 text-[#4a8c5c]'
                          : 'bg-[#1e3a5f] text-white'
                      }`}>
                        {agreement.status === 'signed'
                          ? '📄 צפה'
                          : isDisclosure
                          ? '👁️ צפה'
                          : config.action
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step indicator bar */}
                <div className={`h-1 ${
                  agreement.status === 'signed' ? 'bg-[#4a8c5c]' : 'bg-[#eeeeee]'
                }`} />
              </div>
            )
          })}
        </div>

        {/* Info footer */}
        {totalCount > 0 && signedCount < totalCount && (
          <div className="mt-6 bg-[#8b6f47]/8 rounded-[14px] p-4 border border-[#8b6f47]/15">
            <p className="text-[13px] text-[#8b6f47] font-medium flex items-center gap-2">
              💡 <span>יש לחתום על כל ההסכמים כדי להתקדם לשלב הבא בפרויקט</span>
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
