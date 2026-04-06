import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, TRPCClientError } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import type { AppRouter } from '../../../backend/src/router'

export const trpc = createTRPCReact<AppRouter>()

// In-flight refresh promise to avoid concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('sb-refresh-token')
  if (!refreshToken) return false
  try {
    const res = await fetch('/api/trpc/auth.refreshToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "0": { json: { refreshToken } } }),
    })
    const data = await res.json()
    const result = Array.isArray(data)
      ? data[0]?.result?.data?.json
      : data?.result?.data?.json
    if (result?.accessToken) {
      localStorage.setItem('sb-token', result.accessToken)
      if (result.refreshToken) localStorage.setItem('sb-refresh-token', result.refreshToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

function refreshTokenIfNeeded(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

/**
 * Custom tRPC link that intercepts UNAUTHORIZED errors,
 * attempts a token refresh, and retries the original request once.
 */
function retryOnAuthErrorLink() {
  return () => {
    return ({ op, next }: any) => {
      return observable((observer: any) => {
        let retried = false
        const execute = () => {
          const unsub = next(op).subscribe({
            next(value: any) { observer.next(value) },
            error(err: any) {
              const isUnauthorized =
                err instanceof TRPCClientError && err.data?.code === 'UNAUTHORIZED'
              // Don't retry refresh or sign-in calls to avoid loops
              const isAuthCall = op.path === 'auth.refreshToken' || op.path === 'auth.signIn'
              if (isUnauthorized && !retried && !isAuthCall) {
                retried = true
                refreshTokenIfNeeded().then((ok) => {
                  if (ok) {
                    execute() // retry with new token
                  } else {
                    observer.error(err)
                  }
                })
              } else {
                observer.error(err)
              }
            },
            complete() { observer.complete() },
          })
          return unsub
        }
        execute()
      })
    }
  }
}

export const trpcClient = trpc.createClient({
  links: [
    retryOnAuthErrorLink(),
    httpBatchLink({
      url: '/api/trpc',
      headers: () => {
        const token = localStorage.getItem('sb-token')
        return token ? { Authorization: `Bearer ${token}` } : {}
      }
    })
  ]
})
