import { TRPCError } from '@trpc/server'
import { initTRPC } from '@trpc/server'
import { Context } from '../context'
import { sanitizeInput } from './sanitize'

const t = initTRPC.context<Context>().create()

/** Middleware that sanitizes all string inputs against XSS */
const sanitizeMiddleware = t.middleware(async ({ next, getRawInput }) => {
  const rawInput = await getRawInput()
  if (rawInput !== undefined) {
    // Sanitize input in-place (mutate the raw input object)
    const sanitized = sanitizeInput(rawInput)
    // We pass the sanitized input via a wrapper
    return next({ getRawInput: () => Promise.resolve(sanitized) })
  }
  return next()
})

export const router = t.router
export const publicProcedure = t.procedure.use(sanitizeMiddleware)

export const protectedProcedure = t.procedure.use(sanitizeMiddleware).use(async ({ ctx, next }) => {
  if (!ctx.token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'נדרשת כניסה למערכת' })
  const { data: { user }, error } = await ctx.supabase.auth.getUser(ctx.token)
  if (error || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token לא תקף' })
  return next({ ctx: { ...ctx, user } })
})
