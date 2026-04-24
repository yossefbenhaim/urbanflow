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

  /** Returns which type-specific profile has been populated for the
   * current user. Used by the dashboard guard to redirect to onboarding. */
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const [arch, apr, dev, law] = await Promise.all([
      ctx.supabase.from('architect_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('appraiser_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('developer_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('lawyer_profiles').select('id').eq('id', ctx.user.id).maybeSingle(),
    ])
    const role = arch.data
      ? 'architect'
      : apr.data
        ? 'appraiser'
        : dev.data
          ? 'developer'
          : law.data
            ? 'lawyer'
            : null
    return { completed: role !== null, role }
  }),

  /** Aggregated provider identity: merges profiles.full_name +
   * provider_profiles (phone / main city) + the type-specific profile.
   * Used by the Profile tab and by the onboarding form in edit mode. */
  getMyDetails: protectedProcedure.query(async ({ ctx }) => {
    const [p, pp, arch, apr, dev, law, ratings] = await Promise.all([
      ctx.supabase.from('profiles').select('full_name, email, role, phone').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('provider_profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('architect_profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('appraiser_profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('developer_profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('lawyer_profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('provider_ratings').select('source, external_url').eq('user_id', ctx.user.id),
    ])
    const providerType = arch.data
      ? 'architect'
      : apr.data
        ? 'appraiser'
        : dev.data
          ? 'developer'
          : law.data
            ? 'lawyer'
            : null
    const typeRow = arch.data ?? apr.data ?? dev.data ?? law.data
    const typeRowObj = (typeRow ?? {}) as Record<string, unknown>
    const ppObj = (pp.data ?? {}) as Record<string, unknown>
    const pObj = (p.data ?? {}) as Record<string, unknown>
    const pickStr = (...vals: unknown[]) =>
      (vals.find(v => typeof v === 'string' && v.trim().length > 0) as string | undefined) ?? null
    const pickNum = (...vals: unknown[]) =>
      (vals.find(v => typeof v === 'number') as number | undefined) ?? null
    const specializations = Array.isArray(typeRowObj.specializations) && (typeRowObj.specializations as unknown[]).length > 0
      ? typeRowObj.specializations as string[]
      : Array.isArray(typeRowObj.specialization_types) && (typeRowObj.specialization_types as unknown[]).length > 0
        ? typeRowObj.specialization_types as string[]
        : []
    // Lawyer profile uses `city` (single) instead of `operating_regions[]`.
    const ops = Array.isArray(typeRowObj.operating_regions) && (typeRowObj.operating_regions as string[]).length > 0
      ? (typeRowObj.operating_regions as string[])
      : typeof typeRowObj.city === 'string' && (typeRowObj.city as string).length > 0
        ? [typeRowObj.city as string]
        : Array.isArray(ppObj.operating_regions)
          ? ppObj.operating_regions as string[]
          : []
    const portfolioUrls = Array.isArray(typeRowObj.portfolio_urls) && (typeRowObj.portfolio_urls as unknown[]).length > 0
      ? typeRowObj.portfolio_urls as string[]
      : Array.isArray(typeRowObj.sample_documents_urls) && (typeRowObj.sample_documents_urls as unknown[]).length > 0
        ? typeRowObj.sample_documents_urls as string[]
      : Array.isArray(ppObj.portfolio_url) ? ppObj.portfolio_url as string[]
      : ppObj.portfolio_url ? [ppObj.portfolio_url as string] : []
    const ratingRow = (ratings.data ?? [])[0] as { external_url?: string | null } | undefined
    const strArr = (v: unknown): string[] => Array.isArray(v) ? (v as unknown[]).filter(x => typeof x === 'string') as string[] : []
    return {
      providerType,
      fullName: pickStr(pObj.full_name, ppObj.full_name),
      email: pickStr(pObj.email),
      phone: pickStr(ppObj.phone, pObj.phone),
      mainCity: ops[0] ?? null,
      operatingRegions: ops,
      licenseNumber: pickStr(typeRowObj.license_number, ppObj.license_number),
      licenseAuthority: pickStr(typeRowObj.license_authority, ppObj.license_authority),
      licenseExpiry: pickStr(typeRowObj.license_expiry, ppObj.license_expiry),
      // Lawyer table uses `years_of_experience` instead of `experience_years`.
      experienceYears: pickNum(typeRowObj.experience_years, typeRowObj.years_of_experience, ppObj.experience_years),
      // Lawyer table uses `completed_projects_count` instead of `completed_projects`.
      completedProjects: pickNum(typeRowObj.completed_projects, typeRowObj.completed_projects_count),
      specializations,
      portfolioUrls,
      // Lawyer table uses `office_name` instead of `company`.
      company: pickStr(typeRowObj.company, typeRowObj.office_name, ppObj.company),
      bio: pickStr(typeRowObj.bio, typeRowObj.why_choose_me, ppObj.bio),
      website: pickStr(typeRowObj.website, ppObj.website),
      linkedinUrl: pickStr(typeRowObj.linkedin_url, ppObj.linkedin_url),
      ratingUrl: ratingRow?.external_url ?? null,
      // ── Lawyer-specific fields (null for other provider types) ──
      officeName: pickStr(typeRowObj.office_name),
      neighborhoods: strArr(typeRowObj.neighborhoods),
      preferredProjectSizes: strArr(typeRowObj.preferred_project_sizes),
      preferredComplexity: strArr(typeRowObj.preferred_complexity),
      acceptsLowFeasibility: typeof typeRowObj.accepts_low_feasibility === 'boolean' ? typeRowObj.accepts_low_feasibility : false,
      acceptsDifficultProjects: typeof typeRowObj.accepts_difficult_projects === 'boolean' ? typeRowObj.accepts_difficult_projects : false,
      inProgressProjectsCount: pickNum(typeRowObj.in_progress_projects_count),
      completedProjectTypes: strArr(typeRowObj.completed_project_types),
      sampleDocumentsUrls: strArr(typeRowObj.sample_documents_urls),
      lawyerReferences: Array.isArray(typeRowObj.references) ? typeRowObj.references as Array<{name:string;phone:string;project_name:string}> : [],
      whyChooseMe: pickStr(typeRowObj.why_choose_me),
      feeStructure: pickStr(typeRowObj.fee_structure),
      feePercent: pickNum(typeRowObj.fee_percent),
      feeFixedAmount: pickNum(typeRowObj.fee_fixed_amount),
      feeSpecialTerms: pickStr(typeRowObj.fee_special_terms),
      // ── Business-card fields (Phase A: photo + about) ──
      photoUrl: pickStr(ppObj.photo_url),
      about: pickStr(ppObj.about, typeRowObj.bio, typeRowObj.why_choose_me),
    }
  }),

  /** Populate the type-specific profile row and capture consent. */
  completeOnboarding: protectedProcedure
    .input(z.object({
      providerType: z.enum(['architect', 'appraiser', 'developer', 'lawyer']),
      fullName: z.string().min(2),
      phone: z.string().min(6),
      mainCity: z.string().min(1),
      licenseNumber: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      completedProjects: z.number().int().min(0).optional(),
      specializations: z.array(z.string()).default([]),
      portfolioUrls: z.array(z.string().url()).default([]),
      ratingUrl: z.string().url().optional(),
      // ── Lawyer-specific (all optional, only used when providerType==='lawyer') ──
      officeName: z.string().optional(),
      neighborhoods: z.array(z.string()).default([]),
      preferredProjectSizes: z.array(z.enum(['small','medium','large'])).default([]),
      preferredComplexity: z.array(z.enum(['low','medium','high'])).default([]),
      acceptsLowFeasibility: z.boolean().optional(),
      acceptsDifficultProjects: z.boolean().optional(),
      inProgressProjectsCount: z.number().int().min(0).optional(),
      completedProjectTypes: z.array(z.string()).default([]),
      sampleDocumentsUrls: z.array(z.string().url()).default([]),
      lawyerReferences: z.array(z.object({
        name: z.string(),
        phone: z.string(),
        project_name: z.string(),
      })).default([]),
      whyChooseMe: z.string().optional(),
      feeStructure: z.enum(['from_developer','from_tenants','mixed']).optional(),
      feePercent: z.number().min(0).max(100).optional(),
      feeFixedAmount: z.number().min(0).optional(),
      feeSpecialTerms: z.string().optional(),
      // ── Business-card fields ──
      photoUrl: z.string().url().optional().nullable(),
      about: z.string().max(2000).optional().nullable(),
      acceptTerms: z.boolean(),
      acceptDataUse: z.boolean(),
      acceptProjectSharing: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.acceptTerms || !input.acceptDataUse || !input.acceptProjectSharing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'יש לאשר את כל ההצהרות החובה' })
      }

      const { error: profErr } = await ctx.supabase.from('profiles')
        .update({ full_name: input.fullName, phone: input.phone })
        .eq('id', ctx.user.id)
      if (profErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profErr.message })

      // Ensure a provider_profiles row exists and save phone + main city + business-card fields
      const ppRow: Record<string, unknown> = {
        id: ctx.user.id,
        phone: input.phone,
        full_name: input.fullName,
        operating_regions: [input.mainCity],
      }
      if (input.photoUrl !== undefined) ppRow.photo_url = input.photoUrl
      if (input.about !== undefined) ppRow.about = input.about
      const { error: ppErr } = await ctx.supabase.from('provider_profiles').upsert(ppRow, { onConflict: 'id' })
      if (ppErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ppErr.message })

      const commonRow = {
        id: ctx.user.id,
        license_number: input.licenseNumber ?? null,
        operating_regions: [input.mainCity],
        experience_years: input.experienceYears ?? null,
        completed_projects: input.completedProjects ?? 0,
        portfolio_urls: input.portfolioUrls,
      }

      let upsertErr: string | undefined
      if (input.providerType === 'architect') {
        const { error } = await ctx.supabase
          .from('architect_profiles')
          .upsert({ ...commonRow, specializations: input.specializations }, { onConflict: 'id' })
        upsertErr = error?.message
      } else if (input.providerType === 'appraiser') {
        const { error } = await ctx.supabase
          .from('appraiser_profiles')
          .upsert({ ...commonRow, specialization_types: input.specializations }, { onConflict: 'id' })
        upsertErr = error?.message
      } else if (input.providerType === 'lawyer') {
        // Lawyer profile uses different column names (city, years_of_experience,
        // completed_projects_count, sample_documents_urls). Map accordingly.
        const lawyerRow: Record<string, unknown> = {
          id: ctx.user.id,
          office_name: input.officeName ?? null,
          license_number: input.licenseNumber ?? null,
          years_of_experience: input.experienceYears ?? null,
          city: input.mainCity,
          neighborhoods: input.neighborhoods,
          specializations: input.specializations,
          preferred_project_sizes: input.preferredProjectSizes,
          preferred_complexity: input.preferredComplexity,
          accepts_low_feasibility: input.acceptsLowFeasibility ?? false,
          accepts_difficult_projects: input.acceptsDifficultProjects ?? false,
          completed_projects_count: input.completedProjects ?? 0,
          in_progress_projects_count: input.inProgressProjectsCount ?? 0,
          completed_project_types: input.completedProjectTypes,
          sample_documents_urls: input.sampleDocumentsUrls.length > 0
            ? input.sampleDocumentsUrls
            : input.portfolioUrls,
          references: input.lawyerReferences,
          why_choose_me: input.whyChooseMe ?? null,
          fee_structure: input.feeStructure ?? null,
          fee_percent: input.feePercent ?? null,
          fee_fixed_amount: input.feeFixedAmount ?? null,
          fee_special_terms: input.feeSpecialTerms ?? null,
        }
        const { error } = await ctx.supabase
          .from('lawyer_profiles')
          .upsert(lawyerRow, { onConflict: 'id' })
        upsertErr = error?.message
      } else {
        const { error } = await ctx.supabase
          .from('developer_profiles')
          .upsert(commonRow, { onConflict: 'id' })
        upsertErr = error?.message
      }

      if (upsertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: upsertErr })

      if (input.ratingUrl) {
        await ctx.supabase.from('provider_ratings').insert({
          user_id: ctx.user.id,
          source: 'custom',
          external_url: input.ratingUrl,
          review_count: 0,
        })
      }

      return { success: true, providerType: input.providerType }
    }),

  /** Inline edit from the Profile tab. Same shape as completeOnboarding
   * minus the one-time consent flags (already captured). */
  updateMyDetails: protectedProcedure
    .input(z.object({
      providerType: z.enum(['architect', 'appraiser', 'developer', 'lawyer']),
      fullName: z.string().min(2),
      phone: z.string().min(6),
      mainCity: z.string().min(1),
      licenseNumber: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      completedProjects: z.number().int().min(0).optional(),
      specializations: z.array(z.string()).default([]),
      portfolioUrls: z.array(z.string().url()).default([]),
      ratingUrl: z.string().url().optional(),
      // ── Lawyer-specific (all optional, only used when providerType==='lawyer') ──
      officeName: z.string().optional(),
      neighborhoods: z.array(z.string()).default([]),
      preferredProjectSizes: z.array(z.enum(['small','medium','large'])).default([]),
      preferredComplexity: z.array(z.enum(['low','medium','high'])).default([]),
      acceptsLowFeasibility: z.boolean().optional(),
      acceptsDifficultProjects: z.boolean().optional(),
      inProgressProjectsCount: z.number().int().min(0).optional(),
      completedProjectTypes: z.array(z.string()).default([]),
      sampleDocumentsUrls: z.array(z.string().url()).default([]),
      lawyerReferences: z.array(z.object({
        name: z.string(),
        phone: z.string(),
        project_name: z.string(),
      })).default([]),
      whyChooseMe: z.string().optional(),
      feeStructure: z.enum(['from_developer','from_tenants','mixed']).optional(),
      feePercent: z.number().min(0).max(100).optional(),
      feeFixedAmount: z.number().min(0).optional(),
      feeSpecialTerms: z.string().optional(),
      // ── Business-card fields ──
      photoUrl: z.string().url().optional().nullable(),
      about: z.string().max(2000).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error: profErr } = await ctx.supabase.from('profiles')
        .update({ full_name: input.fullName, phone: input.phone })
        .eq('id', ctx.user.id)
      if (profErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profErr.message })

      const ppRow: Record<string, unknown> = {
        id: ctx.user.id,
        phone: input.phone,
        full_name: input.fullName,
        operating_regions: [input.mainCity],
      }
      if (input.photoUrl !== undefined) ppRow.photo_url = input.photoUrl
      if (input.about !== undefined) ppRow.about = input.about
      const { error: ppErr } = await ctx.supabase.from('provider_profiles').upsert(ppRow, { onConflict: 'id' })
      if (ppErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ppErr.message })

      const commonRow = {
        id: ctx.user.id,
        license_number: input.licenseNumber ?? null,
        operating_regions: [input.mainCity],
        experience_years: input.experienceYears ?? null,
        completed_projects: input.completedProjects ?? 0,
        portfolio_urls: input.portfolioUrls,
      }

      let upsertErr: string | undefined
      if (input.providerType === 'architect') {
        const { error } = await ctx.supabase
          .from('architect_profiles')
          .upsert({ ...commonRow, specializations: input.specializations }, { onConflict: 'id' })
        upsertErr = error?.message
      } else if (input.providerType === 'appraiser') {
        const { error } = await ctx.supabase
          .from('appraiser_profiles')
          .upsert({ ...commonRow, specialization_types: input.specializations }, { onConflict: 'id' })
        upsertErr = error?.message
      } else if (input.providerType === 'lawyer') {
        const lawyerRow: Record<string, unknown> = {
          id: ctx.user.id,
          office_name: input.officeName ?? null,
          license_number: input.licenseNumber ?? null,
          years_of_experience: input.experienceYears ?? null,
          city: input.mainCity,
          neighborhoods: input.neighborhoods,
          specializations: input.specializations,
          preferred_project_sizes: input.preferredProjectSizes,
          preferred_complexity: input.preferredComplexity,
          accepts_low_feasibility: input.acceptsLowFeasibility ?? false,
          accepts_difficult_projects: input.acceptsDifficultProjects ?? false,
          completed_projects_count: input.completedProjects ?? 0,
          in_progress_projects_count: input.inProgressProjectsCount ?? 0,
          completed_project_types: input.completedProjectTypes,
          sample_documents_urls: input.sampleDocumentsUrls.length > 0
            ? input.sampleDocumentsUrls
            : input.portfolioUrls,
          references: input.lawyerReferences,
          why_choose_me: input.whyChooseMe ?? null,
          fee_structure: input.feeStructure ?? null,
          fee_percent: input.feePercent ?? null,
          fee_fixed_amount: input.feeFixedAmount ?? null,
          fee_special_terms: input.feeSpecialTerms ?? null,
        }
        const { error } = await ctx.supabase
          .from('lawyer_profiles')
          .upsert(lawyerRow, { onConflict: 'id' })
        upsertErr = error?.message
      } else {
        const { error } = await ctx.supabase
          .from('developer_profiles')
          .upsert(commonRow, { onConflict: 'id' })
        upsertErr = error?.message
      }
      if (upsertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: upsertErr })

      if (input.ratingUrl) {
        // Replace: remove prior custom rating row(s) and insert the new URL.
        await ctx.supabase.from('provider_ratings')
          .delete().eq('user_id', ctx.user.id).eq('source', 'custom')
        await ctx.supabase.from('provider_ratings').insert({
          user_id: ctx.user.id,
          source: 'custom',
          external_url: input.ratingUrl,
          review_count: 0,
        })
      }

      return { success: true }
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
