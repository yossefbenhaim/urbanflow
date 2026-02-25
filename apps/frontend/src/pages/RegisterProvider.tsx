import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'

type PastProject = { name: string; city: string; year: string; role: string }

type FormData = {
  // Auth
  email: string
  password: string
  confirmPassword: string
  // Personal
  fullName: string
  idNumber: string
  phone: string
  // Company (optional)
  companyName: string
  companyRegistration: string
  companyAddress: string
  // Profession
  professionTypes: string[]
  licenseNumber: string
  licenseAuthority: string
  licenseExpiry: string
  experienceYears: string
  pinuyBinuyExperience: boolean
  // Areas
  operatingRegions: string[]
  // Portfolio
  bio: string
  portfolioUrl: string
  pastProjects: PastProject[]
}

const PROFESSION_TYPES = [
  { value: 'architect', label: '🏛️ אדריכל' },
  { value: 'structural_engineer', label: '🔩 מהנדס קונסטרוקציה' },
  { value: 'general_contractor', label: '🏗️ קבלן ראשי' },
  { value: 'sub_contractor', label: '🔨 קבלן משנה' },
  { value: 'real_estate_lawyer', label: '⚖️ עו"ד מקרקעין' },
  { value: 'appraiser', label: '📊 שמאי מקרקעין' },
  { value: 'notary', label: '📜 נוטריון' },
  { value: 'project_management', label: '📋 ניהול פרויקטים' },
  { value: 'financial_advisor', label: '💰 יועץ פיננסי' },
  { value: 'moving_company', label: '🚚 חברת הובלה' },
  { value: 'other', label: '➕ אחר' },
]

const LICENSE_AUTHORITIES = [
  'לשכת האדריכלים והמהנדסים',
  'רשם הקבלנים',
  'לשכת עורכי הדין',
  'מועצת שמאי המקרקעין',
  'לשכת הנוטריונים',
  'אחר',
]

const REGIONS = [
  'תל אביב', 'גוש דן', 'ירושלים', 'חיפה והקריות',
  'נצרת והצפון', 'באר שבע והדרום', 'ראשל"צ ומרכז',
  'פתח תקווה והשרון', 'אשדוד ואשקלון',
]

export default function RegisterProvider() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const registerProvider = trpc.auth.registerProvider.useMutation({
    onSuccess: (data) => {
      if (data.accessToken) localStorage.setItem('sb-token', data.accessToken)
      navigate('/provider')
    },
    onError: (err) => setError(err.message || 'שגיאה בהרשמה'),
  })
  const loading = registerProvider.isPending
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    email: '', password: '', confirmPassword: '',
    fullName: '', idNumber: '', phone: '',
    companyName: '', companyRegistration: '', companyAddress: '',
    professionTypes: [], licenseNumber: '', licenseAuthority: '',
    licenseExpiry: '', experienceYears: '', pinuyBinuyExperience: false,
    operatingRegions: [],
    bio: '', portfolioUrl: '',
    pastProjects: [{ name: '', city: '', year: '', role: '' }],
  })

  const update = (field: keyof FormData, value: string | boolean | string[] | PastProject[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleProfession = (val: string) => {
    update('professionTypes',
      form.professionTypes.includes(val)
        ? form.professionTypes.filter(p => p !== val)
        : [...form.professionTypes, val]
    )
  }

  const toggleRegion = (val: string) => {
    update('operatingRegions',
      form.operatingRegions.includes(val)
        ? form.operatingRegions.filter(r => r !== val)
        : [...form.operatingRegions, val]
    )
  }

  const updateProject = (i: number, field: keyof PastProject, value: string) => {
    const updated = [...form.pastProjects]
    updated[i] = { ...updated[i], [field]: value }
    update('pastProjects', updated)
  }

  const validates: (() => string | null)[] = [
    () => {
      if (!form.fullName.trim()) return 'שם מלא נדרש'
      if (!/^\d{9}$/.test(form.idNumber)) return 'תעודת זהות חייבת להכיל 9 ספרות'
      if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) return 'מספר טלפון לא תקין'
      if (!form.email.includes('@')) return 'אימייל לא תקין'
      if (form.password.length < 8) return 'סיסמה חייבת להכיל לפחות 8 תווים'
      if (form.password !== form.confirmPassword) return 'הסיסמאות אינן תואמות'
      return null
    },
    () => {
      if (form.professionTypes.length === 0) return 'יש לבחור לפחות תחום מקצועי אחד'
      if (form.operatingRegions.length === 0) return 'יש לבחור לפחות אזור פעילות אחד'
      return null
    },
    () => null,
  ]

  const handleNext = () => {
    setError('')
    const err = validates[step - 1]()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  const handleSubmit = () => {
    setError('')
    registerProvider.mutate({
      email: form.email, password: form.password,
      fullName: form.fullName, phone: form.phone, idNumber: form.idNumber,
      company: form.companyName || undefined,
      serviceTypes: form.professionTypes,
      operatingRegions: form.operatingRegions,
      bio: form.bio || undefined,
      licenseNumber: form.licenseNumber || undefined,
      website: form.portfolioUrl || undefined,
      yearsExperience: form.experienceYears ? parseInt(form.experienceYears) : undefined,
    })
  }

  const stepTitles = ['פרטים אישיים', 'מקצועי ואזורים', 'פורטפוליו']

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/register" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            ← חזרה לבחירת תפקיד
          </Link>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">🔧</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">הרשמה כנותן שירות</h1>
          <p className="text-gray-500 text-sm mt-1">בנה פרופיל מקצועי ומצא פרויקטים</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === i + 1 ? 'bg-green-600 text-white'
                  : step > i + 1 ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <span>{title}</span>
              </div>
              {i < stepTitles.length - 1 && <div className="w-6 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטים אישיים</h2>
              <Field label="שם מלא *">
                <input type="text" placeholder="ישראל ישראלי" value={form.fullName}
                  onChange={e => update('fullName', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="תעודת זהות *">
                  <input type="text" maxLength={9} placeholder="000000000" value={form.idNumber}
                    onChange={e => update('idNumber', e.target.value.replace(/\D/g, ''))} className={inputCls} />
                </Field>
                <Field label="טלפון *">
                  <input type="tel" placeholder="050-0000000" value={form.phone}
                    onChange={e => update('phone', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="אימייל *">
                <input type="email" placeholder="your@company.com" value={form.email}
                  onChange={e => update('email', e.target.value)} className={inputCls} />
              </Field>
              <Field label="סיסמה *">
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => update('password', e.target.value)} className={inputCls} />
              </Field>
              <Field label="אישור סיסמה *">
                <input type="password" placeholder="••••••••" value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} className={inputCls} />
              </Field>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">פרטי חברה (אופציונלי)</p>
                <Field label="שם חברה">
                  <input type="text" placeholder="חברת ABC בע״מ" value={form.companyName}
                    onChange={e => update('companyName', e.target.value)} className={inputCls} />
                </Field>
                <div className="mt-3">
                  <Field label="מספר ח.פ">
                    <input type="text" placeholder="000000000" maxLength={9} value={form.companyRegistration}
                      onChange={e => update('companyRegistration', e.target.value.replace(/\D/g, ''))} className={inputCls} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">מקצועי ואזורי פעילות</h2>

              <Field label="תחומי מקצוע * (ניתן לבחור מספר)">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {PROFESSION_TYPES.map(p => (
                    <button key={p.value} type="button" onClick={() => toggleProfession(p.value)}
                      className={`p-2.5 rounded-xl border-2 text-right text-sm transition-colors ${
                        form.professionTypes.includes(p.value)
                          ? 'border-green-500 bg-green-50 text-green-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="מספר רישיון">
                  <input type="text" placeholder="123456" value={form.licenseNumber}
                    onChange={e => update('licenseNumber', e.target.value)} className={inputCls} />
                </Field>
                <Field label="שנות ניסיון">
                  <input type="number" placeholder="10" min="0" max="60" value={form.experienceYears}
                    onChange={e => update('experienceYears', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="גוף מנפיק רישיון">
                <select value={form.licenseAuthority} onChange={e => update('licenseAuthority', e.target.value)} className={inputCls}>
                  <option value="">בחר גוף מנפיק...</option>
                  {LICENSE_AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="תוקף רישיון">
                <input type="date" value={form.licenseExpiry}
                  onChange={e => update('licenseExpiry', e.target.value)} className={inputCls} />
              </Field>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <input type="checkbox" id="pinuychk" checked={form.pinuyBinuyExperience}
                  onChange={e => update('pinuyBinuyExperience', e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded" />
                <label htmlFor="pinuychk" className="text-sm font-medium text-green-800 cursor-pointer">
                  ✅ יש לי ניסיון ספציפי בפינוי-בינוי / תמ"א 38
                </label>
              </div>

              <Field label="אזורי פעילות * (ניתן לבחור מספר)">
                <div className="flex flex-wrap gap-2 mt-1">
                  {REGIONS.map(r => (
                    <button key={r} type="button" onClick={() => toggleRegion(r)}
                      className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors ${
                        form.operatingRegions.includes(r)
                          ? 'border-green-500 bg-green-50 text-green-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">פורטפוליו ותיק עבודות</h2>

              <Field label="תיאור מקצועי (Bio)">
                <textarea
                  placeholder="ספר על עצמך — ניסיון, התמחות, ערך מוסף..."
                  value={form.bio}
                  onChange={e => update('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-gray-400 mt-1 text-left">{form.bio.length}/500</p>
              </Field>

              <Field label="קישור לתיק עבודות / אתר">
                <input type="url" placeholder="https://my-portfolio.com" value={form.portfolioUrl}
                  onChange={e => update('portfolioUrl', e.target.value)} className={inputCls} />
              </Field>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  פרויקטים קודמים (עד 3)
                </label>
                {form.pastProjects.slice(0, 3).map((project, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">פרויקט {i + 1}</p>
                    <div className="space-y-2">
                      <input type="text" placeholder="שם הפרויקט" value={project.name}
                        onChange={e => updateProject(i, 'name', e.target.value)}
                        className={`${inputCls} py-2`} />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" placeholder="עיר" value={project.city}
                          onChange={e => updateProject(i, 'city', e.target.value)}
                          className={`${inputCls} py-2`} />
                        <input type="number" placeholder="שנה" min="1990" max="2026" value={project.year}
                          onChange={e => updateProject(i, 'year', e.target.value)}
                          className={`${inputCls} py-2`} />
                        <input type="text" placeholder="תפקיד" value={project.role}
                          onChange={e => updateProject(i, 'role', e.target.value)}
                          className={`${inputCls} py-2`} />
                      </div>
                    </div>
                  </div>
                ))}
                {form.pastProjects.length < 3 && (
                  <button type="button"
                    onClick={() => update('pastProjects', [...form.pastProjects, { name: '', city: '', year: '', role: '' }])}
                    className="text-sm text-green-600 hover:underline">
                    + הוסף פרויקט נוסף
                  </button>
                )}
              </div>

              {/* Summary badges */}
              <div className="bg-green-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-green-800 mb-2">סיכום הפרופיל שלך:</p>
                <div className="flex flex-wrap gap-1">
                  {form.professionTypes.map(p => (
                    <span key={p} className="bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full text-xs">
                      {PROFESSION_TYPES.find(pt => pt.value === p)?.label}
                    </span>
                  ))}
                </div>
                <p className="text-green-700 mt-1 text-xs">{form.operatingRegions.join(' • ')}</p>
              </div>
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
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                ← הקודם
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors">
                הבא ←
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? 'שומר פרופיל...' : '🚀 הרשמה וצור פרופיל'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-sm'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
