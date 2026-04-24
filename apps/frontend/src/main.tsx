import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trpc, trpcClient } from './lib/trpc'
import App from './App'
import './index.css'

function formatTrpcError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'שגיאה לא ידועה'
  const e = err as { message?: string; data?: { code?: string } }
  // UNAUTHORIZED bubbles up when token refresh itself fails — user just
  // logged out, no need to nag with a toast.
  if (e.data?.code === 'UNAUTHORIZED') return ''
  return e.message || 'שגיאה בביצוע הפעולה'
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Generic notification layer: every mutation that fails without its own
// onError handler surfaces a red toast. Every query error similarly.
// Components with their own error UI can still override by passing
// onError to useMutation / useQuery.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Don't toast background refetches the user didn't trigger.
      if (query.state.data !== undefined) return
      const msg = formatTrpcError(error)
      if (msg) toast.error(msg)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Skip if the calling mutation already handled the error itself.
      if (mutation.options.onError) return
      const msg = formatTrpcError(error)
      if (msg) toast.error(msg)
    },
    onSuccess: (_data, _vars, _ctx, mutation) => {
      // Per-mutation opt-in success toast via meta.successMessage.
      const msg = (mutation.meta as { successMessage?: string } | undefined)?.successMessage
      if (msg) toast.success(msg)
    },
  }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
)
