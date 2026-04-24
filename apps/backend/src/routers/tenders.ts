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

      // Notify building tenants if organizer tender was awarded
      if (tender.tender_type === 'organizer') {
        const { data: winnerProfile } = await ctx.supabase.from('profiles').select('full_name').eq('id', input.winnerId).single()
        const winnerName = (winnerProfile as { full_name?: string } | null)?.full_name ?? 'המארגן שנבחר'
        // Get all tenants in the project
        const { data: projectTenants } = await ctx.supabase
          .from('project_tenants')
          .select('tenant_id')
          .eq('project_id', tender.project_id)
        if (projectTenants && projectTenants.length > 0) {
          await ctx.supabase.from('notifications').insert(
            projectTenants.map((t: { tenant_id: string }) => ({
              user_id: t.tenant_id,
              type: 'organizer_selected',
              title: '🎉 נבחר מארגן/מנהלת!',
              body: `${winnerName} נבחר/ה כמארגן/ת הפרויקט. נשאר רק לחתום על טופס בחירת מארגן/מנהלת ולהעלות אותו חתום.`,
              is_read: false,
            }))
          )
        }
      }

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

  // Open tenders matching the caller's provider type. Infers type from which
  // *_profiles row the user has (same rule as provider.getOnboardingStatus).
  // Excludes tenders the user already submitted a proposal to.
  listOpenTendersForProvider: protectedProcedure.query(async ({ ctx }) => {
    const [arch, apr, dev, law] = await Promise.all([
      ctx.supabase.from('architect_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('appraiser_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('developer_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('lawyer_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
    ])
    const providerType = arch.data ? 'architect'
      : apr.data ? 'appraiser'
      : dev.data ? 'developer'
      : law.data ? 'lawyer'
      : null
    if (!providerType) return { providerType: null, tenders: [] }

    const { data: mine } = await ctx.supabase
      .from('tender_proposals')
      .select('tender_id')
      .eq('provider_id', ctx.user.id)
    const alreadyBid = new Set((mine ?? []).map((r: { tender_id: string }) => r.tender_id))

    const { data } = await ctx.supabase
      .from('tenders')
      .select('*, project:projects(id,name,address,project_type), tender_proposals(count)')
      .eq('tender_type', providerType)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const tenders = (data ?? []).filter((t: { id: string }) => !alreadyBid.has(t.id))
    return { providerType, tenders }
  }),

  // All proposals the caller has submitted, newest first, with tender + project context.
  listMyProposals: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('tender_proposals')
      .select('*, tender:tenders(id,title,tender_type,status,deadline,winner_id,project:projects(id,name,address))')
      .eq('provider_id', ctx.user.id)
      .order('submitted_at', { ascending: false })
    return data ?? []
  }),

  // All contract assignments where the caller is the winning provider.
  // Used by ProviderDashboard "my projects" tab.
  listMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('contract_assignments')
      .select('*, project:projects(id,name,address,project_type), tender:tenders(id,title,tender_type)')
      .eq('provider_id', ctx.user.id)
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
      whatItMeans: z.string().optional(),
      pros: z.string().optional(),
      cons: z.string().optional(),
      risks: z.string().optional(),
      recommendation: z.enum(['accept','reject','negotiate','neutral']).optional(),
      status: z.enum(['open','improved','pending','closed']).optional(),
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
          what_it_means: input.whatItMeans,
          pros: input.pros,
          cons: input.cons,
          risks: input.risks,
          recommendation: input.recommendation,
          status: input.status ?? 'open',
          created_by: ctx.user.id,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateNegotiationRound: protectedProcedure
    .input(z.object({
      roundId: z.string().uuid(),
      summary: z.string().optional(),
      documentUrl: z.string().optional(),
      changesDescription: z.string().optional(),
      whatItMeans: z.string().optional(),
      pros: z.string().optional(),
      cons: z.string().optional(),
      risks: z.string().optional(),
      recommendation: z.enum(['accept','reject','negotiate','neutral']).optional(),
      status: z.enum(['open','improved','pending','closed']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {}
      if (input.summary !== undefined) patch.summary = input.summary
      if (input.documentUrl !== undefined) patch.document_url = input.documentUrl
      if (input.changesDescription !== undefined) patch.changes_description = input.changesDescription
      if (input.whatItMeans !== undefined) patch.what_it_means = input.whatItMeans
      if (input.pros !== undefined) patch.pros = input.pros
      if (input.cons !== undefined) patch.cons = input.cons
      if (input.risks !== undefined) patch.risks = input.risks
      if (input.recommendation !== undefined) patch.recommendation = input.recommendation
      if (input.status !== undefined) patch.status = input.status
      const { data, error } = await ctx.supabase
        .from('negotiation_rounds')
        .update(patch)
        .eq('id', input.roundId)
        .eq('created_by', ctx.user.id)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!data) throw new TRPCError({ code: 'FORBIDDEN', message: 'אין הרשאה לעדכן סבב זה' })
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

  // ===== C3b: Legal Opinions (lawyer-only) =====

  submitLegalOpinion: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      isWorthwhile: z.boolean().optional(),
      feasibilityLevel: z.enum(['low','medium','high']).optional(),
      complexityLevel: z.enum(['low','medium','high']).optional(),
      risks: z.string().optional(),
      wouldJoin: z.boolean().optional(),
      summary: z.string().optional(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify caller is the assigned lawyer
      const { data: assignment } = await ctx.supabase
        .from('contract_assignments')
        .select('id, provider_id')
        .eq('id', input.assignmentId)
        .single()
      if (!assignment || assignment.provider_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'רק עו״ד המשויך יכול להגיש חוות דעת' })
      }

      const payload = {
        assignment_id: input.assignmentId,
        lawyer_id: ctx.user.id,
        is_worthwhile: input.isWorthwhile ?? null,
        feasibility_level: input.feasibilityLevel ?? null,
        complexity_level: input.complexityLevel ?? null,
        risks: input.risks ?? null,
        would_join: input.wouldJoin ?? null,
        summary: input.summary ?? null,
        document_url: input.documentUrl ?? null,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await ctx.supabase
        .from('legal_opinions')
        .upsert(payload, { onConflict: 'assignment_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getLegalOpinion: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('legal_opinions')
        .select('*')
        .eq('assignment_id', input.assignmentId)
        .maybeSingle()
      return data
    }),

  /** Lists legal opinions by lawyer for all assignments of a tender (visible to any authenticated user). */
  listLegalOpinionsForTender: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: assignments } = await ctx.supabase
        .from('contract_assignments')
        .select('id, provider_id, provider:profiles!contract_assignments_provider_id_fkey(id,full_name)')
        .eq('tender_id', input.tenderId)
      const ids = (assignments ?? []).map((a: { id: string }) => a.id)
      if (ids.length === 0) return []
      const { data: opinionsRaw } = await ctx.supabase
        .from('legal_opinions')
        .select('*')
        .in('assignment_id', ids)
      type Opinion = {
        assignment_id: string
        is_worthwhile: boolean | null
        feasibility_level: string | null
        complexity_level: string | null
        risks: string | null
        would_join: boolean | null
        summary: string | null
        document_url: string | null
        updated_at: string | null
      }
      const opinions = (opinionsRaw ?? []) as Opinion[]
      const byAssignment = new Map<string, Opinion>(opinions.map(o => [o.assignment_id, o]))
      return (assignments ?? []).map((a: { id: string; provider?: { full_name?: string } | { full_name?: string }[] | null }) => {
        const prov = Array.isArray(a.provider) ? a.provider[0] : a.provider
        return {
          assignmentId: a.id,
          lawyerName: prov?.full_name ?? 'עו״ד',
          opinion: byAssignment.get(a.id) ?? null,
        }
      })
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

  // ===== C5: Match Proposals (שליחת הצעת match) =====

  sendMatchProposal: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      message: z.string().min(3),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('match_proposals')
        .insert({
          tender_id: input.tenderId,
          sender_id: ctx.user.id,
          target_id: input.targetUserId,
          message: input.message,
          status: 'pending',
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const { data: senderProfile } = await ctx.supabase.from('profiles').select('full_name').eq('id', ctx.user.id).single()
      await ctx.supabase.from('notifications').insert({
        user_id: input.targetUserId,
        type: 'match_proposal',
        title: '🤝 הצעת התאמה חדשה!',
        body: `${(senderProfile as { full_name?: string } | null)?.full_name ?? 'משתמש'} שלח/ה לך הצעת התאמה למכרז`,
        is_read: false,
      })
      return data
    }),

  respondToMatch: protectedProcedure
    .input(z.object({
      matchId: z.string().uuid(),
      accepted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('match_proposals')
        .update({ status: input.accepted ? 'accepted' : 'rejected' })
        .eq('id', input.matchId)
        .eq('target_id', ctx.user.id)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'הצעה לא נמצאה' })
      if (input.accepted) {
        const { data: existing } = await ctx.supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_a.eq.${data.sender_id},participant_b.eq.${ctx.user.id}),and(participant_a.eq.${ctx.user.id},participant_b.eq.${data.sender_id})`)
          .maybeSingle()
        if (!existing) {
          await ctx.supabase.from('conversations').insert({
            participant_a: data.sender_id,
            participant_b: ctx.user.id,
            last_message: '🤝 התאמה אושרה! אפשר להתחיל לדבר',
            last_message_at: new Date().toISOString(),
          })
        }
        await ctx.supabase.from('notifications').insert({
          user_id: data.sender_id,
          type: 'match_accepted',
          title: '✅ ההצעה התקבלה!',
          body: 'הצעת ההתאמה שלך אושרה. אפשר להתחיל צ׳אט.',
          is_read: false,
        })
      }
      return data
    }),

  getMatchProposals: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('match_proposals')
        .select('*, sender:profiles!match_proposals_sender_id_fkey(id,full_name), target:profiles!match_proposals_target_id_fkey(id,full_name)')
        .eq('tender_id', input.tenderId)
        .or(`sender_id.eq.${ctx.user.id},target_id.eq.${ctx.user.id}`)
        .order('created_at', { ascending: false })
      return data ?? []
    }),

  // ===== C6: Meeting Scheduling (דיווח פגישה) =====

  reportMeeting: protectedProcedure
    .input(z.object({
      tenderId: z.string().uuid(),
      counterpartId: z.string().uuid(),
      scheduledAt: z.string(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tender_meetings')
        .insert({
          tender_id: input.tenderId,
          reporter_id: ctx.user.id,
          counterpart_id: input.counterpartId,
          scheduled_at: input.scheduledAt,
          location: input.location ?? null,
          notes: input.notes ?? null,
          reporter_confirmed: true,
          counterpart_confirmed: false,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const { data: reporter } = await ctx.supabase.from('profiles').select('full_name').eq('id', ctx.user.id).single()
      await ctx.supabase.from('notifications').insert({
        user_id: input.counterpartId,
        type: 'meeting_scheduled',
        title: '📅 פגישה נקבעה!',
        body: `${(reporter as { full_name?: string } | null)?.full_name ?? 'משתמש'} דיווח/ה על פגישה ב-${new Date(input.scheduledAt).toLocaleDateString('he-IL')}`,
        is_read: false,
      })
      return data
    }),

  confirmMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: meeting } = await ctx.supabase
        .from('tender_meetings').select('*').eq('id', input.meetingId).single()
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND' })
      const meetingData = meeting as { reporter_id: string; counterpart_id: string }
      const isReporter = meetingData.reporter_id === ctx.user.id
      const isCounterpart = meetingData.counterpart_id === ctx.user.id
      if (!isReporter && !isCounterpart) throw new TRPCError({ code: 'FORBIDDEN' })
      const updateField = isReporter ? { reporter_confirmed: true } : { counterpart_confirmed: true }
      const { data, error } = await ctx.supabase
        .from('tender_meetings').update(updateField).eq('id', input.meetingId).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const d = data as { reporter_confirmed?: boolean; counterpart_confirmed?: boolean }
      if (d.reporter_confirmed && d.counterpart_confirmed) {
        await ctx.supabase.from('tender_meetings').update({ status: 'confirmed' }).eq('id', input.meetingId)
      }
      return data
    }),

  getTenderMeetings: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tender_meetings')
        .select('*, reporter:profiles!tender_meetings_reporter_id_fkey(full_name), counterpart:profiles!tender_meetings_counterpart_id_fkey(full_name)')
        .eq('tender_id', input.tenderId)
        .order('scheduled_at', { ascending: true })
      return data ?? []
    }),
})
