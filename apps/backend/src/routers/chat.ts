import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const chatRouter = router({
  startConversation: protectedProcedure
    .input(z.object({ recipientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.user.id
      const other = input.recipientId
      if (me === other) throw new TRPCError({ code: 'BAD_REQUEST', message: 'לא ניתן לפתוח שיחה עם עצמך' })

      // Providers can only *initiate* conversations with users who already
      // reached out to them in some way:
      //   - sent them a quote request (quote_requests.recipient_id = me)
      //   - posted a tender the provider submitted a proposal to
      //     (tenders.created_by = other AND provider submitted)
      //   - awarded them a tender (tenders.winner_id = me)
      //   - an existing conversation already exists
      // Committee reps / managers / tenants / organizers are unrestricted.
      const { data: myProfile } = await ctx.supabase
        .from('profiles').select('role').eq('id', me).single()
      const myRole = (myProfile as { role?: string } | null)?.role ?? ''
      const isProvider = ['provider', 'developer'].includes(myRole)

      // Always check for an existing conversation first — idempotent + used as proof of prior contact.
      const { data: existing } = await ctx.supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_a.eq.${me},participant_b.eq.${other}),and(participant_a.eq.${other},participant_b.eq.${me})`)
        .maybeSingle()
      if (existing) return { conversationId: (existing as { id: string }).id }

      if (isProvider) {
        // Did the other party send me a quote request?
        const { data: quote } = await ctx.supabase
          .from('quote_requests').select('id').eq('sender_id', other).eq('recipient_id', me).limit(1).maybeSingle()

        // Did I submit a proposal to a tender the other party created?
        const { data: myProposals } = await ctx.supabase
          .from('tender_proposals')
          .select('tender_id, tenders:tenders!tender_proposals_tender_id_fkey(created_by)')
          .eq('provider_id', me)
        type Row = { tender_id: string; tenders?: { created_by?: string } | Array<{ created_by?: string }> }
        const matchedTender = ((myProposals ?? []) as Row[]).some(r => {
          const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders
          return t?.created_by === other
        })

        // Did the other party award me a tender?
        const { data: awarded } = await ctx.supabase
          .from('tenders').select('id').eq('winner_id', me).eq('created_by', other).limit(1).maybeSingle()

        if (!quote && !matchedTender && !awarded) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'לא ניתן לפתוח שיחה עם משתמש זה לפני שקיבלת ממנו הצעת מחיר או הגשת הצעה למכרז שלו.',
          })
        }
      }

      const { data, error } = await ctx.supabase
        .from('conversations')
        .insert({ participant_a: me, participant_b: other })
        .select('id').single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { conversationId: data.id }
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id
    const { data } = await ctx.supabase
      .from('conversations')
      .select('*, pa:profiles!conversations_participant_a_fkey(id,full_name,role), pb:profiles!conversations_participant_b_fkey(id,full_name,role)')
      .or(`participant_a.eq.${me},participant_b.eq.${me}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
    return data ?? []
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id,full_name)')
        .eq('conversation_id', input.conversationId)
        .order('created_at', { ascending: true })
      return data ?? []
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('messages')
        .insert({ conversation_id: input.conversationId, sender_id: ctx.user.id, content: input.content })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      await ctx.supabase.from('conversations').update({
        last_message: input.content.slice(0, 100),
        last_message_at: new Date().toISOString()
      }).eq('id', input.conversationId)
      return { sent: true }
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', input.conversationId)
        .neq('sender_id', ctx.user.id)
        .is('read_at', null)
      return { ok: true }
    }),
})
