import { router } from './middleware/auth'
import { faqRouter } from './routers/faq'
import { authRouter } from './routers/auth'
import { tenantRouter } from './routers/tenant'
import { managerRouter } from './routers/manager'
import { committeeRouter } from './routers/committee'
import { providerRouter } from './routers/provider'
import { organizerRouter } from './routers/organizer'

export const appRouter = router({
  auth: authRouter,
  faq: faqRouter,
  tenant: tenantRouter,
  manager: managerRouter,
  committee: committeeRouter,
  provider: providerRouter,
  organizer: organizerRouter,
})

export type AppRouter = typeof appRouter
