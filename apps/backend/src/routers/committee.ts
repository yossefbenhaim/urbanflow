import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'

export const committeeRouter = router({
  getBuildingOverview: protectedProcedure.query(async ({ ctx }) => {
    const { data: buildings } = await ctx.supabase
      .from('buildings').select('*, units(count), tenant_profiles(count)')
      .eq('committee_contact_id', ctx.user.id)
    return buildings ?? []
  }),

  getTenantSignatureStatus: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tenant_profiles')
        .select('*, profile:profiles(*), unit:units!inner(building_id), signatures:signatures(signed_at)')
        .eq('unit.building_id', input)
      return data ?? []
    }),

  sendReminder: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      console.log(`[REMINDER] Sent to tenant ${input} by ${ctx.user.id}`)
      // TODO: integrate with Supabase Edge Functions for real SMS/email
      return { sent: true, tenantId: input }
    }),

  broadcastMessage: protectedProcedure
    .input(z.object({ buildingId: z.string(), title: z.string(), body: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: units } = await ctx.supabase.from('units').select('count').eq('building_id', input.buildingId)
      const count = (units as any)?.[0]?.count ?? 0
      const { data, error } = await ctx.supabase.from('broadcast_messages').insert({
        building_id: input.buildingId, sender_id: ctx.user.id,
        title: input.title, body: input.body,
        recipient_count: count, channel: 'EMAIL'
      }).select().single()
      if (error) throw error
      return data
    }),

  createMeetingMinutes: protectedProcedure
    .input(z.object({ buildingId: z.string(), date: z.string(), attendees: z.array(z.string()), decisions: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from('meeting_minutes').insert({
        building_id: input.buildingId, date: input.date,
        attendees: input.attendees, decisions: input.decisions,
        created_by: ctx.user.id
      }).select().single()
      if (error) throw error
      return data
    }),

  getMeetingMinutes: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('meeting_minutes').select('*').eq('building_id', input).order('date', { ascending: false })
      return data ?? []
    })
})
