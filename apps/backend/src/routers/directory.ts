import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'

export const directoryRouter = router({
  getProviders: protectedProcedure
    .input(z.object({ role: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('profiles')
        .select('id, full_name, role, phone, provider_profiles(company, bio, service_types, operating_regions, experience_years, photo_url, about), developer_profiles(company, bio, operating_regions, completed_projects)')
        .in('role', ['provider', 'developer'])
      if (input?.role) q = q.eq('role', input.role)
      if (input?.search) q = q.ilike('full_name', `%${input.search}%`)
      const { data } = await q
      return data ?? []
    }),

  getProfile: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('profiles')
        .select('*, provider_profiles(*), developer_profiles(*)')
        .eq('id', input.userId)
        .single()
      return data
    }),

  /** Public provider profile for the business-card page. Aggregates
   * identity + type-specific row + provider_ratings for display. */
  getPublicProviderProfile: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const uid = input.userId
      const [p, pp, arch, apr, dev, law, ratings] = await Promise.all([
        ctx.supabase.from('profiles').select('id, full_name, email, role').eq('id', uid).maybeSingle(),
        ctx.supabase.from('provider_profiles').select('*').eq('id', uid).maybeSingle(),
        ctx.supabase.from('architect_profiles').select('*').eq('id', uid).maybeSingle(),
        ctx.supabase.from('appraiser_profiles').select('*').eq('id', uid).maybeSingle(),
        ctx.supabase.from('developer_profiles').select('*').eq('id', uid).maybeSingle(),
        ctx.supabase.from('lawyer_profiles').select('*').eq('id', uid).maybeSingle(),
        ctx.supabase.from('provider_ratings').select('id, source, rating, review_count, review_text, external_url, submitted_by, created_at').eq('user_id', uid),
      ])

      if (!p.data) return null

      const providerType = arch.data ? 'architect'
        : apr.data ? 'appraiser'
          : dev.data ? 'developer'
            : law.data ? 'lawyer'
              : null
      const typeRow = (arch.data ?? apr.data ?? dev.data ?? law.data ?? {}) as Record<string, unknown>
      const ppObj = (pp.data ?? {}) as Record<string, unknown>
      const pObj = p.data as Record<string, unknown>
      const pickStr = (...vals: unknown[]) =>
        (vals.find(v => typeof v === 'string' && (v as string).trim().length > 0) as string | undefined) ?? null
      const pickNum = (...vals: unknown[]) =>
        (vals.find(v => typeof v === 'number') as number | undefined) ?? null
      const strArr = (v: unknown): string[] =>
        Array.isArray(v) ? (v as unknown[]).filter(x => typeof x === 'string') as string[] : []

      const specializations = strArr(typeRow.specializations).length > 0
        ? strArr(typeRow.specializations)
        : strArr(typeRow.specialization_types).length > 0
          ? strArr(typeRow.specialization_types)
          : strArr(typeRow.preferred_project_types)
      const operatingRegions = strArr(typeRow.operating_regions).length > 0
        ? strArr(typeRow.operating_regions)
        : strArr(ppObj.operating_regions)

      const ratingRows = (ratings.data ?? []) as Array<{
        id: string
        source: string
        rating: number | null
        review_count: number | null
        review_text: string | null
        external_url: string | null
        submitted_by: string | null
        created_at: string
      }>
      const inApp = ratingRows.filter(r => r.source === 'in_app' && typeof r.rating === 'number')
      const ratingAvg = inApp.length > 0
        ? inApp.reduce((s, r) => s + (r.rating ?? 0), 0) / inApp.length
        : null
      const externalLinks = ratingRows
        .filter(r => r.source !== 'in_app' && r.external_url)
        .map(r => ({ source: r.source, url: r.external_url as string, rating: r.rating, count: r.review_count }))
      const reviews = ratingRows
        .filter(r => r.source === 'in_app')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(r => ({ id: r.id, rating: r.rating, text: r.review_text, submittedBy: r.submitted_by, createdAt: r.created_at }))

      return {
        userId: uid,
        fullName: pickStr(pObj.full_name, ppObj.full_name) ?? (pObj.email as string | null) ?? '',
        role: (pObj.role as string | null) ?? 'provider',
        providerType,
        photoUrl: pickStr(ppObj.photo_url),
        about: pickStr(ppObj.about, typeRow.bio, typeRow.why_choose_me),
        mainCity: operatingRegions[0] ?? null,
        operatingRegions,
        experienceYears: pickNum(typeRow.experience_years, typeRow.years_of_experience),
        completedProjects: pickNum(typeRow.completed_projects, typeRow.completed_projects_count),
        specializations,
        portfolioUrls: strArr(typeRow.portfolio_urls),
        company: pickStr(typeRow.company, typeRow.office_name, ppObj.company),
        website: pickStr(typeRow.website, ppObj.website),
        linkedinUrl: pickStr(typeRow.linkedin_url, ppObj.linkedin_url),
        ratingAvg,
        ratingCount: inApp.length,
        externalLinks,
        reviews,
      }
    }),
})
