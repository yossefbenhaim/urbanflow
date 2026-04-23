import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'
import { TRPCError } from '@trpc/server'

const StatusEnum = z.enum(['todo', 'in_progress', 'done', 'cancelled'])
const PriorityEnum = z.enum(['low', 'medium', 'high'])

export const tasksRouter = router({
  create: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      title: z.string().min(2),
      description: z.string().optional(),
      assignedTo: z.string().uuid().optional().nullable(),
      priority: PriorityEnum.default('medium'),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('project_tasks')
        .insert({
          project_id: input.projectId,
          title: input.title,
          description: input.description,
          assigned_to: input.assignedTo ?? null,
          created_by: ctx.user.id,
          priority: input.priority,
          due_date: input.dueDate,
          status: 'todo',
        })
        .select().single()
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return data
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedTo: z.string().uuid().optional().nullable(),
      status: StatusEnum.optional(),
      priority: PriorityEnum.optional(),
      dueDate: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const payload: Record<string, unknown> = {}
      if (patch.title !== undefined) payload.title = patch.title
      if (patch.description !== undefined) payload.description = patch.description
      if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo
      if (patch.priority !== undefined) payload.priority = patch.priority
      if (patch.dueDate !== undefined) payload.due_date = patch.dueDate
      if (patch.status !== undefined) {
        payload.status = patch.status
        if (patch.status === 'done') payload.completed_at = new Date().toISOString()
      }
      const { data, error } = await ctx.supabase
        .from('project_tasks')
        .update(payload)
        .eq('id', id)
        .select().single()
      if (error || !data) throw new TRPCError({ code: 'BAD_REQUEST', message: error?.message ?? 'שגיאה' })
      return data
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('project_tasks')
        .delete()
        .eq('id', input)
      if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      return { ok: true }
    }),

  listForProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), status: StatusEnum.optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', input.projectId)
        .order('created_at', { ascending: false })
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      return data ?? []
    }),

  listMyAssignments: protectedProcedure
    .input(z.object({ status: StatusEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('project_tasks')
        .select('*, project:projects(name)')
        .eq('assigned_to', ctx.user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (input?.status) q = q.eq('status', input.status)
      const { data } = await q
      return data ?? []
    }),

  countOverdue: protectedProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('project_tasks')
        .select('id')
        .eq('assigned_to', ctx.user.id)
        .in('status', ['todo', 'in_progress'])
        .lt('due_date', new Date().toISOString())
      return { count: (data ?? []).length }
    }),
})
