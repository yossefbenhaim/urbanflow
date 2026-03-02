import { z } from 'zod'
import { router, publicProcedure } from '../middleware/auth'

export const faqRouter = router({
  // כל נושאי הroot
  getTopics: publicProcedure.query(async ({ ctx }: { ctx: any }) => {
    const { data, error } = await ctx.supabase
      .from('faq_nodes')
      .select('id, topic, question, is_leaf, order_index')
      .is('parent_id', null)
      .order('order_index')
    if (error) throw error
    return data ?? []
  }),

  // תת-שאלות של node
  getChildren: publicProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      const { data, error } = await ctx.supabase
        .from('faq_nodes')
        .select('id, topic, question, is_leaf, order_index')
        .eq('parent_id', input.parentId)
        .order('order_index')
      if (error) throw error
      return data ?? []
    }),

  // שאלה + תשובה מלאה
  getNode: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      const { data, error } = await ctx.supabase
        .from('faq_nodes')
        .select('*')
        .eq('id', input.id)
        .single()
      if (error) throw error
      return data
    }),

  // שמירת שאלת משתמש
  submitQuestion: publicProcedure
    .input(z.object({
      question: z.string().min(3).max(500),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      const { error } = await ctx.supabase
        .from('user_questions')
        .insert({ question: input.question, email: input.email ?? null })
      if (error) throw error
      return { success: true }
    }),
})
