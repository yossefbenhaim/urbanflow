import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

const ComplexityEnum = z.enum(['low', 'medium', 'high', 'any'])
const RiskEnum = z.enum(['low', 'medium', 'high', 'any'])
const WorkTypeEnum = z.enum(['full_accompaniment', 'spot_consulting', 'specific_phase', 'any'])
const ProjectTypeEnum = z.enum(['pinuy_binuy', 'tama_38_2', 'chalufat_shaked', 'binui_pinui'])

interface Prefs {
  cities: string[]
  project_types: string[]
  complexity_pref: string
  risk_pref: string
  min_profitability_pct: number | null
  work_type: string
  preferred_timeline_months: number | null
  min_score_for_notification: number
}

interface ProjectRow {
  id: string
  name: string
  address: string | null
  project_type: string | null
  status: string
  estimated_value?: number | null
  created_at: string
}

/** Deterministic 0-100 score given preferences and a project row */
export function scoreProject(prefs: Prefs, project: ProjectRow, pastSimilarCount = 0): number {
  let score = 0

  // City match — 30 points (match against project address since projects
  // don't carry a dedicated city column; falls back to substring match)
  if (prefs.cities.length === 0) {
    score += 15 // neutral: no preference = half credit
  } else if (project.address && prefs.cities.some(c => project.address!.includes(c))) {
    score += 30
  }

  // Project type match — 25 points
  if (prefs.project_types.length === 0) {
    score += 12
  } else if (project.project_type && prefs.project_types.includes(project.project_type)) {
    score += 25
  }

  // Complexity fit — 15 points. Heuristic from estimated_value bucket.
  const value = project.estimated_value ?? 0
  const inferredComplexity =
    value >= 50_000_000 ? 'high'
    : value >= 5_000_000 ? 'medium'
    : 'low'
  if (prefs.complexity_pref === 'any' || prefs.complexity_pref === inferredComplexity) {
    score += 15
  } else {
    const dist = Math.abs(['low','medium','high'].indexOf(prefs.complexity_pref) - ['low','medium','high'].indexOf(inferredComplexity))
    if (dist === 1) score += 7
  }

  // Risk fit — 10 points
  // Without explicit project risk data, treat as 'any' = full credit
  score += 10 // baseline neutral until projects carry a risk field

  // Profitability — 10 points
  // estimated_value vs min_profitability_pct — we only have total value, give credit if project is >1M ILS
  if (prefs.min_profitability_pct == null) score += 10
  else if ((project.estimated_value ?? 0) >= 1_000_000) score += 10
  else score += 5

  // Past similar projects experience — 10 points, capped at 10
  score += Math.min(pastSimilarCount * 3, 10)

  return Math.max(0, Math.min(100, score))
}

export const matchRouter = router({
  // ── Get my preferences ───────────────────────────────
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('provider_match_preferences')
      .select('*')
      .eq('user_id', ctx.user.id)
      .maybeSingle()
    return data ?? null
  }),

  // ── Upsert preferences ───────────────────────────────
  setPreferences: protectedProcedure
    .input(z.object({
      cities: z.array(z.string()).default([]),
      projectTypes: z.array(ProjectTypeEnum).default([]),
      complexityPref: ComplexityEnum.default('any'),
      riskPref: RiskEnum.default('any'),
      minProfitabilityPct: z.number().optional().nullable(),
      workType: WorkTypeEnum.default('any'),
      preferredTimelineMonths: z.number().int().optional().nullable(),
      minScoreForNotification: z.number().int().min(0).max(100).default(70),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('provider_match_preferences')
        .upsert({
          user_id: ctx.user.id,
          cities: input.cities,
          project_types: input.projectTypes,
          complexity_pref: input.complexityPref,
          risk_pref: input.riskPref,
          min_profitability_pct: input.minProfitabilityPct ?? null,
          work_type: input.workType,
          preferred_timeline_months: input.preferredTimelineMonths ?? null,
          min_score_for_notification: input.minScoreForNotification,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  // ── Score a single project ───────────────────────────
  scoreProjectForMe: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: prefs } = await ctx.supabase
        .from('provider_match_preferences')
        .select('*')
        .eq('user_id', ctx.user.id)
        .maybeSingle()
      if (!prefs) return { score: 0, reason: 'no_preferences' }

      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id,name,address,project_type,status,estimated_value,created_at')
        .eq('id', input.projectId)
        .single()
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      const score = scoreProject(prefs as Prefs, project as ProjectRow, 0)
      return { score, project }
    }),

  // ── Top recommended projects ─────────────────────────
  getRecommendedProjects: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10

      const { data: prefs } = await ctx.supabase
        .from('provider_match_preferences')
        .select('*')
        .eq('user_id', ctx.user.id)
        .maybeSingle()

      if (!prefs) {
        return { recommendations: [], hasPreferences: false }
      }

      // Only consider projects that are active & open for providers
      const { data: projects } = await ctx.supabase
        .from('projects')
        .select('id,name,address,project_type,status,estimated_value,created_at')
        .in('status', ['INITIAL', 'SURVEY', 'REPRESENTATION', 'TENDER', 'NEGOTIATION'])
        .order('created_at', { ascending: false })
        .limit(100)

      const rows = (projects ?? []) as ProjectRow[]
      const scored = rows.map(p => ({
        project: p,
        score: scoreProject(prefs as Prefs, p, 0),
      }))
      scored.sort((a, b) => b.score - a.score)

      return {
        recommendations: scored.slice(0, limit),
        hasPreferences: true,
        minScoreForNotification: (prefs as Prefs).min_score_for_notification,
      }
    }),
})
