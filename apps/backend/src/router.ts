import { router } from './middleware/auth'
import { faqRouter } from './routers/faq'
import { authRouter } from './routers/auth'
import { tenantRouter } from './routers/tenant'
import { managerRouter } from './routers/manager'
import { committeeRouter } from './routers/committee'
import { providerRouter } from './routers/provider'
import { organizerRouter } from './routers/organizer'
import { addressRouter } from './routers/address'
import { chatRouter } from './routers/chat'
import { directoryRouter } from './routers/directory'
import { quotesRouter } from './routers/quotes'
import { inspectionsRouter } from './routers/inspections'
import { tendersRouter } from './routers/tenders'
import { validationRouter } from './routers/validation'
import { learningRouter } from './routers/learning'
import { developerRouter } from './routers/developer'
import { matchRouter } from './routers/match'

export const appRouter = router({
  auth: authRouter,
  faq: faqRouter,
  tenant: tenantRouter,
  manager: managerRouter,
  committee: committeeRouter,
  provider: providerRouter,
  organizer: organizerRouter,
  address: addressRouter,
  chat: chatRouter,
  directory: directoryRouter,
  quotes: quotesRouter,
  inspections: inspectionsRouter,
  tenders: tendersRouter,
  validation: validationRouter,
  learning: learningRouter,
  developer: developerRouter,
  match: matchRouter,
})

export type AppRouter = typeof appRouter
