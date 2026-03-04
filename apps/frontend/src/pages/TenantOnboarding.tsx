import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import Navbar from '../components/Navbar'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

type FormData = {
  idNumber: string
  phone: string
  city: string
  street: string
  buildingNumber: string
  floor: string
  apartmentNumber: string
  apartmentSqm: string
  isOwner: boolean
  moveInYear: string
}

const STEPS = [
  { id: 1, title: 'פרטים אישיים', icon: '👤' },
  { id: 2, title: 'כתובת הדירה', icon: '🏠' },
  { id: 3, title: 'פרטי הדירה', icon: '📋' },
]

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '32px' }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              background: current > s.id ? '#22c55e' : current === s.id ? '#2563EB' : '#e2e8f0',
              color: current >= s.id ? '#fff' : '#94a3b8',
              fontWeight: 700, transition: 'all 0.3s',
              boxShadow: current === s.id ? '0 0 0 4px #bfdbfe' : 'none',
            }}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span style={{ fontSize: '11px', color: current === s.id ? '#2563EB' : '#64748b', fontWeight: current === s.id ? 600 : 400, whiteSpace: 'nowrap' }}>
              {s.title}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: '60px', height: '2px', background: current > s.id + 1 ? '#22c55e' : current > s.id ? '#2563EB' : '#e2e8f0', margin: '0 4px 20px', transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function TenantOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [address, setAddress] = useState({ city: '', street: '', buildingNumber: '' })
  const [form, setForm] = useState<FormData>({
    idNumber: '', phone: '',
    city: '', street: '', buildingNumber: '',
    floor: '', apartmentNumber: '', apartmentSqm: '',
    isOwner: true, moveInYear: '',
  })

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }))

  const saveProfile = trpc.tenant.saveProfile.useMutation({
    onSuccess: () => navigate('/dashboard'),
    onError: (e) => setError(e.message || 'שגיאה בשמירה'),
  })

  const validateStep1 = () => {
    if (!/^\d{9}$/.test(form.idNumber)) return 'תעודת זהות חייבת להכיל 9 ספרות'
    if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) return 'מספר טלפון לא תקין (05XXXXXXXX)'
    return null
  }
  const validateStep2 = () => {
    if (!address.city) return 'יש לבחור עיר מהרשימה'
    if (!address.street) return 'יש לבחור רחוב מהרשימה'
    if (!address.buildingNumber) return 'יש להזין מספר בניין'
    return null
  }
  const validateStep3 = () => {
    if (!form.floor) return 'קומה נדרשת'
    if (!form.apartmentNumber) return 'מספר דירה נדרש'
    if (!form.apartmentSqm) return 'גודל דירה נדרש'
    return null
  }

  const handleNext = () => {
    setError('')
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : validateStep3()
    if (err) { setError(err); return }
    if (step < 3) { setStep(s => s + 1); return }

    saveProfile.mutate({
      idNumber: form.idNumber,
      phone: form.phone,
      city: address.city,
      street: address.street,
      buildingNumber: address.buildingNumber,
      floor: parseInt(form.floor),
      apartmentNumber: form.apartmentNumber,
      apartmentSqm: parseFloat(form.apartmentSqm),
      isOwner: form.isOwner,
      moveInYear: form.moveInYear ? parseInt(form.moveInYear) : undefined,
    })
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const, color: '#1e293b',
  }
  const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' } as const

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }} dir="rtl">
      <Navbar />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>השלמת פרופיל דייר</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>מלא את הפרטים הנדרשים כדי להשתמש בכל הפיצ׳רים</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <StepBar current={step} />

          {/* Step 1 - Personal */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>👤 פרטים אישיים</h2>
              <div>
                <label style={labelStyle}>תעודת זהות *</label>
                <input style={inputStyle} placeholder="9 ספרות" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} />
              </div>
              <div>
                <label style={labelStyle}>טלפון נייד *</label>
                <input style={inputStyle} placeholder="05XXXXXXXX" value={form.phone} dir="ltr"
                  onChange={e => update('phone', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2 - Address */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>🏠 כתובת הדירה</h2>
              <AddressPicker value={address} onChange={setAddress} />
            </div>
          )}

          {/* Step 3 - Apartment details */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>📋 פרטי הדירה</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>קומה *</label>
                  <input style={inputStyle} placeholder="0 = קרקע" type="number" min="0" value={form.floor}
                    onChange={e => update('floor', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>מספר דירה *</label>
                  <input style={inputStyle} placeholder="דירה" value={form.apartmentNumber}
                    onChange={e => update('apartmentNumber', e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>גודל הדירה (מ"ר) *</label>
                <input style={inputStyle} placeholder="לדוג׳ 85" type="number" min="10" value={form.apartmentSqm}
                  onChange={e => update('apartmentSqm', e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>שנת כניסה לדירה</label>
                <select style={inputStyle} value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                  <option value="">בחר שנה</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {['owner','renter'].map(type => (
                  <button key={type} onClick={() => update('isOwner', type === 'owner')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid',
                      borderColor: (form.isOwner ? 'owner' : 'renter') === type ? '#2563EB' : '#e2e8f0',
                      background: (form.isOwner ? 'owner' : 'renter') === type ? '#eff6ff' : '#fff',
                      color: (form.isOwner ? 'owner' : 'renter') === type ? '#2563EB' : '#64748b',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                    }}>
                    {type === 'owner' ? '🏠 בעל דירה' : '🔑 שוכר'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
                ← חזרה
              </button>
            )}
            <button onClick={handleNext} disabled={saveProfile.isPending}
              style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px', opacity: saveProfile.isPending ? 0.7 : 1 }}>
              {saveProfile.isPending ? 'שומר...' : step === 3 ? '✓ סיום' : 'המשך ←'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          ניתן לעדכן פרטים אלו בכל עת מהפרופיל שלך
        </p>
      </div>
    </div>
  )
}
