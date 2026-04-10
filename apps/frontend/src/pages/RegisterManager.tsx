import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { getDeviceInfo } from '../lib/deviceInfo'

type FormData = {
  // Auth
  email: string
  password: string
  confirmPassword: string
  // Personal
  fullName: string
  idNumber: string
  phone: string
  // Professional
  roleType: string
  companyName: string
  companyRegistration: string
  licenseNumber: string
  city: string
  experienceYears: string
  projectsCount: string
}

const ROLE_TYPES = [
  { value: 'developer', label: '🏗️ יזם נדל"ן' },
  { value: 'lawyer', label: '⚖️ עורך דין' },
  { value: 'project_manager', label: '📋 מארגן דיירים' },
  { value: 'committee', label: '🏘️ ועד דיירים' },
]

const CITIES = [
  'תל אביב-יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'הרצליה', 'רמת גן',
  'גבעתיים', 'חולון', 'בת ים', 'רחובות', 'אחר',
]

export default function RegisterManager() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const registerManager = trpc.auth.registerManager.useMutation({
    onSuccess: (data) => {
      if (data.accessToken) { localStorage.setItem('sb-token', data.accessToken); if ('refreshToken' in data && data.refreshToken) localStorage.setItem('sb-refresh-token', data.refreshToken as string) }
      navigate('/manager')
    },
    onError: (err) => setError(err.message || 'שגיאה בהרשמה'),
  })
  const loading = registerManager.isPending
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    email: '', password: '', confirmPassword: '',
    fullName: '', idNumber: '', phone: '',
    roleType: '', companyName: '', companyRegistration: '',
    licenseNumber: '', city: '', experienceYears: '', projectsCount: '',
  })

  const update = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const validateStep1 = () => {
    if (!form.fullName.trim()) return 'שם מלא נדרש'
    if (!/^\d{9}$/.test(form.idNumber)) return 'תעודת זהות חייבת להכיל 9 ספרות'
    if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) return 'מספר טלפון לא תקין'
    if (!form.email.includes('@')) return 'אימייל לא תקין'
    if (form.password.length < 8) return 'סיסמה חייבת להכיל לפחות 8 תווים'
    if (form.password !== form.confirmPassword) return 'הסיסמאות אינן תואמות'
    return null
  }

  const validateStep2 = () => {
    if (!form.roleType) return 'יש לבחור סוג תפקיד'
    if (!form.city) return 'יש לבחור עיר פעילות'
    return null
  }

  const handleNext = () => {
    setError('')
    const err = step === 1 ? validateStep1() : validateStep2()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  const handleSubmit = () => {
    setError('')
    registerManager.mutate({
      email: form.email, password: form.password,
      fullName: form.fullName, phone: form.phone, idNumber: form.idNumber,
      company: form.companyName,
      licenseNumber: form.licenseNumber || undefined,
      yearsExperience: form.experienceYears ? parseInt(form.experienceYears) : undefined,
      deviceInfo: getDeviceInfo(),
    })
  }

  const stepTitles = ['פרטים אישיים', 'פרטים מקצועיים', 'אישור']

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/register" className="inline-flex items-center gap-1 text-sm text-[#5a5a6e] hover:text-[#212121] mb-4">
            ← חזרה לבחירת תפקיד
          </Link>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1e3a5f] rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">🏢</span>
          </div>
          <h1 className="text-xl font-bold text-[#212121]">הרשמה כמארגן דיירים</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                step === i + 1
                  ? 'bg-[#3b6b9c] text-white'
                  : step > i + 1
                  ? 'bg-[#4a8c5c]/15 text-[#4a8c5c]'
                  : 'bg-sc-border text-[#5a5a6e]'
              }`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <span>{title}</span>
              </div>
              {i < stepTitles.length - 1 && <div className={`w-6 h-px ${step > i + 1 ? 'bg-[#4a8c5c]' : 'bg-sc-border'}`} />}
            </div>
          ))}
        </div>

        <div className="sc-card p-8">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#212121] mb-4">פרטים אישיים</h2>
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
                <input type="email" placeholder="your@company.com" value={form.email}
                  onChange={e => update('email', e.target.value)} className="sc-input" />
              </Field>
              <Field label="סיסמה *">
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => update('password', e.target.value)} className="sc-input" />
              </Field>
              <Field label="אישור סיסמה *">
                <input type="password" placeholder="••••••••" value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} className="sc-input" />
              </Field>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#212121] mb-4">פרטים מקצועיים</h2>

              <Field label="תפקיד *">
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => update('roleType', rt.value)}
                      className={`p-3 rounded-xl border-2 text-right text-sm font-medium transition-colors ${
                        form.roleType === rt.value
                          ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#1e3a5f]'
                          : 'border-[#eeeeee] text-[#5a5a6e] hover:border-[#3b6b9c]-light'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="שם חברה / משרד">
                <input type="text" placeholder="חברת ABC בניה בע״מ" value={form.companyName}
                  onChange={e => update('companyName', e.target.value)} className="sc-input" />
              </Field>

              <Field label="מספר ח.פ / ע.מ">
                <input type="text" placeholder="000000000" maxLength={9} value={form.companyRegistration}
                  onChange={e => update('companyRegistration', e.target.value.replace(/\D/g, ''))} className="sc-input" />
              </Field>

              <Field label="מספר רישיון מקצועי">
                <input type="text" placeholder="123456" value={form.licenseNumber}
                  onChange={e => update('licenseNumber', e.target.value)} className="sc-input" />
              </Field>

              <Field label="עיר פעילות ראשית *">
                <select value={form.city} onChange={e => update('city', e.target.value)} className="sc-input">
                  <option value="">בחר עיר...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="שנות ניסיון">
                  <input type="number" placeholder="5" min="0" max="50" value={form.experienceYears}
                    onChange={e => update('experienceYears', e.target.value)} className="sc-input" />
                </Field>
                <Field label="פרויקטים שניהלת">
                  <select value={form.projectsCount} onChange={e => update('projectsCount', e.target.value)} className="sc-input">
                    <option value="">בחר...</option>
                    <option value="0">עדיין לא</option>
                    <option value="1-5">1–5</option>
                    <option value="6-20">6–20</option>
                    <option value="20+">20+</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#212121] mb-4">סיכום ואישור</h2>
              <div className="bg-[#f8f9fa] rounded-xl p-4 space-y-2 text-sm">
                <SummaryRow label="שם" value={form.fullName} />
                <SummaryRow label="אימייל" value={form.email} />
                <SummaryRow label="טלפון" value={form.phone} />
                <SummaryRow label="תפקיד" value={ROLE_TYPES.find(r => r.value === form.roleType)?.label || ''} />
                {form.companyName && <SummaryRow label="חברה" value={form.companyName} />}
                <SummaryRow label="עיר" value={form.city} />
                {form.experienceYears && <SummaryRow label="ניסיון" value={`${form.experienceYears} שנים`} />}
              </div>
              <p className="text-xs text-[#5a5a6e] text-center">
                בלחיצה על "הרשמה" אתה מאשר את תנאי השימוש
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-sc-error/30 text-red-500 text-sm px-4 py-3 rounded-xl mt-4">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#212121] mb-1">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#5a5a6e]">{label}:</span>
      <span className="font-medium text-[#212121]">{value}</span>
    </div>
  )
}
