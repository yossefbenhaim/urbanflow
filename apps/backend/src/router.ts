import { initTRPC } from '@trpc/server'
import { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure

// Routers (to be filled by Backend Agent)
import { tenantRouter } from './routers/tenant'
import { managerRouter } from './routers/manager'
import { committeeRouter } from './routers/committee'
import { providerRouter } from './routers/provider'

export const appRouter = router({
  tenant: tenantRouter,
  manager: managerRouter,
  committee: committeeRouter,
  provider: providerRouter,
})

export type AppRouter = typeof appRouter
