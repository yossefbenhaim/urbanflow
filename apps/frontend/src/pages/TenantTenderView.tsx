import { useState } from 'react'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'
import ProposalComparison from '../components/ProposalComparison'
import BuildingLoader from '../components/BuildingLoader'

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  lawyer: { label: 'עורך דין', icon: '⚖️' },
  organizer: { label: 'מארגן', icon: '📋' },
  developer: { label: 'יזם', icon: '🏗️' },
  appraiser: { label: 'שמאי', icon: '💰' },
  architect: { label: 'אדריכל', icon: '📐' },
  contractor: { label: 'קבלן', icon: '🔨' },
  other: { label: 'אחר', icon: '📦' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'פתוח', color: 'text-[#4a8c5c]', bg: 'bg-[#4a8c5c]/12' },
  closed: { label: 'סגור', color: 'text-red-500', bg: 'bg-red-500/12' },
  awarded: { label: 'נבחר זוכה', color: 'text-[#3b6b9c]', bg: 'bg-[#ebf1f7]' },
  cancelled: { label: 'בוטל', color: 'text-[#5a5a6e]', bg: 'bg-gray-200' },
  draft: { label: 'טיוטה', color: 'text-[#5a5a6e]', bg: 'bg-gray-100' },
}

export default function TenantTenderView() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Get the tenant's project
  const { data: project, isLoading: projectLoading } = trpc.tenant.getMyProject.useQuery()
  const projectId = (project as any)?.id

  const { data: tenders, isLoading: tendersLoading } = trpc.tenders.getProjectTenders.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  )

  const isLoading = projectLoading || tendersLoading

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <BuildingLoader size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (!projectId) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="text-5xl mb-4">🏗️</div>
          <p className="text-[#5a5a6e] text-lg">יש להצטרף לפרויקט כדי לצפות במכרזים</p>
        </div>
      </PageLayout>
    )
  }

  const openTenders = (tenders ?? []).filter((t: any) => t.status === 'open')
  const closedTenders = (tenders ?? []).filter((t: any) => t.status !== 'open')

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <PageTitle>📋 מכרזים בפרויקט</PageTitle>
        <p className="text-[13px] text-[#5a5a6e] -mt-3 mb-6">
          כאן תוכל/י לראות את כל המכרזים שנפתחו בפרויקט, ולהשוות בין ההצעות השונות
        </p>

        {(!tenders || tenders.length === 0) && (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] p-10 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-[#5a5a6e] text-[15px]">עדיין לא נפתחו מכרזים בפרויקט</p>
            <p className="text-[#5a5a6e] text-[13px] mt-1">כשוועד הבניין יפתח מכרזים, הם יופיעו כאן</p>
          </div>
        )}

        {/* Open Tenders */}
        {openTenders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#4a8c5c] animate-pulse" />
              <h2 className="text-[15px] font-bold text-[#212121]">מכרזים פתוחים ({openTenders.length})</h2>
            </div>
            <div className="space-y-4">
              {openTenders.map((tender: any) => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  isExpanded={expandedId === tender.id}
                  onToggle={() => setExpandedId(expandedId === tender.id ? null : tender.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Closed/Awarded Tenders */}
        {closedTenders.length > 0 && (
          <div>
            <h2 className="text-[15px] font-bold text-[#212121] mb-3">
              מכרזים שהסתיימו ({closedTenders.length})
            </h2>
            <div className="space-y-4">
              {closedTenders.map((tender: any) => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  isExpanded={expandedId === tender.id}
                  onToggle={() => setExpandedId(expandedId === tender.id ? null : tender.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function TenderCard({
  tender,
  isExpanded,
  onToggle,
}: {
  tender: any
  isExpanded: boolean
  onToggle: () => void
}) {
  const typeInfo = TYPE_LABELS[tender.tender_type] ?? TYPE_LABELS.other
  const statusInfo = STATUS_CONFIG[tender.status] ?? STATUS_CONFIG.open
  const proposalCount = tender.tender_proposals?.[0]?.count ?? 0

  return (
    <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-start gap-4 bg-transparent border-none cursor-pointer text-right hover:bg-[#f8f9fa]/50 transition"
      >
        {/* Type Icon */}
        <div className="w-12 h-12 rounded-[12px] bg-[#1e3a5f]/8 flex items-center justify-center text-2xl flex-shrink-0">
          {typeInfo.icon}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-[15px] font-bold text-[#212121]">{tender.title}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {tender.description && (
            <p className="text-[13px] text-[#5a5a6e] line-clamp-2 mb-2">{tender.description}</p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-[#5a5a6e] flex-wrap">
            <span>📁 {typeInfo.label}</span>
            <span>📅 {new Date(tender.created_at).toLocaleDateString('he-IL')}</span>
            {tender.deadline && (
              <span>⏰ עד {new Date(tender.deadline).toLocaleDateString('he-IL')}</span>
            )}
            <span>📨 {proposalCount} הצעות</span>
          </div>

          {/* Winner highlight */}
          {tender.winner?.full_name && (
            <div className="mt-2 flex items-center gap-1.5 bg-[#4a8c5c]/10 px-3 py-1.5 rounded-lg w-fit">
              <span className="text-lg">🏆</span>
              <span className="text-[13px] font-bold text-[#4a8c5c]">זוכה: {tender.winner.full_name}</span>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <div className="text-[#5a5a6e] text-sm mt-1 flex-shrink-0">
          {isExpanded ? '▲' : '▼'}
        </div>
      </button>

      {/* Requirements */}
      {tender.requirements && isExpanded && (
        <div className="mx-5 mb-3 bg-[#8b6f47]/8 p-3 rounded-xl border border-[#8b6f47]/15">
          <p className="text-xs font-semibold text-[#8b6f47] mb-1">📋 דרישות המכרז:</p>
          <p className="text-[13px] text-[#333]">{tender.requirements}</p>
        </div>
      )}

      {/* Expanded: Proposal Comparison Table */}
      {isExpanded && (
        <div className="px-5 pb-5">
          <h4 className="text-[13px] font-bold text-[#3b6b9c] mb-2 flex items-center gap-1">
            📊 השוואת הצעות
          </h4>
          <ProposalComparison tenderId={tender.id} readOnly />
        </div>
      )}
    </div>
  )
}
