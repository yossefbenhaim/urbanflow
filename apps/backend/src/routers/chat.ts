import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const chatRouter = router({
  startConversation: protectedProcedure
    .input(z.object({ recipientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.user.id
      const other = input.recipientId
      const { data: existing } = await ctx.supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_a.eq.${me},participant_b.eq.${other}),and(participant_a.eq.${other},participant_b.eq.${me})`)
        .single()
      if (existing) return { conversationId: existing.id }
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
