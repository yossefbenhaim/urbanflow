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
    const { data } = await ctx.supabase
      .from('quote_requests')
      .select('*, sender:profiles!quote_requests_sender_id_fkey(id,full_name,role), quote_responses(*)')
      .eq('recipient_id', ctx.user.id)
      .order('created_at', { ascending: false })
    return data ?? []
  }),

  getSentRequests: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('quote_requests')
      .select('*, recipient:profiles!quote_requests_recipient_id_fkey(id,full_name,role), quote_responses(*)')
      .eq('sender_id', ctx.user.id)
      .order('created_at', { ascending: false })
    return data ?? []
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
