import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  id_number: string | null
  role: 'tenant' | 'manager' | 'provider' | null
  avatar_url: string | null
}

export const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  tenant:   { label: 'דייר',          color: 'bg-blue-100 text-blue-700',   icon: '🏠' },
  manager:  { label: 'מנהל פרויקט',  color: 'bg-purple-100 text-purple-700', icon: '🏢' },
  provider: { label: 'נותן שירות',   color: 'bg-green-100 text-green-700',  icon: '🔧' },
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, id_number, role, avatar_url')
      .eq('id', userId)
      .single()

    setProfile(data as UserProfile | null)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut, refetch: () => user && fetchProfile(user.id) }
}
