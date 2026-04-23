import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { REQUIRED_FILE_KINDS_BY_INSPECTION } from '../constants/uploadChecklists'

interface ProtectedCtx {
  supabase: SupabaseClient
  user: { id: string }
}

const InspectionTypeEnum = z.enum([
  'architectural_feasibility', 'planning_check', 'cluster_feasibility', 'constraints_check',
  'economic_feasibility', 'property_valuation', 'rental_assessment', 'commercial_appraisal'
])

const ArchitectConclusionEnum = z.enum(['single_building', 'prefer_cluster', 'complex', 'not_recommended'])
const AppraiserConclusionEnum = z.enum(['economic', 'borderline', 'not_economic'])

const TbaStatusEnum = z.enum(['approved', 'in_process', 'expired', 'none'])
const RecommendedProjectTypeEnum = z.enum(['pinuy_binuy', 'tama_38_2', 'chalufat_shaked', 'binui_pinui', 'none'])
const FeasibilityLevelEnum = z.enum(['low', 'medium', 'high'])

// ── Shared architect extension fields (spec 2a) ────────
const ArchitectExtFields = {
  tbaStatus: TbaStatusEnum.optional(),
  buildingPctExisting: z.number().min(0).max(999).optional(),
  buildingPctProposed: z.number().min(0).max(999).optional(),
  densityUnitsPerDunam: z.number().min(0).optional(),
  connectsBuildings: z.boolean().optional(),
  rightsTransfer: z.boolean().optional(),
  preservationRequired: z.boolean().optional(),
  recommendedProjectType: RecommendedProjectTypeEnum.optional(),
  tenantFriendlyInsights: z.string().optional(),
  planningRisks: z.string().optional(),
}

// ── Shared appraiser extension fields (spec 2b) ────────
const AppraiserExtFields = {
  tenantCompensation: z.number().optional(),
  developerProfit: z.number().optional(),
  feasibilityLevel: FeasibilityLevelEnum.optional(),
  marketAnalysis: z.string().optional(),
  economicRisks: z.string().optional(),
}

const FileTypeEnum = z.enum([
  'report_pdf', 'sketch', 'blueprint', 'map', 'photo',
  'tama_doc', 'cluster_map', 'valuation_report', 'rent_table', 'commercial_report', 'other'
])

// ── Base inspection fields ─────────────────────────────────
const BaseInspectionInput = z.object({
  projectId: z.string().uuid(),
  inspectionType: InspectionTypeEnum,
  buildingAddress: z.string().optional(),
  apartmentCount: z.number().int().optional(),
  floorCount: z.number().int().optional(),
  notes: z.string().optional(),
})

// ── Architect forms ────────────────────────────────────────
const ArchitectFeasibilityInput = BaseInspectionInput.extend({
  inspectionType: z.literal('architectural_feasibility'),
  relevantPlan: z.string().optional(),
  buildingRights: z.string().optional(),
  heightRestriction: z.string().optional(),
  heritageSite: z.boolean().optional(),
  antiquities: z.boolean().optional(),
  parkingNotes: z.string().optional(),
  infrastructureNotes: z.string().optional(),
  conclusion: ArchitectConclusionEnum,
  ...ArchitectExtFields,
})

const PlanningCheckInput = BaseInspectionInput.extend({
  inspectionType: z.literal('planning_check'),
  planNumber: z.string().optional(),
  landUse: z.string().optional(),
  buildingCoveragePct: z.number().optional(),
  planningLimitations: z.string().optional(),
  conclusion: ArchitectConclusionEnum,
  ...ArchitectExtFields,
})

const ClusterFeasibilityInput = BaseInspectionInput.extend({
  inspectionType: z.literal('cluster_feasibility'),
  suitableStandalone: z.boolean().optional(),
  recommendedClusterCount: z.number().int().optional(),
  clusterNotes: z.string().optional(),
  conclusion: ArchitectConclusionEnum,
  ...ArchitectExtFields,
})

const ConstraintsCheckInput = BaseInspectionInput.extend({
  inspectionType: z.literal('constraints_check'),
  heritageConstraint: z.string().optional(),
  antiquitiesConstraint: z.string().optional(),
  infrastructureConstraint: z.string().optional(),
  streetWidthConstraint: z.string().optional(),
  conclusion: ArchitectConclusionEnum,
})

// ── Appraiser forms ────────────────────────────────────────
const EconomicFeasibilityInput = BaseInspectionInput.extend({
  inspectionType: z.literal('economic_feasibility'),
  existingUnits: z.number().int().optional(),
  avgSqm: z.number().optional(),
  currentUnitValue: z.number().optional(),
  newUnitValue: z.number().optional(),
  constructionCostPerSqm: z.number().optional(),
  conclusion: AppraiserConclusionEnum,
  ...AppraiserExtFields,
})

const PropertyValuationInput = BaseInspectionInput.extend({
  inspectionType: z.literal('property_valuation'),
  avgPropertyValue: z.number().optional(),
  floorVariancePct: z.number().optional(),
  conclusion: AppraiserConclusionEnum,
  ...AppraiserExtFields,
})

const RentalAssessmentInput = BaseInspectionInput.extend({
  inspectionType: z.literal('rental_assessment'),
  avgMonthlyRent: z.number().optional(),
  evacuationPeriodMonths: z.number().int().optional(),
  conclusion: AppraiserConclusionEnum,
})

const CommercialAppraisalInput = BaseInspectionInput.extend({
  inspectionType: z.literal('commercial_appraisal'),
  commercialUseType: z.string().optional(),
  commercialValue: z.number().optional(),
  conclusion: AppraiserConclusionEnum,
})

const AnyInspectionInput = z.discriminatedUnion('inspectionType', [
  ArchitectFeasibilityInput,
  PlanningCheckInput,
  ClusterFeasibilityInput,
  ConstraintsCheckInput,
  EconomicFeasibilityInput,
  PropertyValuationInput,
  RentalAssessmentInput,
  CommercialAppraisalInput,
])

type AnyInspection = z.infer<typeof AnyInspectionInput>

/** Safely extract optional field from discriminated union input */
function field<K extends string>(input: AnyInspection, key: K): unknown {
  return (input as Record<string, unknown>)[key]
}

// ── helpers ────────────────────────────────────────────────
async function requireProviderRole(ctx: ProtectedCtx) {
  const { data: profile } = await ctx.supabase
    .from('profiles').select('role').eq('id', ctx.user.id).single()
  if (!profile || !['provider', 'architect', 'appraiser', 'admin'].includes(profile.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'נותני שירות בלבד' })
  }
  return profile
}

async function checkSlotAvailability(ctx: ProtectedCtx, projectId: string, inspectionType: string) {
  const { data, error } = await ctx.supabase
    .from('inspections')
    .select('id, slot_number')
    .eq('project_id', projectId)
    .eq('inspection_type', inspectionType)
    .neq('status', 'rejected')
    .order('slot_number')

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  if ((data?.length ?? 0) >= 3) {
    throw new TRPCError({ code: 'CONFLICT', message: 'הגיע מספר הבדיקות המקסימלי (3) לסוג זה' })
  }
  return data?.length ?? 0
}

// ── Router ─────────────────────────────────────────────────
export const inspectionsRouter = router({

  // ── Get plan info ──────────────────────────────────────
  getMyPlan: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('provider_profiles')
      .select('plan, contribution_score, quality_score, ranking_score')
      .eq('id', ctx.user.id)
      .single()
    return data
  }),

  // ── Upgrade plan ───────────────────────────────────────
  upgradeToPro: protectedProcedure.mutation(async ({ ctx }) => {
    // בפרודקשן: כאן תהיה אינטגרציית תשלום
    const { error } = await ctx.supabase
      .from('provider_profiles')
      .update({ plan: 'pro' })
      .eq('id', ctx.user.id)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { success: true }
  }),

  // ── Get available projects for inspection ──────────────
  getOpenProjects: protectedProcedure
    .input(z.object({
      inspectionType: InspectionTypeEnum.optional(),
      region: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Pro-plan gating disabled for now — every provider gets full access.
      // Re-introduce by re-adding the provider_profiles.plan check when
      // billing is ready.
      let q = ctx.supabase
        .from('projects')
        .select(`
          id, name, status, city, street, building_number,
          apartment_count,
          inspections!left(inspection_type, status, slot_number)
        `)
        .in('status', ['committee_selected', 'inspections_open'])

      if (input?.region) q = q.ilike('city', `%${input.region}%`)

      const { data } = await q.order('created_at', { ascending: false })

      // Add slot info per project
      const projects = (data ?? []).map((p: Record<string, unknown> & { inspections?: { inspection_type: string; status: string }[] }) => {
        const slotsByType: Record<string, number> = {}
        ;(p.inspections ?? []).forEach((i) => {
          if (i.status !== 'rejected') {
            slotsByType[i.inspection_type] = (slotsByType[i.inspection_type] ?? 0) + 1
          }
        })
        return {
          ...p,
          inspections: undefined,
          availableSlots: slotsByType,
        }
      })

      return { projects, isPro: true }
    }),

  // ── Get slot count for specific type ──────────────────
  getSlotCount: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), inspectionType: InspectionTypeEnum }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('inspections')
        .select('slot_number')
        .eq('project_id', input.projectId)
        .eq('inspection_type', input.inspectionType)
        .neq('status', 'rejected')
      return { count: data?.length ?? 0, isFull: (data?.length ?? 0) >= 3 }
    }),

  // ── Submit inspection (draft) ─────────────────────────
  saveDraft: protectedProcedure
    .input(AnyInspectionInput)
    .mutation(async ({ ctx, input }) => {
      await requireProviderRole(ctx)
      await checkSlotAvailability(ctx, input.projectId, input.inspectionType)

      const { data, error } = await ctx.supabase
        .from('inspections')
        .upsert({
          project_id: input.projectId,
          provider_id: ctx.user.id,
          inspection_type: input.inspectionType,
          status: 'draft',
          conclusion: field(input, 'conclusion'),
          building_address: input.buildingAddress,
          apartment_count: input.apartmentCount,
          floor_count: input.floorCount,
          notes: input.notes,
          // Architect fields
          relevant_plan: field(input, 'relevantPlan'),
          building_rights: field(input, 'buildingRights'),
          height_restriction: field(input, 'heightRestriction'),
          heritage_site: field(input, 'heritageSite'),
          antiquities: field(input, 'antiquities'),
          parking_notes: field(input, 'parkingNotes'),
          infrastructure_notes: field(input, 'infrastructureNotes'),
          plan_number: field(input, 'planNumber'),
          land_use: field(input, 'landUse'),
          building_coverage_pct: field(input, 'buildingCoveragePct'),
          planning_limitations: field(input, 'planningLimitations'),
          suitable_standalone: field(input, 'suitableStandalone'),
          recommended_cluster_count: field(input, 'recommendedClusterCount'),
          cluster_notes: field(input, 'clusterNotes'),
          heritage_constraint: field(input, 'heritageConstraint'),
          antiquities_constraint: field(input, 'antiquitiesConstraint'),
          infrastructure_constraint: field(input, 'infrastructureConstraint'),
          street_width_constraint: field(input, 'streetWidthConstraint'),
          // Appraiser fields
          existing_units: field(input, 'existingUnits'),
          avg_sqm: field(input, 'avgSqm'),
          current_unit_value: field(input, 'currentUnitValue'),
          new_unit_value: field(input, 'newUnitValue'),
          construction_cost_per_sqm: field(input, 'constructionCostPerSqm'),
          avg_property_value: field(input, 'avgPropertyValue'),
          floor_variance_pct: field(input, 'floorVariancePct'),
          avg_monthly_rent: field(input, 'avgMonthlyRent'),
          evacuation_period_months: field(input, 'evacuationPeriodMonths'),
          commercial_use_type: field(input, 'commercialUseType'),
          commercial_value: field(input, 'commercialValue'),
          // Architect extensions (Phase 2a)
          tba_status: field(input, 'tbaStatus'),
          building_pct_existing: field(input, 'buildingPctExisting'),
          building_pct_proposed: field(input, 'buildingPctProposed'),
          density_units_per_dunam: field(input, 'densityUnitsPerDunam'),
          connects_buildings: field(input, 'connectsBuildings'),
          rights_transfer: field(input, 'rightsTransfer'),
          preservation_required: field(input, 'preservationRequired'),
          recommended_project_type: field(input, 'recommendedProjectType'),
          tenant_friendly_insights: field(input, 'tenantFriendlyInsights'),
          planning_risks: field(input, 'planningRisks'),
          // Appraiser extensions (Phase 2b)
          tenant_compensation: field(input, 'tenantCompensation'),
          developer_profit: field(input, 'developerProfit'),
          feasibility_level: field(input, 'feasibilityLevel'),
          market_analysis: field(input, 'marketAnalysis'),
          economic_risks: field(input, 'economicRisks'),
        }, { onConflict: 'project_id,inspection_type,provider_id' })
        .select().single()

      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  // ── Submit (finalize) ─────────────────────────────────
  submit: protectedProcedure
    .input(z.object({ inspectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Phase 5: server-side verification that required file kinds are uploaded
      const { data: insp } = await ctx.supabase
        .from('inspections')
        .select('inspection_type')
        .eq('id', input.inspectionId)
        .eq('provider_id', ctx.user.id)
        .single()
      if (!insp) throw new TRPCError({ code: 'NOT_FOUND', message: 'בדיקה לא נמצאה' })

      const required = REQUIRED_FILE_KINDS_BY_INSPECTION[(insp as { inspection_type: string }).inspection_type] ?? []
      if (required.length > 0) {
        const { data: files } = await ctx.supabase
          .from('inspection_files')
          .select('file_type')
          .eq('inspection_id', input.inspectionId)
        const uploaded = new Set((files ?? []).map((f: { file_type: string }) => f.file_type))
        const missing = required.filter(k => !uploaded.has(k))
        if (missing.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `חסרים קבצים חובה לפני הגשה: ${missing.join(', ')}`,
          })
        }
      }

      const { data, error } = await ctx.supabase
        .from('inspections')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', input.inspectionId)
        .eq('provider_id', ctx.user.id)
        .eq('status', 'draft')
        .select().single()

      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: 'לא ניתן להגיש' })
      return data
    }),

  // ── Get my inspections ────────────────────────────────
  getMyInspections: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('inspections')
        .select('*, project:projects(name, city, street), files:inspection_files(*)')
        .eq('provider_id', ctx.user.id)
        .order('created_at', { ascending: false })

      if (input?.projectId) q = q.eq('project_id', input.projectId)
      const { data } = await q
      return data ?? []
    }),

  // ── Add file to inspection ────────────────────────────
  addFile: protectedProcedure
    .input(z.object({
      inspectionId: z.string().uuid(),
      fileType: FileTypeEnum,
      fileName: z.string(),
      fileUrl: z.string().url(),
      fileSizeBytes: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: insp } = await ctx.supabase
        .from('inspections').select('id').eq('id', input.inspectionId).eq('provider_id', ctx.user.id).single()
      if (!insp) throw new TRPCError({ code: 'FORBIDDEN', message: 'לא נמצאה בדיקה' })

      const { data, error } = await ctx.supabase
        .from('inspection_files')
        .insert({
          inspection_id: input.inspectionId,
          file_type: input.fileType,
          file_name: input.fileName,
          file_url: input.fileUrl,
          file_size_bytes: input.fileSizeBytes,
        }).select().single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // ── Get notifications ─────────────────────────────────
  getNotifications: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('provider_notifications')
        .select('*, project:projects(name, city, street)')
        .eq('provider_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (input?.unreadOnly) q = q.eq('is_read', false)
      const { data } = await q
      return data ?? []
    }),

  markNotificationRead: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('provider_notifications')
        .update({ is_read: true })
        .eq('id', input)
        .eq('provider_id', ctx.user.id)
      return { success: true }
    }),

  // ── Admin: send notification to Pro providers ─────────
  notifyProProviders: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      notificationType: z.enum([
        'new_project_opened', 'architect_inspection_needed',
        'appraiser_inspection_needed', 'new_project_in_region'
      ]),
      title: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only managers/admins
      const { data: profile } = await ctx.supabase
        .from('profiles').select('role').eq('id', ctx.user.id).single()
      if (!['manager', 'organizer', 'admin'].includes(profile?.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Notify every provider (pro-gate removed for now)
      const { data: proProviders } = await ctx.supabase
        .from('provider_profiles')
        .select('id')

      if (!proProviders?.length) return { sent: 0 }

      const notifications = proProviders.map((pp: { id: string }) => ({
        provider_id: pp.id,
        project_id: input.projectId,
        notification_type: input.notificationType,
        title: input.title,
        body: input.body,
        action_url: `/projects/${input.projectId}/inspections`,
      }))

      const { error } = await ctx.supabase
        .from('provider_notifications')
        .insert(notifications)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { sent: notifications.length }
    }),

  // ── Admin: mark inspection useful ─────────────────────
  markUseful: protectedProcedure
    .input(z.object({ inspectionId: z.string().uuid(), isUseful: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { data: profile } = await ctx.supabase
        .from('profiles').select('role').eq('id', ctx.user.id).single()
      if (!['manager', 'organizer', 'admin', 'lawyer'].includes(profile?.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const { error } = await ctx.supabase
        .from('inspections')
        .update({ is_useful: input.isUseful })
        .eq('id', input.inspectionId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
