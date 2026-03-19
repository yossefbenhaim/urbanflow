import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { TRPCClientError } from '@trpc/client'

export type UserProfile = {
  id: string; fullName: string | null; email: string | null
  phone: string | null; idNumber: string | null
  role: 'tenant' | 'manager' | 'provider' | 'organizer' | 'developer' | null
}

export const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  tenant:   { label: 'דייר',         color: 'bg-blue-100 text-blue-700',    icon: '🏠' },
  manager:  { label: 'מנהל פרויקט', color: 'bg-purple-100 text-purple-700', icon: '🏢' },
  provider: { label: 'נותן שירות',  color: 'bg-green-100 text-green-700',   icon: '🔧' },
  organizer: { label: 'מארגן',       color: 'bg-orange-100 text-orange-700', icon: '📋' },
  developer: { label: 'יזם',         color: 'bg-yellow-100 text-yellow-700', icon: '👑' },
}

export const getToken = () => localStorage.getItem('sb-token')
export const getRefreshToken = () => localStorage.getItem('sb-refresh-token')
export const saveTokens = (access: string, refresh?: string | null) => {
  localStorage.setItem('sb-token', access)
  if (refresh) localStorage.setItem('sb-refresh-token', refresh)
}
export const clearTokens = () => {
  localStorage.removeItem('sb-token')
  localStorage.removeItem('sb-refresh-token')
}

export async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch('/api/trpc/auth.refreshToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { refreshToken } }),
    })
    const data = await res.json()
    const result = data?.result?.data?.json
    if (result?.accessToken) {
      saveTokens(result.accessToken, result.refreshToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

export function useUser() {
  const navigate = useNavigate()
  const token = getToken()
  const refreshingRef = useRef(false)

  const { data: profile, isLoading, isError, error } = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
    retry: (failureCount, err) => {
      // Only retry network errors, not auth errors
      const isAuthError = err instanceof TRPCClientError && err.data?.code === 'UNAUTHORIZED'
      if (isAuthError) return false
      return failureCount < 2
    },
    retryDelay: 1000,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  useEffect(() => {
    if (!isError || refreshingRef.current) return
    
    // Only log out for UNAUTHORIZED errors, not network errors
    const isAuthError = error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED'
    if (!isAuthError) return // ignore network errors — stay logged in

    refreshingRef.current = true
    tryRefreshToken().then(success => {
      refreshingRef.current = false
      if (success) {
        window.location.reload()
      } else {
        clearTokens()
        navigate('/')
      }
    })
  }, [isError, error, navigate])

  // Proactive refresh every 50 min
  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      tryRefreshToken().then(ok => { if (!ok) { clearTokens(); navigate('/') } })
    }, 50 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token, navigate])

  const signOut = trpc.auth.signOut.useMutation({
    onSettled: () => { clearTokens(); navigate('/') },
  })

  return {
    profile: profile as UserProfile | undefined,
    loading: isLoading,
    signOut: () => signOut.mutate(),
  }
}
