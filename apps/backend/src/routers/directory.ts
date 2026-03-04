import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'

export const directoryRouter = router({
  getProviders: protectedProcedure
    .input(z.object({ role: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('profiles')
        .select('id, full_name, role, phone, provider_profiles(company, bio, service_types, operating_regions, experience_years), developer_profiles(company, bio, operating_regions, completed_projects)')
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
})
