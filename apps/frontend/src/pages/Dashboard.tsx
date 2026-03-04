import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const STAGES = ['סקר','ייצוג','מו"מ','הסכם','חתימות','תכנון','היתר','פינוי','בנייה','מסירה']

const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

function StageIndex(status?: string) {
  const order = ['INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT',
    'SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY']
  return order.indexOf(status ?? '') ?? 0
}

// --- Silver Castle: Join Project Screen ---
function JoinProjectScreen({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('')
  const joinProject = trpc.tenant.joinProject.useMutation({
    onSuccess: () => onJoined(),
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm mx-4 text-center">
        <div className="text-5xl mb-4">🏢</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">הצטרף לפרויקט</h1>
        <p className="text-gray-500 text-sm mb-6">הזן את קוד ההצטרפות שקיבלת ממארגן הדיירים</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="XXXXXX"
          maxLength={6}
          className="w-full text-center text-2xl font-mono tracking-widest border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          dir="ltr"
        />
        {joinProject.isError && (
          <p className="text-red-500 text-sm mb-3">קוד לא תקין, נסה שנית</p>
        )}
        <button
          onClick={() => joinProject.mutate({ inviteCode: code })}
          disabled={code.length !== 6 || joinProject.isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {joinProject.isPending ? 'מצטרף...' : 'הצטרף'}
        </button>
      </div>
    </div>
  )
}

// --- Silver Castle: Apartment Profile Wizard ---
function ApartmentProfileWizard({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({
    floor: '',
    apartmentNumber: '',
    rooms: '',
    apartmentSizeSqm: '',
    ownershipType: 'owner' as 'owner' | 'renter',
  })
  const updateProfile = trpc.tenant.updateApartmentProfile.useMutation({
    onSuccess: () => onComplete(),
  })

  const handleSubmit = () => {
    updateProfile.mutate({
      floor: form.floor ? parseInt(form.floor) : undefined,
      apartmentNumber: form.apartmentNumber || undefined,
      rooms: form.rooms ? parseInt(form.rooms) : undefined,
      apartmentSizeSqm: form.apartmentSizeSqm ? parseFloat(form.apartmentSizeSqm) : undefined,
      ownershipType: form.ownershipType,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm mx-4">
        <div className="text-4xl text-center mb-4">🏠</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">פרטי הדירה</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">נא למלא את פרטי הדירה שלך</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קומה</label>
              <input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מס' דירה</label>
              <input type="text" value={form.apartmentNumber} onChange={e => setForm(f => ({ ...f, apartmentNumber: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">חדרים</label>
              <input type="number" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">גודל (מ"ר)</label>
              <input type="number" value={form.apartmentSizeSqm} onChange={e => setForm(f => ({ ...f, apartmentSizeSqm: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סוג החזקה</label>
            <div className="flex gap-3">
              {(['owner', 'renter'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, ownershipType: type }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.ownershipType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {type === 'owner' ? '🔑 בעלים' : '🏠 שוכר'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={updateProfile.isPending}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {updateProfile.isPending ? 'שומר...' : 'המשך'}
        </button>
      </div>
    </div>
  )
}

// --- Main Dashboard ---
function JoinProjectInline({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('')
  const join = trpc.tenant.joinProject.useMutation({ onSuccess: onJoined })
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="קוד 6 ספרות"
        maxLength={6}
        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '13px', width: '120px', textAlign: 'center', letterSpacing: '0.15em', fontWeight: 600 }}
      />
      <button
        onClick={() => join.mutate({ inviteCode: code })}
        disabled={code.length !== 6 || join.isPending}
        style={{ padding: '6px 14px', borderRadius: '8px', background: '#2563EB', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: code.length !== 6 ? 0.5 : 1 }}
      >
        {join.isPending ? '...' : 'הצטרף'}
      </button>
      {join.isError && <span style={{ color: '#dc2626', fontSize: '12px' }}>קוד לא תקין</span>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: myStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.tenant.getMyStatus.useQuery()


  const { data: project, isLoading } = trpc.tenant.getMyProject.useQuery()
  const { data: docs } = trpc.tenant.getDocuments.useQuery()
  const { data: leadership } = trpc.tenant.getLeadership.useQuery()
  const signDoc = trpc.tenant.signDocument.useMutation()

  if (statusLoading || isLoading) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    </div>
  )

  // Full dashboard
  const currentStage = StageIndex(project?.status)
  const signed = project?.signatures?.length ?? 0
  const total = project?.milestones?.length ?? 0
  const pct = total ? Math.round((signed / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Banner: no project */}
      {myStatus && !myStatus.hasProject && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ color: '#92400e', fontSize: '14px', fontWeight: 500 }}>
            ⚠️ טרם הצטרפת לפרויקט — הכנס קוד הצטרפות שקיבלת מהמארגן שלך
          </span>
          <JoinProjectInline onJoined={() => refetchStatus()} />
        </div>
      )}
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Onboarding Tasks Card */}
        {myStatus && !myStatus.isOnboarded && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '24px',
            boxShadow: '0 2px 16px rgba(37,99,235,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📋</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>השלם את הפרופיל שלך</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>מלא את הפרטים כדי להשתמש בכל הפיצ׳רים</p>
              </div>
              <a href="/onboarding" style={{
                marginRight: 'auto', padding: '10px 20px', borderRadius: '10px',
                background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '14px',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>מלא פרטים ←</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '👤', text: 'תעודת זהות ומספר טלפון', done: !!myStatus.steps?.personal },
                { icon: '🏠', text: 'כתובת הדירה (עיר, רחוב, מספר)', done: !!myStatus.steps?.address },
                { icon: '📐', text: 'פרטי הדירה (קומה, גודל, שנת כניסה)', done: !!myStatus.steps?.apartment },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '18px' }}>{step.icon}</span>
                  <span style={{ fontSize: '14px', color: step.done ? '#16a34a' : '#374151', flex: 1, textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                  {step.done
                    ? <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>
                    : <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #d1d5db', display: 'inline-block' }} />
                  }
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Project Status Card */}
        {project ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {project.type?.replace('_', ' ')}
                </span>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>חתימות שנאספו</span>
                  <span className="font-medium">{signed} / {total} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {STAGES.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                  i < currentStage ? 'bg-green-100 text-green-700' :
                  i === currentStage ? 'bg-blue-600 text-white font-medium' :
                  'bg-gray-100 text-gray-400'
                }`}>{s}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
            <div className="text-4xl mb-2">🏗️</div>
            <p>טרם שויכת לפרויקט. פנה למארגן הדיירים.</p>
          </div>
        )}

        {/* Leadership */}
        {leadership && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">מי מוביל</h3>
            <div className="space-y-3">
              {[
                { label: 'מארגן דיירים', name: leadership.manager?.full_name, phone: leadership.manager?.phone, icon: '🏢' },
              ].filter(p => p.name).map((p) => (
                <div key={p.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">{p.label}</p>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.phone && <p className="text-xs text-blue-600">{p.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {docs && docs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">מסמכים לחתימה</h3>
            <div className="space-y-3">
              {docs.map((doc: any) => {
                const isSigned = doc.signatures?.length > 0
                return (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isSigned ? 'border-green-200 bg-green-50' :
                    doc.type === 'SIGN_REQUIRED' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      {doc.due_date && <p className="text-xs text-gray-500">עד {doc.due_date}</p>}
                    </div>
                    {isSigned ? (
                      <span className="text-green-600 text-sm font-medium">✅ חתום</span>
                    ) : doc.type === 'SIGN_REQUIRED' ? (
                      <button
                        onClick={() => signDoc.mutate({ docId: doc.id })}
                        disabled={signDoc.isPending}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        חתום עכשיו
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
