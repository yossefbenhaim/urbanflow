import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const providerRouter = router({
  registerProfile: protectedProcedure
    .input(z.object({
      company: z.string().optional(),
      serviceTypes: z.array(z.string()),
      bio: z.string(),
      operatingRegions: z.array(z.string()),
      licenseNumber: z.string().optional(),
      website: z.string().optional(),
      linkedinUrl: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('provider_profiles').insert({
        id: ctx.user.id,
        company: input.company,
        service_types: input.serviceTypes,
        bio: input.bio,
        operating_regions: input.operatingRegions,
        license_number: input.licenseNumber,
        website: input.website,
        linkedin_url: input.linkedinUrl
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateProfile: protectedProcedure
    .input(z.object({ bio: z.string().optional(), company: z.string().optional(), serviceTypes: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('provider_profiles')
        .update({ bio: input.bio, company: input.company, service_types: input.serviceTypes })
        .eq('id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('provider_profiles').select('*, profile:profiles(*)').eq('id', ctx.user.id).single()
    return data
  }),

  getJobListings: protectedProcedure
    .input(z.object({ serviceType: z.string().optional(), location: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase.from('service_listings').select('*, project:projects(name, type)').eq('status', 'OPEN')
      if (input?.serviceType) q = q.eq('service_type', input.serviceType)
      if (input?.location) q = q.ilike('location', `%${input.location}%`)
      const { data } = await q.order('published_at', { ascending: false })
      return data ?? []
    }),

  getJobById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('service_listings').select('*, project:projects(name, type, status)').eq('id', input).single()
      return data
    }),

  applyToJob: protectedProcedure
    .input(z.object({ listingId: z.string(), coverLetter: z.string(), cvUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('service_applications').insert({
        listing_id: input.listingId, provider_id: ctx.user.id,
        cover_letter: input.coverLetter, cv_url: input.cvUrl, status: 'PENDING'
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getMyApplications: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('service_applications').select('*, listing:service_listings(title, project:projects(name))')
      .eq('provider_id', ctx.user.id).order('submitted_at', { ascending: false })
    return data ?? []
  }),

  getActiveProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('service_applications')
      .select('listing:service_listings(project:projects(*))')
      .eq('provider_id', ctx.user.id).eq('status', 'ACCEPTED')
    return (data ?? []).map((d) => (d.listing as { project?: unknown } | undefined)?.project).filter(Boolean)
  }),

  // ─── E2: Weekly Timeline Updates ───────────────────────
  submitWeeklyUpdate: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      statusUpdate: z.string().min(1),
      progressPct: z.number().min(0).max(100),
      blockers: z.string().optional(),
      nextSteps: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate current week start (Monday)
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const { error } = await ctx.supabase.from('service_timeline').upsert({
        project_id: input.projectId,
        provider_id: ctx.user.id,
        week_start: weekStartStr,
        status_update: input.statusUpdate,
        progress_pct: input.progressPct,
        blockers: input.blockers ?? null,
        next_steps: input.nextSteps ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,provider_id,week_start' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getTimeline: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase.from('service_timeline')
        .select('*, provider:profiles!service_timeline_provider_id_fkey(full_name)')
        .eq('project_id', input.projectId)
        .order('week_start', { ascending: false })
      return data ?? []
    }),

  getMissingUpdates: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get current week start
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Get all accepted providers for this project
      const { data: apps } = await ctx.supabase.from('service_applications')
        .select('provider_id, provider:profiles!service_applications_provider_id_fkey(full_name)')
        .eq('status', 'ACCEPTED')
        .eq('listing_id', input.projectId)

      if (!apps || apps.length === 0) return []

      // Get who updated this week
      const { data: updates } = await ctx.supabase.from('service_timeline')
        .select('provider_id')
        .eq('project_id', input.projectId)
        .eq('week_start', weekStartStr)

      const updatedIds = new Set((updates ?? []).map((u) => u.provider_id))
      return (apps ?? []).filter((a) => !updatedIds.has(a.provider_id)).map((a) => ({
        providerId: a.provider_id,
        providerName: (a.provider as { full_name?: string } | undefined)?.full_name ?? 'לא ידוע',
      }))
    }),
})
