import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { getDeviceInfo } from '../lib/deviceInfo'
import AddressPicker from '../components/AddressPicker/AddressPicker'

type FormData = {
  // Auth
  email: string
  password: string
  confirmPassword: string
  // Personal
  fullName: string
  idNumber: string
  phone: string
  // Apartment
  city: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  floor: string
  apartmentSqm: string
  isOwner: boolean
  moveInYear: string
  inviteCode: string
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

export default function RegisterTenant() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  const [address, setAddress] = useState({ city: '', street: '', buildingNumber: '' })
  const [form, setForm] = useState<FormData>({
    email: '', password: '', confirmPassword: '',
    fullName: '', idNumber: '', phone: '',
    city: '', street: '', buildingNumber: '',
    apartmentNumber: '', floor: '', apartmentSqm: '',
    isOwner: true, moveInYear: '', inviteCode: '',
  })

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const validateStep1 = () => {
    if (!form.fullName.trim()) return 'שם מלא נדרש'
    if (!/^\d{9}$/.test(form.idNumber)) return 'תעודת זהות חייבת להכיל 9 ספרות'
    if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) return 'מספר טלפון לא תקין (05XXXXXXXX)'
    if (!form.email.includes('@')) return 'אימייל לא תקין'
    if (form.password.length < 8) return 'סיסמה חייבת להכיל לפחות 8 תווים'
    if (form.password !== form.confirmPassword) return 'הסיסמאות אינן תואמות'
    return null
  }

  const validateStep2 = () => {
    if (!form.city.trim()) return 'עיר נדרשת'
    if (!form.street.trim()) return 'רחוב נדרש'
    if (!form.buildingNumber.trim()) return 'מספר בניין נדרש'
    if (!form.apartmentNumber.trim()) return 'מספר דירה נדרש'
    return null
  }

  const handleNext = () => {
    setError('')
    const err = step === 1 ? validateStep1() : validateStep2()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  const registerTenant = trpc.auth.registerTenant.useMutation({
    onSuccess: (data) => {
      if (data.accessToken) { localStorage.setItem('sb-token', data.accessToken); if ((data as any).refreshToken) localStorage.setItem('sb-refresh-token', (data as any).refreshToken) }
      navigate('/dashboard')
    },
    onError: (err) => setError(err.message || 'שגיאה בהרשמה'),
  })
  const loading = registerTenant.isPending

  const handleSubmit = () => {
    setError('')
    registerTenant.mutate({
      email: form.email, password: form.password,
      fullName: form.fullName, phone: form.phone, idNumber: form.idNumber,
      city: address.city, street: address.street, buildingNumber: address.buildingNumber,
      floor: form.floor, apartmentSqm: form.apartmentSqm,
      isOwner: form.isOwner,
      moveInYear: form.moveInYear || undefined,
      inviteCode: form.inviteCode || undefined,
      deviceInfo: getDeviceInfo(),
    })
  }

  const stepTitles = ['פרטים אישיים', 'פרטי הדירה', 'אישור']

  return (
    <div className="min-h-screen bg-sc-bg flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/register" className="inline-flex items-center gap-1 text-sm text-sc-text-light hover:text-sc-text mb-4">
            ← חזרה לבחירת תפקיד
          </Link>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sc-primary rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">🏠</span>
          </div>
          <h1 className="text-xl font-bold text-sc-text">הרשמה כדייר</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                step === i + 1
                  ? 'bg-sc-primary text-white'
                  : step > i + 1
                  ? 'bg-sc-success/15 text-sc-success'
                  : 'bg-sc-border text-sc-text-light'
              }`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <span>{title}</span>
              </div>
              {i < stepTitles.length - 1 && (
                <div className={`w-6 h-px ${step > i + 1 ? 'bg-sc-success' : 'bg-sc-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="sc-card p-8">

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-sc-text mb-4">פרטים אישיים</h2>

              <Field label="שם מלא *">
                <input type="text" placeholder="ישראל ישראלי" value={form.fullName}
                  onChange={e => update('fullName', e.target.value)} className="sc-input" />
              </Field>

              <Field label="תעודת זהות *">
                <input type="text" placeholder="000000000" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g, ''))} className="sc-input" />
              </Field>

              <Field label="טלפון נייד *">
                <input type="tel" placeholder="050-0000000" value={form.phone}
                  onChange={e => update('phone', e.target.value)} className="sc-input" />
              </Field>

              <Field label="אימייל *">
                <input type="email" placeholder="your@email.com" value={form.email}
                  onChange={e => update('email', e.target.value)} className="sc-input" />
              </Field>

              <Field label="סיסמה * (לפחות 8 תווים)">
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => update('password', e.target.value)} className="sc-input" />
              </Field>

              <Field label="אישור סיסמה *">
                <input type="password" placeholder="••••••••" value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} className="sc-input" />
              </Field>
            </div>
          )}

          {/* Step 2: Apartment Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-sc-text mb-4">פרטי הדירה</h2>

              <div>
                <label className="block text-sm font-semibold text-sc-text mb-2">כתובת הדירה *</label>
                <AddressPicker
                  value={address}
                  onChange={(v) => {
                    setAddress(v)
                    update('city', v.city)
                    update('street', v.street)
                    update('buildingNumber', v.buildingNumber)
                  }}
                />
              </div>

              <Field label="מס' דירה *">
                <input type="text" placeholder="5" value={form.apartmentNumber}
                  onChange={e => update('apartmentNumber', e.target.value)} className="sc-input" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="קומה">
                  <input type="number" placeholder="3" min="0" max="50" value={form.floor}
                    onChange={e => update('floor', e.target.value)} className="sc-input" />
                </Field>
                <Field label="גודל דירה (מ״ר)">
                  <input type="number" placeholder="75" min="20" max="500" value={form.apartmentSqm}
                    onChange={e => update('apartmentSqm', e.target.value)} className="sc-input" />
                </Field>
              </div>

              <Field label="סוג מחזיק">
                <div className="flex gap-4 mt-1">
                  {[{ value: true, label: '🔑 בעלים' }, { value: false, label: '🏠 שוכר' }].map(opt => (
                    <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.isOwner === opt.value}
                        onChange={() => update('isOwner', opt.value)}
                        className="text-sc-primary" />
                      <span className="text-sm text-sc-text">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="שנת כניסה לדירה">
                <select value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)} className="sc-input">
                  <option value="">בחר שנה</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              <Field label="קוד הזמנה מפרויקט (אם קיבלת)">
                <input type="text" placeholder="ABC-1234" value={form.inviteCode}
                  onChange={e => update('inviteCode', e.target.value.toUpperCase())} className="sc-input" />
                <p className="text-xs text-sc-text-light mt-1">לא חובה — ניתן לחבר לפרויקט מאוחר יותר</p>
              </Field>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-sc-text mb-4">סיכום ואישור</h2>
              <div className="bg-sc-bg rounded-xl p-4 space-y-2 text-sm">
                <SummaryRow label="שם" value={form.fullName} />
                <SummaryRow label="ת.ז" value={form.idNumber} />
                <SummaryRow label="טלפון" value={form.phone} />
                <SummaryRow label="אימייל" value={form.email} />
                <SummaryRow label="כתובת" value={`${address.street} ${address.buildingNumber} דירה ${form.apartmentNumber}, ${address.city}`} />
                {form.floor && <SummaryRow label="קומה" value={form.floor} />}
                {form.apartmentSqm && <SummaryRow label="שטח" value={`${form.apartmentSqm} מ״ר`} />}
                <SummaryRow label="סוג מחזיק" value={form.isOwner ? 'בעלים' : 'שוכר'} />
                {form.inviteCode && <SummaryRow label="קוד הזמנה" value={form.inviteCode} />}
              </div>
              <p className="text-xs text-sc-text-light text-center">
                בלחיצה על "הרשמה" אתה מאשר את תנאי השימוש ומדיניות הפרטיות
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-sc-error/10 border border-sc-error/30 text-sc-error text-sm px-4 py-3 rounded-xl mt-4">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="sc-btn-secondary flex-1">
                ← הקודם
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="sc-btn-primary flex-1">
                הבא ←
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="sc-btn-primary flex-1 disabled:opacity-50">
                {loading ? 'נרשם...' : '✅ הרשמה'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper components
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-sc-text mb-1">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sc-text-light">{label}:</span>
      <span className="font-medium text-sc-text">{value}</span>
    </div>
  )
}
