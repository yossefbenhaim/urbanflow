import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

export const learningRouter = router({
  // Get all active content, optionally filtered by stage
  getContentForStage: publicProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let stage: string | null = null

      // If projectId is provided, get the project's current stage
      if (input?.projectId) {
        const { data: project } = await ctx.supabase
          .from('projects')
          .select('status')
          .eq('id', input.projectId)
          .maybeSingle()

        if (project?.status) {
          // Map project status to learning stage
          const stageMap: Record<string, string> = {
            INITIAL: 'initial',
            SURVEY: 'initial',
            REPRESENTATION: 'representation',
            NEGOTIATION: 'representation',
            AGREEMENT: 'tender',
            SIGNATURES: 'tender',
            PLANNING: 'inspections',
            PERMIT: 'inspections',
            EVACUATION: 'evacuation',
            CONSTRUCTION: 'evacuation',
            DELIVERY: 'evacuation',
          }
          stage = stageMap[project.status] || null
        }
      }

      let query = ctx.supabase
        .from('learning_content')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      if (stage) {
        query = query.eq('stage', stage)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // Get all content (no filter)
  getAllContent: publicProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('learning_content')
        .select('*')
        .eq('is_active', true)
        .order('order_index')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // Mark content as completed
  markCompleted: protectedProcedure
    .input(z.object({ contentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('learning_progress')
        .upsert(
          {
            user_id: ctx.user.id,
            content_id: input.contentId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,content_id' }
        )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // Get user's progress
  getProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const { data: progress, error: progressErr } = await ctx.supabase
        .from('learning_progress')
        .select('content_id, completed, completed_at')
        .eq('user_id', ctx.user.id)

      if (progressErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: progressErr.message })

      const { data: total, error: totalErr } = await ctx.supabase
        .from('learning_content')
        .select('id')
        .eq('is_active', true)

      if (totalErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: totalErr.message })

      const completedCount = (progress ?? []).filter((p: { completed: boolean }) => p.completed).length
      const totalCount = (total ?? []).length

      return {
        completed: completedCount,
        total: totalCount,
        progress: progress ?? [],
      }
    }),
})
