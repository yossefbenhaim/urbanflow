/**
 * Mock tRPC client for frontend tests.
 *
 * This provides a mock of the tRPC react-query hooks.
 * For component tests, wrap your component with MockTRPCProvider.
 *
 * Usage:
 *   import { MockTRPCProvider } from '../test/mocks/trpc'
 *   render(<MockTRPCProvider><YourComponent /></MockTRPCProvider>)
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '../../lib/trpc'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function MockTRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
      }),
    ],
  })

  return React.createElement(
    trpc.Provider,
    { client: trpcClient, queryClient },
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}
