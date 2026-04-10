import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../middleware/auth'
import { logger } from '../logger'

const AI_SYSTEM_PROMPT = `אתה עוזר לדיירים בפרויקטי התחדשות עירונית (פינוי בינוי, תמ"א 38).
ענה בשפה פשוטה וברורה, ללא מונחים משפטיים מורכבים.
אם לא בטוח בתשובה — אמור בבירור שצריך לבדוק עם עורך דין.
תמיד היה אמפתי ותומך — הדיירים עוברים תהליך מורכב.
ענה בעברית בלבד.`

export const faqRouter = router({
  // כל נושאי הroot
  getTopics: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('faq_nodes')
      .select('id, topic, question, is_leaf, order_index')
      .is('parent_id', null)
      .order('order_index')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // תת-שאלות של node
  getChildren: publicProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('faq_nodes')
        .select('id, topic, question, is_leaf, order_index')
        .eq('parent_id', input.parentId)
        .order('order_index')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // שאלה + תשובה מלאה
  getNode: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('faq_nodes')
        .select('*')
        .eq('id', input.id)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'FAQ node not found' })
      return data
    }),

  // שמירת שאלת משתמש
  submitQuestion: publicProcedure
    .input(z.object({
      question: z.string().min(3).max(500),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('user_questions')
        .insert({ question: input.question, email: input.email ?? null })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // AI Chat — שאלה חופשית
  askAI: publicProcedure
    .input(z.object({
      question: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input }) => {
      try {
        // Try OpenAI first, fallback to Anthropic
        const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return {
            answer: 'מצטער, שירות ה-AI לא זמין כרגע. נסה שוב מאוחר יותר, או פנה ישירות לנציג הוועד שלך.',
            source: 'fallback',
          }
        }

        if (process.env.OPENAI_API_KEY) {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: AI_SYSTEM_PROMPT },
                { role: 'user', content: input.question },
              ],
              max_tokens: 500,
              temperature: 0.7,
            }),
          })
          const data = await response.json() as { choices?: { message?: { content?: string } }[] }
          const answer = data.choices?.[0]?.message?.content || 'לא הצלחתי לענות. נסה לנסח את השאלה אחרת.'
          return { answer, source: 'openai' as const }
        }

        if (process.env.ANTHROPIC_API_KEY) {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              system: AI_SYSTEM_PROMPT,
              messages: [{ role: 'user', content: input.question }],
              max_tokens: 500,
            }),
          })
          const data = await response.json() as { content?: { text?: string }[] }
          const answer = data.content?.[0]?.text || 'לא הצלחתי לענות. נסה לנסח את השאלה אחרת.'
          return { answer, source: 'anthropic' as const }
        }

        return {
          answer: 'מצטער, שירות ה-AI לא זמין כרגע.',
          source: 'fallback',
        }
      } catch (err) {
        logger.error({ err }, 'AI Chat error')
        return {
          answer: 'אירעה שגיאה בשירות ה-AI. נסה שוב מאוחר יותר.',
          source: 'error',
        }
      }
    }),
})
