import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../backend/src/router'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers: () => {
        const token = localStorage.getItem('sb-token')
        return token ? { Authorization: `Bearer ${token}` } : {}
      }
    })
  ]
})
