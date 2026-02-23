import { TRPCError } from '@trpc/server'
import { initTRPC } from '@trpc/server'
import { Context } from '../context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'נדרשת כניסה למערכת' })
  const { data: { user }, error } = await ctx.supabase.auth.getUser(ctx.token)
  if (error || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token לא תקף' })
  return next({ ctx: { ...ctx, user } })
})
