import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const tenantRouter = router({
  getMyProject: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles').select('*, unit:units(*, building:buildings(*, project:projects(*)))').eq('user_id', ctx.user.id).single()
    if (!tp) return null
    const project = tp.unit?.building?.project
    const { data: milestones } = await ctx.supabase
      .from('milestones').select('*').eq('project_id', project?.id).order('order_num')
    return { ...project, milestones, unit: tp.unit, building: tp.unit?.building }
  }),

  getDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = (tp?.unit as any)?.building?.project_id
    if (!projectId) return []
    const { data: docs } = await ctx.supabase
      .from('documents').select('*, signatures(signed_at)').eq('project_id', projectId)
      .in('type', ['SIGN_REQUIRED', 'INFO_ONLY'])
    return docs ?? []
  }),

  getTimeline: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles').select('unit:units(building:buildings(project_id))').eq('user_id', ctx.user.id).single()
    const projectId = (tp?.unit as any)?.building?.project_id
    if (!projectId) return []
    const { data } = await ctx.supabase
      .from('milestones').select('*').eq('project_id', projectId).order('order_num')
    return data ?? []
  }),

  getLeadership: protectedProcedure.query(async ({ ctx }) => {
    const { data: tp } = await ctx.supabase
      .from('tenant_profiles').select('unit:units(building:buildings(project:projects(*,manager:profiles(*))))').eq('user_id', ctx.user.id).single()
    return (tp?.unit as any)?.building?.project ?? null
  }),

  updateProfile: protectedProcedure
    .input(z.object({ fullName: z.string().optional(), phone: z.string().optional(), idNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('profiles').update({ full_name: input.fullName, phone: input.phone, id_number: input.idNumber }).eq('id', ctx.user.id)
      if (error) throw error
      return { success: true }
    }),

  completeOnboarding: protectedProcedure
    .input(z.object({
      fullName: z.string(), idNumber: z.string(), phone: z.string(),
      unitId: z.string(), isOwner: z.boolean(),
      parkingNumber: z.string().optional(), storageNumber: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from('profiles').update({ full_name: input.fullName, phone: input.phone, id_number: input.idNumber }).eq('id', ctx.user.id)
      await ctx.supabase.from('tenant_profiles').upsert({
        user_id: ctx.user.id, unit_id: input.unitId,
        is_owner: input.isOwner, is_onboarded: true,
        parking_number: input.parkingNumber, storage_number: input.storageNumber
      })
      return { success: true }
    }),

  signDocument: protectedProcedure
    .input(z.object({ docId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from('signatures').insert({
        document_id: input.docId, user_id: ctx.user.id, verified_otp: true
      })
      if (error) throw error
      return { success: true, signedAt: new Date().toISOString() }
    }),

  requestOTP: protectedProcedure.mutation(async ({ ctx }) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    console.log(`[OTP] User ${ctx.user.id}: ${otp}`)
    return { sent: true }
  }),

  // Silver Castle: join project by invite code
  joinProject: protectedProcedure
    .input(z.object({ inviteCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data: project, error: pe } = await ctx.supabase
        .from('projects')
        .select('id, name')
        .eq('invite_code', input.inviteCode.toUpperCase())
        .single()
      if (pe || !project) throw new TRPCError({ code: 'NOT_FOUND', message: 'קוד לא תקין' })

      const { error } = await ctx.supabase
        .from('project_tenants')
        .upsert({ project_id: project.id, tenant_id: ctx.user.id }, { onConflict: 'project_id,tenant_id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { projectId: project.id, projectName: project.name }
    }),

  // Silver Castle: get tenant's project membership
  getProjectMembership: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('project_tenants')
      .select('*, projects(id, name, address, invite_code)')
      .eq('tenant_id', ctx.user.id)
      .single()
    return (data as any)?.projects ?? null
  }),

  // Silver Castle: update apartment profile
  updateApartmentProfile: protectedProcedure
    .input(z.object({
      floor: z.number().optional(),
      apartmentNumber: z.string().optional(),
      apartmentSizeSqm: z.number().optional(),
      rooms: z.number().optional(),
      ownershipType: z.enum(['owner', 'renter']).optional(),
      signedPowerOfAttorney: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('tenant_profiles')
        .upsert({
          id: ctx.user.id,
          floor: input.floor,
          apartment_number: input.apartmentNumber,
          apartment_size_sqm: input.apartmentSizeSqm,
          rooms: input.rooms,
          ownership_type: input.ownershipType,
          signed_power_of_attorney: input.signedPowerOfAttorney,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // Silver Castle: get tenant status
  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    const [{ data: pt }, { data: tp }] = await Promise.all([
      ctx.supabase.from('project_tenants').select('project_id').eq('tenant_id', ctx.user.id).single(),
      ctx.supabase.from('tenant_profiles').select('apartment_number').eq('id', ctx.user.id).single(),
    ])
    return {
      hasProject: !!pt?.project_id,
      profileComplete: !!tp?.apartment_number,
    }
  }),
})
