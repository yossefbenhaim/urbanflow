import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const organizerRouter = router({
  createProject: protectedProcedure
    .input(z.object({ name: z.string().min(2), address: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data, error } = await ctx.supabase
        .from('projects')
        .insert({
          name: input.name,
          address: input.address,
          organizer_id: ctx.user.id,
          manager_id: ctx.user.id,
          invite_code: inviteCode,
          type: 'PINUI_BINUI',
          status: 'INITIAL',
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: data.id, inviteCode: data.invite_code, name: data.name }
    }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('projects')
      .select('*, project_tenants(count)')
      .eq('organizer_id', ctx.user.id)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  getProjectTenants: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('project_tenants')
        .select('*, profiles(id, full_name, email, phone)')
        .eq('project_id', input.projectId)
      return data ?? []
    }),

  inviteByEmail: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('project_invites')
        .insert({ project_id: input.projectId, email: input.email })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { sent: true }
    }),

  getInvites: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', input.projectId)
        .order('sent_at', { ascending: false })
      return data ?? []
    }),
})
