import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'
import { createContext } from './context'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }))

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'urbanflow-backend' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 UrbanFlow API running on :${PORT}`))
