import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message === 'User already registered'
        ? 'אימייל זה כבר רשום במערכת'
        : 'שגיאה ביצירת החשבון')
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // 2. Update profiles table with role + personal info
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: form.fullName,
      email: form.email,
      phone: form.phone,
      id_number: form.idNumber,
      role: 'tenant',
    })

    if (profileError) {
      setError('שגיאה בשמירת הפרופיל')
      setLoading(false)
      return
    }

    // 3. Insert tenant profile
    const { error: tenantError } = await supabase.from('tenant_profiles').upsert({
      user_id: userId,
      unit_id: null, // will be linked later when manager assigns unit
      phone: form.phone,
      id_number: form.idNumber,
      address: `${form.street} ${form.buildingNumber}, ${form.city}`,
      building_number: form.buildingNumber,
      floor: form.floor ? parseInt(form.floor) : null,
      apartment_sqm: form.apartmentSqm ? parseFloat(form.apartmentSqm) : null,
      is_owner: form.isOwner,
      move_in_year: form.moveInYear ? parseInt(form.moveInYear) : null,
      invite_code: form.inviteCode || null,
      is_onboarded: true,
    })

    if (tenantError) {
      console.error('tenant profile error:', tenantError)
    }

    setLoading(false)
    navigate('/dashboard')
  }

  const stepTitles = ['פרטים אישיים', 'פרטי הדירה', 'אישור']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/register" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            ← חזרה לבחירת תפקיד
          </Link>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">🏠</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">הרשמה כדייר</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                step === i + 1
                  ? 'bg-blue-600 text-white'
                  : step > i + 1
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <span>{title}</span>
              </div>
              {i < stepTitles.length - 1 && (
                <div className={`w-6 h-px ${step > i + 1 ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטים אישיים</h2>

              <Field label="שם מלא *">
                <input type="text" placeholder="ישראל ישראלי" value={form.fullName}
                  onChange={e => update('fullName', e.target.value)} className={inputCls} />
              </Field>

              <Field label="תעודת זהות *">
                <input type="text" placeholder="000000000" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g, ''))} className={inputCls} />
              </Field>

              <Field label="טלפון נייד *">
                <input type="tel" placeholder="050-0000000" value={form.phone}
                  onChange={e => update('phone', e.target.value)} className={inputCls} />
              </Field>

              <Field label="אימייל *">
                <input type="email" placeholder="your@email.com" value={form.email}
                  onChange={e => update('email', e.target.value)} className={inputCls} />
              </Field>

              <Field label="סיסמה * (לפחות 8 תווים)">
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => update('password', e.target.value)} className={inputCls} />
              </Field>

              <Field label="אישור סיסמה *">
                <input type="password" placeholder="••••••••" value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}

          {/* Step 2: Apartment Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטי הדירה</h2>

              <Field label="עיר *">
                <input type="text" placeholder="תל אביב" value={form.city}
                  onChange={e => update('city', e.target.value)} className={inputCls} />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="רחוב *">
                  <input type="text" placeholder="הרצל" value={form.street}
                    onChange={e => update('street', e.target.value)} className={inputCls} />
                </Field>
                <Field label="מס' בניין *">
                  <input type="text" placeholder="12" value={form.buildingNumber}
                    onChange={e => update('buildingNumber', e.target.value)} className={inputCls} />
                </Field>
                <Field label="מס' דירה *">
                  <input type="text" placeholder="5" value={form.apartmentNumber}
                    onChange={e => update('apartmentNumber', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="קומה">
                  <input type="number" placeholder="3" min="0" max="50" value={form.floor}
                    onChange={e => update('floor', e.target.value)} className={inputCls} />
                </Field>
                <Field label="גודל דירה (מ״ר)">
                  <input type="number" placeholder="75" min="20" max="500" value={form.apartmentSqm}
                    onChange={e => update('apartmentSqm', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="סוג מחזיק">
                <div className="flex gap-4 mt-1">
                  {[{ value: true, label: '🔑 בעלים' }, { value: false, label: '🏠 שוכר' }].map(opt => (
                    <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.isOwner === opt.value}
                        onChange={() => update('isOwner', opt.value)}
                        className="text-blue-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="שנת כניסה לדירה">
                <select value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)} className={inputCls}>
                  <option value="">בחר שנה</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              <Field label="קוד הזמנה מפרויקט (אם קיבלת)">
                <input type="text" placeholder="ABC-1234" value={form.inviteCode}
                  onChange={e => update('inviteCode', e.target.value.toUpperCase())} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">לא חובה — ניתן לחבר לפרויקט מאוחר יותר</p>
              </Field>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">סיכום ואישור</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <SummaryRow label="שם" value={form.fullName} />
                <SummaryRow label="ת.ז" value={form.idNumber} />
                <SummaryRow label="טלפון" value={form.phone} />
                <SummaryRow label="אימייל" value={form.email} />
                <SummaryRow label="כתובת" value={`${form.street} ${form.buildingNumber} דירה ${form.apartmentNumber}, ${form.city}`} />
                {form.floor && <SummaryRow label="קומה" value={form.floor} />}
                {form.apartmentSqm && <SummaryRow label="שטח" value={`${form.apartmentSqm} מ״ר`} />}
                <SummaryRow label="סוג מחזיק" value={form.isOwner ? 'בעלים' : 'שוכר'} />
                {form.inviteCode && <SummaryRow label="קוד הזמנה" value={form.inviteCode} />}
              </div>
              <p className="text-xs text-gray-500 text-center">
                בלחיצה על "הרשמה" אתה מאשר את תנאי השימוש ומדיניות הפרטיות
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ← הקודם
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                הבא ←
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
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
const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
