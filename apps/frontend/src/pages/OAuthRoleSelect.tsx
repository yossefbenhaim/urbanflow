import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const roles = [
  { key: 'tenant' as const, icon: '🏠', title: 'דייר', subtitle: 'אני גר בבניין המיועד לפינוי-בינוי' },
  { key: 'organizer' as const, icon: '🏢', title: 'מארגן דיירים', subtitle: 'מארגן / עו"ד / נציג ועד' },
  { key: 'provider' as const, icon: '🔧', title: 'נותן שירות', subtitle: 'קבלן / אדריכל / מפקח' },
]

export default function OAuthRoleSelect() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<'tenant' | 'organizer' | 'provider' | null>(null)
  const [error, setError] = useState('')

  const { data: me } = trpc.auth.me.useQuery()

  // Get name from Google user_metadata
  const googleName = (me as any)?.user_metadata?.full_name ?? (me as any)?.user_metadata?.name ?? ''

  // If user already has a role, redirect immediately
  useEffect(() => {
    if (me?.role) {
      const map: Record<string, string> = {
        tenant: '/dashboard', organizer: '/manager', manager: '/manager', provider: '/provider',
      }
      navigate(map[me.role] ?? '/dashboard', { replace: true })
    }
  }, [me, navigate])

  const complete = trpc.auth.completeOAuthProfile.useMutation({
    onSuccess: (data: { success: boolean; role: string }) => {
      const map: Record<string, string> = { tenant: '/dashboard', organizer: '/manager', manager: '/manager', provider: '/provider' }
      navigate(map[data.role] ?? '/dashboard', { replace: true })
    },
    onError: (err: { message: string }) => setError(err.message),
  })

  const handleSubmit = () => {
    if (!selectedRole) { setError('אנא בחר תפקיד'); return }
    setError('')
    complete.mutate({ fullName: googleName, role: selectedRole })
  }

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: '24px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
        padding: '48px 40px', maxWidth: '520px', width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👋</div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>
            {googleName ? `שלום, ${googleName.split(' ')[0]}!` : 'ברוך הבא!'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>
            רק שלב אחד לפני שמתחילים — מה התפקיד שלך?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {roles.map((r) => (
            <button key={r.key} onClick={() => setSelectedRole(r.key)} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px 20px', borderRadius: '14px',
              border: selectedRole === r.key ? '2px solid #2563EB' : '2px solid rgba(255,255,255,0.1)',
              background: selectedRole === r.key ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'right', width: '100%',
            }}>
              <span style={{ fontSize: '28px' }}>{r.icon}</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{r.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '2px' }}>{r.subtitle}</div>
              </div>
              {selectedRole === r.key && <span style={{ marginRight: 'auto', color: '#2563EB', fontSize: '20px' }}>✓</span>}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={complete.isPending || !selectedRole} style={{
          width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
          background: selectedRole ? 'linear-gradient(135deg, #2563EB, #7c3aed)' : 'rgba(255,255,255,0.1)',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: !selectedRole || complete.isPending ? 'not-allowed' : 'pointer',
          opacity: !selectedRole || complete.isPending ? 0.6 : 1, transition: 'all 0.2s',
        }}>
          {complete.isPending ? 'שומר...' : 'כניסה למערכת →'}
        </button>
      </div>
    </div>
  )
}
