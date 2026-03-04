import { router } from './middleware/auth'
import { faqRouter } from './routers/faq'
import { authRouter } from './routers/auth'
import { tenantRouter } from './routers/tenant'
import { managerRouter } from './routers/manager'
import { committeeRouter } from './routers/committee'
import { providerRouter } from './routers/provider'
import { organizerRouter } from './routers/organizer'
import { chatRouter } from './routers/chat'
import { directoryRouter } from './routers/directory'
import { quotesRouter } from './routers/quotes'

export const appRouter = router({
  auth: authRouter,
  faq: faqRouter,
  tenant: tenantRouter,
  manager: managerRouter,
  committee: committeeRouter,
  provider: providerRouter,
  organizer: organizerRouter,
  chat: chatRouter,
  directory: directoryRouter,
  quotes: quotesRouter,
})

export type AppRouter = typeof appRouter
