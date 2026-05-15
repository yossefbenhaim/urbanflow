import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

const TaskStatus = z.enum(['open', 'in_progress', 'done', 'cancelled'])

export const buildingTasksRouter = router({
  // Tasks assigned to the current user across all buildings.
  listMine: protectedProcedure
    .input(z.object({ status: TaskStatus.optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('building_tasks')
        .select(`
          *,
          building:buildings(id, address, city)
        `)
        .eq('assigned_to', ctx.user.id)
        .order('created_at', { ascending: false })
      if (input?.status) q = q.eq('status', input.status)
      const { data } = await q
      return data ?? []
    }),

  // All tasks for a given building (visible to tenants of that building).
  listForBuilding: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid(), status: TaskStatus.optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('building_tasks')
        .select('*')
        .eq('building_id', input.buildingId)
        .order('created_at', { ascending: false })
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      return data ?? []
    }),

  // Upload (or attach) a file to a task and mark it done.
  uploadFile: protectedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      fileUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: task } = await ctx.supabase
        .from('building_tasks').select('*').eq('id', input.taskId).single()
      if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'משימה לא נמצאה' })
      if (task.assigned_to !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'המשימה לא משוייכת אליך' })
      }
      const { data, error } = await ctx.supabase
        .from('building_tasks')
        .update({
          file_url: input.fileUrl,
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.taskId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Generic status update.
  updateStatus: protectedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      status: TaskStatus,
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = { status: input.status }
      if (input.status === 'done') patch.completed_at = new Date().toISOString()
      const { data, error } = await ctx.supabase
        .from('building_tasks')
        .update(patch)
        .eq('id', input.taskId)
        .eq('assigned_to', ctx.user.id)
        .select().single()
      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה' })
      return data
    }),

  countMineOpen: protectedProcedure.query(async ({ ctx }) => {
    const { count } = await ctx.supabase
      .from('building_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', ctx.user.id)
      .in('status', ['open', 'in_progress'])
    return { count: count ?? 0 }
  }),

  // Inherit open committee tasks for a building. Callable by an organizer or
  // developer whose project covers this building. Spec: Yossef 2026-05-15 12:21
  // — "when a developer or organizer joins, all these tasks transfer to them
  // with the responsibility".
  takeOwnership: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify caller is an organizer or developer.
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('role')
        .eq('id', ctx.user.id)
        .single()
      const role = (profile as { role?: string } | null)?.role
      if (role !== 'organizer' && role !== 'developer') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'רק יזם או מארגן יכולים לקחת אחריות' })
      }
      // Verify caller has a project that covers this building.
      const { data: bld } = await ctx.supabase
        .from('buildings')
        .select('id, project_id')
        .eq('id', input.buildingId)
        .single()
      const projectId = (bld as { project_id?: string | null } | null)?.project_id
      if (!projectId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'לבניין אין פרויקט משויך' })
      }
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, organizer_id, manager_id, developer_id')
        .eq('id', projectId)
        .single()
      type P = { organizer_id?: string | null; manager_id?: string | null; developer_id?: string | null }
      const p = (project as P | null) ?? {}
      const isOwner = p.organizer_id === ctx.user.id || p.manager_id === ctx.user.id || p.developer_id === ctx.user.id
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'אינך הבעלים של הפרויקט' })
      }

      // Reassign every open committee-task for this building.
      const { data: reassigned, error } = await ctx.supabase
        .from('building_tasks')
        .update({ assigned_to: ctx.user.id, assigned_role: role })
        .eq('building_id', input.buildingId)
        .eq('assigned_role', 'committee')
        .in('status', ['open', 'in_progress'])
        .select('id')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { reassigned: (reassigned ?? []).length }
    }),

  // Count of unclaimed committee tasks for a building (so UI can offer the
  // "take ownership" CTA).
  countUnclaimedCommitteeTasks: protectedProcedure
    .input(z.object({ buildingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { count } = await ctx.supabase
        .from('building_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('building_id', input.buildingId)
        .eq('assigned_role', 'committee')
        .in('status', ['open', 'in_progress'])
      return { count: count ?? 0 }
    }),
})
