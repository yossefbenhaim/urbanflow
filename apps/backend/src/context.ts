import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { createClient } from '@supabase/supabase-js'

export const createContext = ({ req }: CreateExpressContextOptions) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const token = req.headers.authorization?.replace('Bearer ', '')
  return { supabase, token }
}

export type Context = Awaited<ReturnType<typeof createContext>>
