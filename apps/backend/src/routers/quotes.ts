import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const quotesRouter = router({
  sendRequest: protectedProcedure
    .input(z.object({
      recipientId: z.string().uuid(),
      projectDescription: z.string().min(10),
      budgetRange: z.string().optional(),
      timeline: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_requests')
        .insert({
          sender_id: ctx.user.id,
          recipient_id: input.recipientId,
          project_description: input.projectDescription,
          budget_range: input.budgetRange,
          timeline: input.timeline,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  getMyRequests: protectedProcedure.query(async ({ ctx }) => {
    // quote_requests FKs reference auth.users, not profiles — embedded
    // join via profiles!… would fail PGRST200. Two-step fetch.
    interface QuoteRequestRow {
      id: string
      sender_id: string
      recipient_id: string
      project_description: string
      budget_range: string | null
      timeline: string | null
      status: string
      created_at: string
      updated_at: string | null
      quote_responses: Array<{
        id: string
        quote_request_id: string
        responder_id: string
        content: string
        price_offer: string | null
        created_at: string
      }>
    }
    type Profile = { id: string; full_name: string | null; role: string | null }
    const { data: rows } = await ctx.supabase
      .from('quote_requests')
      .select('*, quote_responses(*)')
      .eq('recipient_id', ctx.user.id)
      .order('created_at', { ascending: false })
    const list = (rows ?? []) as QuoteRequestRow[]
    if (list.length === 0) return [] as Array<QuoteRequestRow & { sender: Profile | null }>
    const senderIds = Array.from(new Set(list.map(r => r.sender_id)))
    const { data: profs } = await ctx.supabase.from('profiles').select('id, full_name, role').in('id', senderIds)
    const profMap = new Map<string, Profile>(((profs ?? []) as Profile[]).map(p => [p.id, p]))
    return list.map((r): QuoteRequestRow & { sender: Profile | null } => ({
      ...r, sender: profMap.get(r.sender_id) ?? null,
    }))
  }),

  getSentRequests: protectedProcedure.query(async ({ ctx }) => {
    interface QuoteRequestRow {
      id: string
      sender_id: string
      recipient_id: string
      project_description: string
      budget_range: string | null
      timeline: string | null
      status: string
      created_at: string
      updated_at: string | null
      quote_responses: Array<{
        id: string
        quote_request_id: string
        responder_id: string
        content: string
        price_offer: string | null
        created_at: string
      }>
    }
    type Profile = { id: string; full_name: string | null; role: string | null }
    const { data: rows } = await ctx.supabase
      .from('quote_requests')
      .select('*, quote_responses(*)')
      .eq('sender_id', ctx.user.id)
      .order('created_at', { ascending: false })
    const list = (rows ?? []) as QuoteRequestRow[]
    if (list.length === 0) return [] as Array<QuoteRequestRow & { recipient: Profile | null }>
    const recipientIds = Array.from(new Set(list.map(r => r.recipient_id)))
    const { data: profs } = await ctx.supabase.from('profiles').select('id, full_name, role').in('id', recipientIds)
    const profMap = new Map<string, Profile>(((profs ?? []) as Profile[]).map(p => [p.id, p]))
    return list.map((r): QuoteRequestRow & { recipient: Profile | null } => ({
      ...r, recipient: profMap.get(r.recipient_id) ?? null,
    }))
  }),

  respond: protectedProcedure
    .input(z.object({
      quoteRequestId: z.string().uuid(),
      content: z.string().min(5),
      priceOffer: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('quote_responses')
        .insert({
          quote_request_id: input.quoteRequestId,
          responder_id: ctx.user.id,
          content: input.content,
          price_offer: input.priceOffer,
        })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      await ctx.supabase.from('quote_requests').update({ status: 'responded' }).eq('id', input.quoteRequestId)
      return { ok: true }
    }),
})
