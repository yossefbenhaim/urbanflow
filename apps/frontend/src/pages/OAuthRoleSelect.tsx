import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const roles = [
  { key: 'tenant' as const, icon: '🏠', title: 'דייר', subtitle: 'אני גר בבניין המיועד לפינוי-בינוי' },
  { key: 'manager' as const, icon: '🏢', title: 'מנהל פרויקט', subtitle: 'יזם / עו"ד / מנהל פרויקט' },
  { key: 'provider' as const, icon: '🔧', title: 'נותן שירות', subtitle: 'קבלן / אדריכל / מפקח' },
]

export default function OAuthRoleSelect() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<'tenant' | 'manager' | 'provider' | null>(null)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')

  const { data: me } = trpc.auth.me.useQuery()

  // If user already has a role, redirect immediately
  useEffect(() => {
    if (me?.role) {
      const map: Record<string, string> = { tenant: '/dashboard', manager: '/manager', provider: '/provider' }
      navigate(map[me.role] ?? '/dashboard', { replace: true })
    }
  }, [me, navigate])

  const complete = trpc.auth.completeOAuthProfile.useMutation({
    onSuccess: (data: { success: boolean; role: 'tenant' | 'manager' | 'provider' }) => {
      const map = { tenant: '/dashboard', manager: '/manager', provider: '/provider' }
      navigate(map[data.role], { replace: true })
    },
    onError: (err: { message: string }) => setError(err.message),
  })

  const handleSubmit = () => {
    if (!selectedRole) { setError('אנא בחר תפקיד'); return }
    if (fullName.trim().length < 2) { setError('אנא הכנס שם מלא'); return }
    setError('')
    complete.mutate({ fullName: fullName.trim(), role: selectedRole })
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
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>ברוך הבא!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>כמה פרטים אחרונים לפני שמתחילים</p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>שם מלא</label>
          <input
            type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="ישראל ישראלי"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>מה התפקיד שלך?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        </div>

        {error && <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={complete.isPending} style={{
          width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #2563EB, #7c3aed)',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: complete.isPending ? 'not-allowed' : 'pointer',
          opacity: complete.isPending ? 0.7 : 1, transition: 'all 0.2s',
        }}>
          {complete.isPending ? 'שומר...' : 'כניסה למערכת →'}
        </button>
      </div>
    </div>
  )
}
