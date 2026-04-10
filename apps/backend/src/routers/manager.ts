import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../middleware/auth'

export const managerRouter = router({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.from('projects').select('*, buildings(count)').eq('manager_id', ctx.user.id)
    return data ?? []
  }),

  getProjectById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data: project } = await ctx.supabase
        .from('projects').select('*, buildings(*, units(count))').eq('id', input).eq('manager_id', ctx.user.id).single()
      if (!project) return null
      const { count: signedCount } = await ctx.supabase.from('signatures')
        .select('*', { count: 'exact', head: true })
        .in('document_id', ctx.supabase.from('documents').select('id').eq('project_id', input) as unknown as string[])
      return { ...project, signedCount }
    }),

  createProject: protectedProcedure
    .input(z.object({ name: z.string(), type: z.enum(['PINUY_BINUY','TAMA_38_1','TAMA_38_2','IBUY_BINUY']), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('projects').insert({ ...input, manager_id: ctx.user.id, status: 'INITIAL' }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateProject: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), type: z.string().optional(), status: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const { error } = await ctx.supabase.from('projects').update(rest).eq('id', id).eq('manager_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  addBuilding: protectedProcedure
    .input(z.object({ projectId: z.string(), address: z.string(), city: z.string(), unitsCount: z.number(), floors: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, ...rest } = input
      const { data, error } = await ctx.supabase.from('buildings').insert({ project_id: projectId, units_count: rest.unitsCount, ...rest }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getAllTenants: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tenant_profiles').select('*, profile:profiles(*), unit:units(*, building:buildings!inner(project_id))')
        .eq('unit.building.project_id', input)
      return data ?? []
    }),

  createInvitationLink: protectedProcedure
    .input(z.object({ buildingId: z.string(), unitId: z.string().optional(), role: z.enum(['TENANT','COMMITTEE']).default('TENANT') }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID()
      const { data, error } = await ctx.supabase.from('invitation_links').insert({
        token, building_id: input.buildingId, unit_id: input.unitId,
        role: input.role, created_by: ctx.user.id,
        project_id: (await ctx.supabase.from('buildings').select('project_id').eq('id', input.buildingId).single()).data?.project_id
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ...data, url: `https://urbanflow.byclick.co.il/join/${token}` }
    }),

  createServiceListing: protectedProcedure
    .input(z.object({ projectId: z.string(), title: z.string(), description: z.string(), serviceType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('service_listings').insert({
        project_id: input.projectId, title: input.title,
        description: input.description, service_type: input.serviceType,
        created_by: ctx.user.id, status: 'OPEN'
      }).select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getApplications: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('service_applications').select('*, provider:provider_profiles(*, profile:profiles(*))').eq('listing_id', input)
      return data ?? []
    })
})
