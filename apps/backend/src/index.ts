import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'
import { createContext } from './context'
import { logger } from './logger'
import { authRateLimiter, sensitiveRateLimiter, uploadRateLimiter, generalRateLimiter } from './middleware/rateLimit'
import { validateFileUpload } from './middleware/fileValidation'

const app = express()

// CORS configuration - restrict to known origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://urbanflow.byclick.co.il',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// General rate limiting
app.use(generalRateLimiter)

// Request logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'incoming request')
  next()
})

// Rate limiting for auth-related tRPC mutations
app.use('/api/trpc/auth.signIn', authRateLimiter)
app.use('/api/trpc/auth.signUp', authRateLimiter)
app.use('/api/trpc/auth.resetPassword', authRateLimiter)
app.use('/api/trpc/auth.registerTenant', authRateLimiter)
app.use('/api/trpc/auth.registerManager', authRateLimiter)
app.use('/api/trpc/auth.registerProvider', authRateLimiter)

// Rate limiting for sensitive operations (voting, signing)
app.use('/api/trpc/committee.castApartmentVote', sensitiveRateLimiter)
app.use('/api/trpc/tenant.castVote', sensitiveRateLimiter)
app.use('/api/trpc/tenant.signDocument', sensitiveRateLimiter)
app.use('/api/trpc/tenant.signDocumentWithSignature', sensitiveRateLimiter)

app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }))


// File upload proxy — uses service role to bypass storage RLS
// Security: validates user token, file type, MIME type, size, path traversal
app.post('/api/upload', uploadRateLimiter, express.raw({ type: '*/*', limit: '10mb' }), validateFileUpload, async (req: import('express').Request, res: import('express').Response) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'No token' }); return }

  // Verify the token is valid by checking with Supabase auth
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    res.status(401).json({ error: 'Token לא תקף' })
    return
  }

  const path = req.query.path as string
  // validateFileUpload already checked path exists and is safe

  const r = await fetch(`${supabaseUrl}/storage/v1/object/documents/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': req.headers['content-type'] || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: req.body,
  })
  const data = await r.json()
  res.status(r.status).json(data)
})

app.get('/health', (_req: import('express').Request, res: import('express').Response) => res.json({ status: 'ok', app: 'silver-castle-backend' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => logger.info({ port: PORT }, 'Silver Castle API running'))
// type declarations handled by tsconfig
