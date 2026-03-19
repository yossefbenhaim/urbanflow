import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'
import { createContext } from './context'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }))


// File upload proxy — uses service role to bypass storage RLS
app.post('/api/upload', express.raw({ type: '*/*', limit: '15mb' }), async (req: import('express').Request, res: import('express').Response) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'No token' }); return }
  const path = req.query.path as string
  if (!path) { res.status(400).json({ error: 'No path' }); return }
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
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
app.listen(PORT, () => console.log(`🚀 Silver Castle API running on :${PORT}`))
// type declarations handled by tsconfig
