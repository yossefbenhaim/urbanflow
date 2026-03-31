import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const tendersRouter = router({
  // ===== C1: Tender CRUD =====

  createTender: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      title: z.string().min(3),
      tenderType: z.enum(['lawyer','organizer','developer','appraiser','architect','contractor','other']),
      description: z.string().optional(),
      requirements: z.string().optional(),
      deadline: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check user is organizer or committee rep for this project
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('role')
        .eq('id', ctx.user.id)
        .single()
      if (!profile || !['organizer','committee_rep','manager'].includes(profile.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'רק נציג או מארגן יכולים לפתוח מכרז' })
      }
      const { data, error } = await ctx.supabase
        .from('tenders')
        .insert({
          project_id: input.projectId,
          created_by: ctx.user.id,
          title: input.title,
          tender_type: input.tenderType,
          description: input.description,
          requirements: input.requirements,
          deadline: input.deadline,
          status: 'open',
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  closeTender: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tenders')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', input.tenderId)
        .eq('created_by', ctx.user.id)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!data) throw new TRPCError({ code: 'FORBIDDEN', message: 'אין הרשאה לסגור מכרז זה' })
      return data
    }),

  awardTender: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid(),
      winnerId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update tender status + winner
      const { data: tender, error } = await ctx.supabase
        .from('tenders')
        .update({
          status: 'awarded',
          winner_id: input.winnerId,
          closed_at: new Date().toISOString(),
        })
        .eq('id', input.tenderId)
        .eq('created_by', ctx.user.id)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!tender) throw new TRPCError({ code: 'FORBIDDEN', message: 'אין הרשאה לבחור זוכה' })

      // Mark winner proposal
      await ctx.supabase
        .from('tender_proposals')
        .update({ status: 'winner' })
        .eq('tender_id', input.tenderId)
        .eq('provider_id', input.winnerId)

      // Reject others
      await ctx.supabase
        .from('tender_proposals')
        .update({ status: 'rejected' })
        .eq('tender_id', input.tenderId)
        .neq('provider_id', input.winnerId)

      // Auto-create contract assignment
      const { data: assignment } = await ctx.supabase
        .from('contract_assignments')
        .insert({
          tender_id: input.tenderId,
          provider_id: input.winnerId,
          project_id: tender.project_id,
          status: 'pending_meeting',
        })
        .select().single()

      return { tender, assignment }
    }),

  // ===== C1: Proposals =====

  submitProposal: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid(),
      price: z.number().optional(),
      timelineMonths: z.number().optional(),
      description: z.string().min(5),
      benefits: z.array(z.string()).optional(),
      experienceYears: z.number().optional(),
      pastProjectsCount: z.number().optional(),
      warrantyDetails: z.string().optional(),
      documents: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tender_proposals')
        .insert({
          tender_id: input.tenderId,
          provider_id: ctx.user.id,
          price: input.price,
          timeline_months: input.timelineMonths,
          description: input.description,
          benefits: input.benefits,
          experience_years: input.experienceYears,
          past_projects_count: input.pastProjectsCount,
          warranty_details: input.warrantyDetails,
          documents: input.documents,
        })
        .select().single()
      if (error) {
        if (error.code === '23505') throw new TRPCError({ code: 'CONFLICT', message: 'כבר הגשת הצעה למכרז זה' })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  getProjectTenders: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tenders')
        .select('*, creator:profiles!tenders_created_by_fkey(id,full_name), winner:profiles!tenders_winner_id_fkey(id,full_name), tender_proposals(count)')
        .eq('project_id', input.projectId)
        .order('created_at', { ascending: false })
      return data ?? []
    }),

  getTenderProposals: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tender_proposals')
        .select('*, provider:profiles!tender_proposals_provider_id_fkey(id,full_name,avatar_url)')
        .eq('tender_id', input.tenderId)
        .order('submitted_at', { ascending: false })
      return data ?? []
    }),

  getTenderById: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tenders')
        .select('*, creator:profiles!tenders_created_by_fkey(id,full_name), winner:profiles!tenders_winner_id_fkey(id,full_name)')
        .eq('id', input.tenderId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'מכרז לא נמצא' })
      return data
    }),

  // ===== C3: Negotiation Rounds =====

  addNegotiationRound: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid(),
      title: z.string().min(3),
      summary: z.string().optional(),
      documentUrl: z.string().optional(),
      changesDescription: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current max round number
      const { data: rounds } = await ctx.supabase
        .from('negotiation_rounds')
        .select('round_number')
        .eq('tender_id', input.tenderId)
        .order('round_number', { ascending: false })
        .limit(1)
      const nextRound = (rounds?.[0]?.round_number ?? 0) + 1

      const { data, error } = await ctx.supabase
        .from('negotiation_rounds')
        .insert({
          tender_id: input.tenderId,
          round_number: nextRound,
          title: input.title,
          summary: input.summary,
          document_url: input.documentUrl,
          changes_description: input.changesDescription,
          created_by: ctx.user.id,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getNegotiationHistory: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('negotiation_rounds')
        .select('*, creator:profiles!negotiation_rounds_created_by_fkey(id,full_name)')
        .eq('tender_id', input.tenderId)
        .order('round_number', { ascending: true })
      return data ?? []
    }),

  // ===== C4: Contract Assignments =====

  scheduleMeeting: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      date: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contract_assignments')
        .update({
          meeting_scheduled_at: input.date,
          status: 'pending_meeting',
        })
        .eq('id', input.assignmentId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  completeMeeting: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contract_assignments')
        .update({ meeting_completed: true, status: 'meeting_done' })
        .eq('id', input.assignmentId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  uploadContract: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      fileUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contract_assignments')
        .update({
          contract_file_url: input.fileUrl,
          contract_uploaded_at: new Date().toISOString(),
          status: 'contract_uploaded',
        })
        .eq('id', input.assignmentId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  startApproval: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      requiredCount: z.number().int().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contract_assignments')
        .update({
          status: 'pending_approval',
          approval_required_count: input.requiredCount,
        })
        .eq('id', input.assignmentId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  approveContract: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      apartmentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('contract_approvals')
        .insert({
          assignment_id: input.assignmentId,
          apartment_id: input.apartmentId,
          approved_by: ctx.user.id,
          approved: true,
        })
      if (error) {
        if (error.code === '23505') throw new TRPCError({ code: 'CONFLICT', message: 'כבר אישרת חוזה זה' })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Update approvals count
      const { count } = await ctx.supabase
        .from('contract_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', input.assignmentId)
        .eq('approved', true)

      const { data: assignment } = await ctx.supabase
        .from('contract_assignments')
        .update({ approvals_received: count ?? 0 })
        .eq('id', input.assignmentId)
        .select().single()

      // Auto-approve if threshold met
      if (assignment && assignment.approval_required_count && (count ?? 0) >= assignment.approval_required_count) {
        await ctx.supabase
          .from('contract_assignments')
          .update({ status: 'approved' })
          .eq('id', input.assignmentId)
      }

      return { approved: true, totalApprovals: count }
    }),

  getAssignmentStatus: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contract_assignments')
        .select('*, provider:profiles!contract_assignments_provider_id_fkey(id,full_name), contract_approvals(*)')
        .eq('id', input.assignmentId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'שיוך חוזה לא נמצא' })
      return {
        ...data,
        approvalPercentage: data.approval_required_count
          ? Math.round((data.approvals_received / data.approval_required_count) * 100)
          : 0,
      }
    }),

  getProjectAssignments: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('contract_assignments')
        .select('*, provider:profiles!contract_assignments_provider_id_fkey(id,full_name), tender:tenders!contract_assignments_tender_id_fkey(id,title,tender_type)')
        .eq('project_id', input.projectId)
        .order('created_at', { ascending: false })
      return data ?? []
    }),
})
