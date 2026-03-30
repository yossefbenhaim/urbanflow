import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const organizerRouter = router({
  createProject: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      renewalType: z.enum(['pinuy_binuy', 'tama_38_b', 'halufat_shaked', 'binuy_pinuy']).optional(),
    }))
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
          type: 'PINUY_BINUY',
          status: 'INITIAL',
          renewal_type: input.renewalType ?? 'pinuy_binuy',
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

  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('projects')
      .select('*')
      .eq('organizer_id', ctx.user.id)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  getProjectTenants: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('project_tenants')
        .select('*, profiles(id, full_name, email, phone, is_building_representative)')
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

  joinByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, name, organizer_id')
        .eq('invite_code', input.code.toUpperCase())
        .single()
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'קוד לא תקף' })

      const { data: existing } = await ctx.supabase
        .from('project_tenants')
        .select('tenant_id')
        .eq('project_id', project.id)
        .eq('tenant_id', ctx.user.id)
        .single()
      if (existing) return { projectId: project.id, projectName: project.name, alreadyMember: true }

      await ctx.supabase.from('project_tenants').insert({
        project_id: project.id,
        tenant_id: ctx.user.id,
        status: 'active',
      })
      return { projectId: project.id, projectName: project.name, alreadyMember: false }
    }),

  saveContract: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
      fileUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('projects')
        .update({
          contract_start_date: input.startDate,
          contract_end_date: input.endDate,
          contract_file_url: input.fileUrl ?? null,
          contract_signed_at: new Date().toISOString(),
          contract_signed_by: ctx.user.id,
        })
        .eq('id', input.projectId)
        .eq('organizer_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { saved: true }
    }),

  getProjectGroup: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: buildings } = await ctx.supabase
        .from('buildings')
        .select('id')
        .eq('project_id', input.projectId)
      if (!buildings || buildings.length === 0) return null
      const buildingIds = buildings.map((b: { id: string }) => b.id)
      const { data: group } = await ctx.supabase
        .from('building_groups')
        .select('*')
        .in('building_id', buildingIds)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      return group ?? null
    }),

  createProjectGroup: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: buildings } = await ctx.supabase
        .from('buildings')
        .select('id')
        .eq('project_id', input.projectId)
      let buildingId: string
      if (!buildings || buildings.length === 0) {
        const { data: project } = await ctx.supabase.from('projects').select('name, address').eq('id', input.projectId).single()
        const { data: building, error: bErr } = await ctx.supabase
          .from('buildings')
          .insert({ project_id: input.projectId, name: project?.name ?? 'בניין', address: project?.address ?? '' })
          .select('id').single()
        if (bErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: bErr.message })
        buildingId = building.id
      } else {
        buildingId = (buildings as { id: string }[])[0].id
      }
      const { data: group, error } = await ctx.supabase
        .from('building_groups')
        .insert({ building_id: buildingId, name: input.name })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      await ctx.supabase.from('building_group_members').insert({ group_id: group.id, user_id: ctx.user.id })
      return group
    }),

  getGroupMessages: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('group_messages')
        .select('*, sender:profiles!group_messages_sender_id_fkey(id, full_name)')
        .eq('group_id', input.groupId)
        .order('created_at', { ascending: true })
      return data ?? []
    }),

  sendGroupMessage: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('group_messages')
        .insert({ group_id: input.groupId, sender_id: ctx.user.id, content: input.content })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { sent: true }
    }),
})
