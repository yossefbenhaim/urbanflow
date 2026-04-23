import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

const KindEnum = z.enum(['past_projects_excel', 'site_analysis', 'custom_report'])

/**
 * Insight uploads feed the match engine. When admin-approved insights exist
 * for a provider, scoring adds +3 per similar past project (capped at +15).
 * Clients pre-parse structured Excel data into `parsed_json` shape:
 *   {"past_projects":[{"city":"X","project_type":"pinuy_binuy","profit_pct":22}, ...]}
 */
export const insightsRouter = router({
  upload: protectedProcedure
    .input(z.object({
      kind: KindEnum,
      fileUrl: z.string().url(),
      fileName: z.string().optional(),
      description: z.string().optional(),
      parsedJson: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('provider_insights_uploads')
        .insert({
          user_id: ctx.user.id,
          kind: input.kind,
          file_url: input.fileUrl,
          file_name: input.fileName,
          description: input.description,
          parsed_json: input.parsedJson ?? null,
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  list: protectedProcedure
    .input(z.object({ approvedOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('provider_insights_uploads')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
      if (input?.approvedOnly) q = q.eq('admin_approved', true)
      const { data } = await q
      return data ?? []
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('provider_insights_uploads')
        .delete()
        .eq('id', input)
        .eq('user_id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return { ok: true }
    }),

  /** Admin-only: approve an insight so it starts feeding match scoring */
  adminApprove: protectedProcedure
    .input(z.object({ id: z.string().uuid(), approved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { data: profile } = await ctx.supabase
        .from('profiles').select('role').eq('id', ctx.user.id).single()
      if (!profile || (profile as { role: string }).role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'מנהלים בלבד' })
      }
      const { data, error } = await ctx.supabase
        .from('provider_insights_uploads')
        .update({
          admin_approved: input.approved,
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewer_id: ctx.user.id,
        })
        .eq('id', input.id)
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  /** Count approved similar past projects — used by match engine for boost */
  countSimilarApproved: protectedProcedure
    .input(z.object({
      userId: z.string().uuid().optional(),
      city: z.string().optional(),
      projectType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id
      const { data } = await ctx.supabase
        .from('provider_insights_uploads')
        .select('parsed_json')
        .eq('user_id', userId)
        .eq('admin_approved', true)
      let count = 0
      for (const row of (data ?? []) as { parsed_json: { past_projects?: { city?: string; project_type?: string }[] } | null }[]) {
        const past = row.parsed_json?.past_projects ?? []
        for (const p of past) {
          if (input.city && p.city && p.city !== input.city) continue
          if (input.projectType && p.project_type && p.project_type !== input.projectType) continue
          count++
        }
      }
      return { count }
    }),
})
