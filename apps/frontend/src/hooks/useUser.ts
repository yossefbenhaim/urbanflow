import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export type UserProfile = {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  idNumber: string | null
  role: 'tenant' | 'manager' | 'provider' | null
}

export const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  tenant:   { label: 'דייר',         color: 'bg-blue-100 text-blue-700',    icon: '🏠' },
  manager:  { label: 'מנהל פרויקט', color: 'bg-purple-100 text-purple-700', icon: '🏢' },
  provider: { label: 'נותן שירות',  color: 'bg-green-100 text-green-700',   icon: '🔧' },
}

export function useUser() {
  const navigate = useNavigate()
  const token = localStorage.getItem('sb-token')

  const { data: profile, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  })

  // Token expired or invalid → redirect to login
  useEffect(() => {
    if (isError) {
      localStorage.removeItem('sb-token')
      navigate('/')
    }
  }, [isError, navigate])

  const signOut = trpc.auth.signOut.useMutation({
    onSettled: () => {
      localStorage.removeItem('sb-token')
      navigate('/')
    },
  })

  return {
    profile: profile as UserProfile | undefined,
    loading: isLoading,
    signOut: () => signOut.mutate(),
  }
}
