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
  const [manualName, setManualName] = useState('')
  const [error, setError] = useState('')

  const token = localStorage.getItem('sb-token')
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, { enabled: !!token })

  const googleName = (me as any)?.user_metadata?.full_name ?? (me as any)?.user_metadata?.name ?? ''
  const needsName = !isLoading && !googleName

  useEffect(() => {
    if (!isLoading && me?.role) {
      const map: Record<string, string> = {
        tenant: '/dashboard', organizer: '/organizer', manager: '/organizer', provider: '/provider',
      }
      navigate(map[me.role] ?? '/dashboard', { replace: true })
    }
  }, [me, isLoading, navigate])

  const complete = trpc.auth.completeOAuthProfile.useMutation({
    onSuccess: (data: { success: boolean; role: string }) => {
      const map: Record<string, string> = { tenant: '/dashboard', organizer: '/organizer', manager: '/organizer', provider: '/provider' }
      navigate(map[data.role] ?? '/dashboard', { replace: true })
    },
    onError: (err: { message: string }) => setError(err.message),
  })

  const handleSubmit = () => {
    if (!selectedRole) { setError('אנא בחר תפקיד'); return }
    const name = googleName || manualName.trim()
    if (!name) { setError('אנא הכנס את שמך'); return }
    setError('')
    complete.mutate({ fullName: name, role: selectedRole })
  }

  return (
    <div dir="rtl" className="min-h-screen bg-sc-bg flex items-center justify-center font-heebo p-6">
      <div className="bg-white border border-sc-gray-light rounded-3xl shadow-sm p-10 sm:p-12 max-w-[520px] w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-sc-dark text-2xl font-extrabold mb-2">
            {isLoading ? '...' : googleName ? `שלום, ${googleName.split(' ')[0]}!` : 'ברוך הבא!'}
          </h1>
          <p className="text-sc-gray text-sm">
            רק שלב אחד לפני שמתחילים — מה התפקיד שלך?
          </p>
        </div>

        {/* Name field if Google didn't provide one */}
        {needsName && (
          <div className="mb-6">
            <label className="text-sc-gray text-sm block mb-2">
              שמך המלא
            </label>
            <input
              type="text"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              placeholder="ישראל ישראלי"
              className="sc-input"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 mb-8">
          {roles.map((r) => (
            <button key={r.key} onClick={() => setSelectedRole(r.key)}
              className={`flex items-center gap-4 p-4 rounded-[14px] border-2 text-right w-full transition-all
                ${selectedRole === r.key ? 'border-sc-blue bg-sc-blue-pale' : 'border-sc-gray-light bg-white hover:bg-sc-bg'}`}
            >
              <span className="text-3xl">{r.icon}</span>
              <div className="flex-1">
                <div className="text-sc-dark font-semibold">{r.title}</div>
                <div className="text-sc-gray text-sm mt-0.5">{r.subtitle}</div>
              </div>
              {selectedRole === r.key && <span className="text-sc-blue text-xl">✓</span>}
            </button>
          ))}
        </div>

        {error && <p className="text-sc-error text-center mb-4 text-sm">{error}</p>}

        <button onClick={handleSubmit} disabled={complete.isPending || !selectedRole}
          className="sc-btn-primary w-full py-4 text-base disabled:opacity-50">
          {complete.isPending ? 'שומר...' : 'כניסה למערכת →'}
        </button>
      </div>
    </div>
  )
}
