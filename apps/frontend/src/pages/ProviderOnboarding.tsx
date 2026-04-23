import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import CityAutocomplete from '../components/CityAutocomplete'

type ProviderType = 'architect' | 'appraiser' | 'developer'

const TYPE_OPTIONS: { value: ProviderType; title: string; icon: string; desc: string }[] = [
  { value: 'architect', title: 'אדריכל', icon: '🏛️', desc: 'תכנון, תב"ע, היתכנות, המלצות תכנוניות' },
  { value: 'appraiser', title: 'שמאי', icon: '📊', desc: 'הערכות שווי, כדאיות כלכלית, בדיקות שטח' },
  { value: 'developer', title: 'יזם', icon: '🏢', desc: 'פתיחת פרויקט, ליווי, תכנון כלכלי, הצעות' },
]

const SPECIALIZATIONS: Record<ProviderType, string[]> = {
  architect: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי', 'שימור', 'מגורים', 'מסחר'],
  appraiser: ['מגורים', 'מסחר', 'תעשייה', 'קרקעות', 'שימוש מעורב'],
  developer: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי'],
}

export default function ProviderOnboarding() {
  const navigate = useNavigate()
  const [type, setType] = useState<ProviderType | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [mainCity, setMainCity] = useState('')
  const [license, setLicense] = useState('')
  const [years, setYears] = useState('')
  const [projects, setProjects] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [portfolioInput, setPortfolioInput] = useState('')
  const [portfolio, setPortfolio] = useState<string[]>([])
  const [ratingUrl, setRatingUrl] = useState('')
  const [c1, setC1] = useState(false)
  const [c2, setC2] = useState(false)
  const [c3, setC3] = useState(false)
  const [error, setError] = useState('')

  const submit = trpc.provider.completeOnboarding.useMutation({
    onSuccess: () => navigate('/provider', { replace: true }),
    onError: (e) => setError(e.message || 'שגיאה'),
  })

  const addPortfolio = () => {
    const v = portfolioInput.trim()
    if (v && !portfolio.includes(v)) setPortfolio([...portfolio, v])
    setPortfolioInput('')
  }

  const toggleSpec = (s: string) => {
    setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }

  const handleSubmit = async () => {
    setError('')
    if (!type) { setError('בחר סוג נותן שירות'); return }
    if (!fullName.trim()) { setError('שם מלא נדרש'); return }
    if (!phone.trim()) { setError('טלפון נדרש'); return }
    if (!mainCity.trim()) { setError('עיר פעילות ראשית נדרשת'); return }
    if (!c1 || !c2 || !c3) { setError('יש לאשר את כל ההצהרות'); return }
    submit.mutate({
      providerType: type,
      fullName: fullName.trim(),
      phone: phone.trim(),
      mainCity: mainCity.trim(),
      licenseNumber: license.trim() || undefined,
      experienceYears: years ? +years : undefined,
      completedProjects: projects ? +projects : undefined,
      specializations: specs,
      portfolioUrls: portfolio,
      ratingUrl: ratingUrl.trim() || undefined,
      acceptTerms: c1,
      acceptDataUse: c2,
      acceptProjectSharing: c3,
    })
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8f9fa] py-8 px-4 font-heebo">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-1">הגדרת פרופיל מקצועי</h1>
          <p className="text-sm text-[#5a5a6e]">בחר את סוג השירות שלך והשלם את הפרופיל כדי להתחיל לקבל פרויקטים מותאמים</p>
        </div>

        {/* Type selector */}
        <div className="mb-6">
          <label className="block text-xs text-[#5a5a6e] mb-2 font-semibold">סוג נותן שירות *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => { setType(o.value); setSpecs([]) }}
                className={`text-right p-4 rounded-2xl border-2 transition-all ${
                  type === o.value ? 'border-[#1e3a5f] bg-[#ebf1f7]' : 'border-[#eeeeee] bg-white hover:border-[#3b6b9c]'
                }`}
              >
                <div className="text-2xl mb-1">{o.icon}</div>
                <div className="font-bold text-[#212121]">{o.title}</div>
                <div className="text-xs text-[#5a5a6e] mt-1">{o.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {type && (
          <>
            {/* Personal info */}
            <div className="sc-card p-4 mb-4 space-y-3">
              <h3 className="font-bold text-[#1e3a5f]">פרטים אישיים</h3>
              <LabeledInput label="שם מלא *" value={fullName} onChange={setFullName} />
              <LabeledInput label="טלפון *" value={phone} onChange={setPhone} placeholder="050-1234567" />
              <CityAutocomplete
                label="עיר פעילות ראשית"
                required
                value={mainCity}
                onChange={setMainCity}
                placeholder="הקלד שם עיר ובחר מהרשימה"
              />
              <LabeledInput label="מספר רישיון מקצועי" value={license} onChange={setLicense} placeholder="אם קיים" />
            </div>

            {/* Experience */}
            <div className="sc-card p-4 mb-4 space-y-3">
              <h3 className="font-bold text-[#1e3a5f]">ניסיון מקצועי</h3>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="שנות ניסיון" value={years} onChange={setYears} type="number" />
                <LabeledInput label="מספר פרויקטים שבוצעו" value={projects} onChange={setProjects} type="number" />
              </div>
              <div>
                <label className="block text-xs text-[#5a5a6e] mb-1">אזורי התמחות / סוגי פרויקטים</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS[type].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSpec(s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors
                        ${specs.includes(s) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="sc-card p-4 mb-4 space-y-3">
              <h3 className="font-bold text-[#1e3a5f]">קישורים</h3>
              <div>
                <label className="block text-xs text-[#5a5a6e] mb-1">תיק עבודות / אתר</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={portfolioInput}
                    onChange={e => setPortfolioInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPortfolio())}
                    placeholder="https://..."
                    className="sc-input flex-1"
                  />
                  <button onClick={addPortfolio} className="px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold">+</button>
                </div>
                {portfolio.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {portfolio.map((u, i) => (
                      <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                        {new URL(u).hostname}
                        <button onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))} className="text-[#3b6b9c]">x</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <LabeledInput label="קישור לאתר דירוג (אופציונלי)" value={ratingUrl} onChange={setRatingUrl} placeholder="https://..." type="url" />
            </div>

            {/* Consents */}
            <div className="sc-card p-4 mb-4 space-y-3">
              <h3 className="font-bold text-[#1e3a5f]">אישורים נדרשים</h3>
              <Checkbox checked={c1} onChange={setC1} label="אני מאשר/ת את התקנון (כולל מודל עסקי: מנוי + עמלה על הצלחה)" />
              <Checkbox checked={c2} onChange={setC2} label="אני מסכים/ה לשימוש במידע שלי בהתאם למדיניות הפרטיות" />
              <Checkbox checked={c3} onChange={setC3} label="אני מסכים/ה לשיתוף נתוני הפרויקט עם גורמים רלוונטיים במערכת" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="w-full py-4 rounded-2xl bg-[#1e3a5f] text-white font-bold text-lg disabled:opacity-60"
            >
              {submit.isPending ? 'שומר...' : 'סיים הגדרת פרופיל והמשך'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="sc-input" />
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-[#1e3a5f]" />
      <span className="text-sm text-[#212121]">{label}</span>
    </label>
  )
}
