import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

const ProjectTypeEnum = z.enum(['pinuy_binuy', 'tama_38_2', 'chalufat_shaked', 'binui_pinui'])
const ComplexTypeEnum = z.enum(['single_building', 'multi_building', 'cluster'])
const RiskLevelEnum = z.enum(['low', 'medium', 'high'])
const ProposalStatusEnum = z.enum(['draft', 'submitted', 'approved', 'rejected'])
const BidStatusEnum = z.enum(['draft', 'submitted', 'withdrawn', 'awarded', 'rejected'])

export const developerRouter = router({
  // ══ Project proposals (טופס פתיחת פרויקט) ══
  createProposal: protectedProcedure
    .input(z.object({
      address: z.string().min(3),
      city: z.string().min(1),
      projectType: ProjectTypeEnum,
      tenantsCount: z.number().int().optional(),
      complexType: ComplexTypeEnum.optional(),
      profitTargetPct: z.number().optional(),
      riskLevel: RiskLevelEnum.optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('developer_project_proposals')
        .insert({
          developer_id: ctx.user.id,
          address: input.address,
          city: input.city,
          project_type: input.projectType,
          tenants_count: input.tenantsCount,
          complex_type: input.complexType,
          profit_target_pct: input.profitTargetPct,
          risk_level: input.riskLevel,
          notes: input.notes,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  updateProposal: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      address: z.string().optional(),
      city: z.string().optional(),
      projectType: ProjectTypeEnum.optional(),
      tenantsCount: z.number().int().optional(),
      complexType: ComplexTypeEnum.optional(),
      profitTargetPct: z.number().optional(),
      riskLevel: RiskLevelEnum.optional(),
      notes: z.string().optional(),
      status: ProposalStatusEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const payload: Record<string, unknown> = {}
      if (patch.address !== undefined) payload.address = patch.address
      if (patch.city !== undefined) payload.city = patch.city
      if (patch.projectType !== undefined) payload.project_type = patch.projectType
      if (patch.tenantsCount !== undefined) payload.tenants_count = patch.tenantsCount
      if (patch.complexType !== undefined) payload.complex_type = patch.complexType
      if (patch.profitTargetPct !== undefined) payload.profit_target_pct = patch.profitTargetPct
      if (patch.riskLevel !== undefined) payload.risk_level = patch.riskLevel
      if (patch.notes !== undefined) payload.notes = patch.notes
      if (patch.status !== undefined) {
        payload.status = patch.status
        if (patch.status === 'submitted') payload.submitted_at = new Date().toISOString()
      }
      const { data, error } = await ctx.supabase
        .from('developer_project_proposals')
        .update(payload)
        .eq('id', id)
        .eq('developer_id', ctx.user.id)
        .select().single()
      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'הצעה לא נמצאה' })
      return data
    }),

  listProposals: protectedProcedure
    .input(z.object({ status: ProposalStatusEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('developer_project_proposals')
        .select('*')
        .eq('developer_id', ctx.user.id)
        .order('created_at', { ascending: false })
      if (input?.status) q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getProposal: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('developer_project_proposals')
        .select('*')
        .eq('id', input)
        .eq('developer_id', ctx.user.id)
        .single()
      return data
    }),

  // ══ Accompaniment form (טופס ליווי) ══
  upsertAccompaniment: protectedProcedure
    .input(z.object({
      proposalId: z.string().uuid(),
      contractorUserId: z.string().uuid().optional().nullable(),
      contractorName: z.string().optional(),
      appraiserUserId: z.string().uuid().optional().nullable(),
      architectUserId: z.string().uuid().optional().nullable(),
      organizerUserId: z.string().uuid().optional().nullable(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('developer_accompaniment_forms')
        .upsert({
          proposal_id: input.proposalId,
          contractor_user_id: input.contractorUserId ?? null,
          contractor_name: input.contractorName,
          appraiser_user_id: input.appraiserUserId ?? null,
          architect_user_id: input.architectUserId ?? null,
          organizer_user_id: input.organizerUserId ?? null,
          notes: input.notes,
        }, { onConflict: 'proposal_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  getAccompaniment: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('developer_accompaniment_forms')
        .select('*')
        .eq('proposal_id', input)
        .maybeSingle()
      return data
    }),

  // ══ Economic plan (טופס כלכלי) ══
  upsertEconomicPlan: protectedProcedure
    .input(z.object({
      proposalId: z.string().uuid(),
      expectedProfit: z.number().optional(),
      constructionCosts: z.number().optional(),
      financingSource: z.string().optional(),
      financingAmount: z.number().optional(),
      timelineMonths: z.number().int().optional(),
      economicRisks: z.string().optional(),
      marketConditions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('developer_economic_plans')
        .upsert({
          proposal_id: input.proposalId,
          expected_profit: input.expectedProfit,
          construction_costs: input.constructionCosts,
          financing_source: input.financingSource,
          financing_amount: input.financingAmount,
          timeline_months: input.timelineMonths,
          economic_risks: input.economicRisks,
          market_conditions: input.marketConditions,
        }, { onConflict: 'proposal_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  getEconomicPlan: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('developer_economic_plans')
        .select('*')
        .eq('proposal_id', input)
        .maybeSingle()
      return data
    }),

  // ══ Bids (טופס הצעות/מכרזים) ══
  createBid: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid().optional().nullable(),
      proposalId: z.string().uuid().optional().nullable(),
      bidType: z.string().optional(),
      executionTerms: z.string().optional(),
      guarantees: z.string().optional(),
      warrantyPeriodMonths: z.number().int().optional(),
      plainLanguageDetail: z.string().min(10, 'תיאור בשפה פשוטה חייב להיות לפחות 10 תווים'),
      priceTotal: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('developer_bids')
        .insert({
          developer_id: ctx.user.id,
          tender_id: input.tenderId ?? null,
          proposal_id: input.proposalId ?? null,
          bid_type: input.bidType,
          execution_terms: input.executionTerms,
          guarantees: input.guarantees,
          warranty_period_months: input.warrantyPeriodMonths,
          plain_language_detail: input.plainLanguageDetail,
          price_total: input.priceTotal,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  updateBid: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      bidType: z.string().optional(),
      executionTerms: z.string().optional(),
      guarantees: z.string().optional(),
      warrantyPeriodMonths: z.number().int().optional(),
      plainLanguageDetail: z.string().min(10).optional(),
      priceTotal: z.number().optional(),
      status: BidStatusEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const payload: Record<string, unknown> = {}
      if (patch.bidType !== undefined) payload.bid_type = patch.bidType
      if (patch.executionTerms !== undefined) payload.execution_terms = patch.executionTerms
      if (patch.guarantees !== undefined) payload.guarantees = patch.guarantees
      if (patch.warrantyPeriodMonths !== undefined) payload.warranty_period_months = patch.warrantyPeriodMonths
      if (patch.plainLanguageDetail !== undefined) payload.plain_language_detail = patch.plainLanguageDetail
      if (patch.priceTotal !== undefined) payload.price_total = patch.priceTotal
      if (patch.status !== undefined) {
        payload.status = patch.status
        if (patch.status === 'submitted') payload.submitted_at = new Date().toISOString()
      }
      const { data, error } = await ctx.supabase
        .from('developer_bids')
        .update(payload)
        .eq('id', id)
        .eq('developer_id', ctx.user.id)
        .select().single()
      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'הצעה לא נמצאה' })
      return data
    }),

  listBids: protectedProcedure
    .input(z.object({ status: BidStatusEnum.optional(), tenderId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('developer_bids')
        .select('*')
        .eq('developer_id', ctx.user.id)
        .order('created_at', { ascending: false })
      if (input?.status) q = q.eq('status', input.status)
      if (input?.tenderId) q = q.eq('tender_id', input.tenderId)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),
})
