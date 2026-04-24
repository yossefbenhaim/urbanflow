import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import CityAutocomplete from '../components/CityAutocomplete'

type ProviderType = 'architect' | 'appraiser' | 'developer' | 'lawyer'

const TYPE_OPTIONS: { value: ProviderType; title: string; icon: string; desc: string }[] = [
  { value: 'architect', title: 'אדריכל', icon: '🏛️', desc: 'תכנון, תב"ע, היתכנות, המלצות תכנוניות' },
  { value: 'appraiser', title: 'שמאי', icon: '📊', desc: 'הערכות שווי, כדאיות כלכלית, בדיקות שטח' },
  { value: 'developer', title: 'יזם', icon: '🏢', desc: 'פתיחת פרויקט, ליווי, תכנון כלכלי, הצעות' },
  { value: 'lawyer', title: 'עו״ד מייצג דיירים', icon: '⚖️', desc: 'ייצוג משפטי לדיירים, חוזים, ליטיגציה, ליווי הליך' },
]

const LAWYER_SPECIALIZATIONS: { value: string; label: string }[] = [
  { value: 'pinui_binui', label: 'פינוי בינוי' },
  { value: 'tama38', label: 'תמ״א 38' },
  { value: 'complex_compounds', label: 'מתחמים מורכבים' },
  { value: 'small_projects', label: 'פרויקטים קטנים' },
  { value: 'difficult_tenant', label: 'טיפול בדייר סרבן' },
  { value: 'litigation_realestate', label: 'ליטיגציה מקרקעין' },
]

const PROJECT_SIZES: { value: 'small' | 'medium' | 'large'; label: string }[] = [
  { value: 'small', label: 'קטן' },
  { value: 'medium', label: 'בינוני' },
  { value: 'large', label: 'גדול' },
]

const COMPLEXITY_LEVELS: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: 'נמוכה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'high', label: 'גבוהה' },
]

const FEE_STRUCTURES: { value: 'from_developer' | 'from_tenants' | 'mixed'; label: string }[] = [
  { value: 'from_developer', label: 'מהיזם' },
  { value: 'from_tenants', label: 'מהדיירים' },
  { value: 'mixed', label: 'משולב' },
]

const SPECIALIZATIONS: Record<Exclude<ProviderType, 'lawyer'>, string[]> = {
  architect: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי', 'שימור', 'מגורים', 'מסחר'],
  appraiser: ['מגורים', 'מסחר', 'תעשייה', 'קרקעות', 'שימוש מעורב'],
  developer: ['פינוי בינוי', `תמ"א 38/2`, 'חלופת שקד', 'בינוי פינוי'],
}

type LawyerReference = { name: string; phone: string; project_name: string }

export default function ProviderOnboarding() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [justSaved, setJustSaved] = useState(false)
  const { data: existing, isLoading: loadingExisting } = trpc.provider.getMyDetails.useQuery(undefined, {
    // Always fetch fresh on mount so we don't re-show consents after a save
    refetchOnMount: 'always',
    staleTime: 0,
    // Don't auto-refetch once the user has just saved — we'll navigate away.
    enabled: !justSaved,
  })
  const isEdit = !!existing?.providerType

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

  // ── Lawyer-specific state ──
  const [officeName, setOfficeName] = useState('')
  const [neighborhoodInput, setNeighborhoodInput] = useState('')
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [lawyerSpecs, setLawyerSpecs] = useState<string[]>([])
  const [preferredSizes, setPreferredSizes] = useState<('small' | 'medium' | 'large')[]>([])
  const [preferredComplexity, setPreferredComplexity] = useState<('low' | 'medium' | 'high')[]>([])
  const [acceptsLowFeasibility, setAcceptsLowFeasibility] = useState(false)
  const [acceptsDifficultProjects, setAcceptsDifficultProjects] = useState(false)
  const [inProgressCount, setInProgressCount] = useState('')
  const [completedTypeInput, setCompletedTypeInput] = useState('')
  const [completedTypes, setCompletedTypes] = useState<string[]>([])
  const [sampleDocInput, setSampleDocInput] = useState('')
  const [sampleDocs, setSampleDocs] = useState<string[]>([])
  const [lawyerRefs, setLawyerRefs] = useState<LawyerReference[]>([])
  const [whyChooseMe, setWhyChooseMe] = useState('')
  const [feeStructure, setFeeStructure] = useState<'from_developer' | 'from_tenants' | 'mixed' | ''>('')
  const [feePercent, setFeePercent] = useState('')
  const [feeFixedAmount, setFeeFixedAmount] = useState('')
  const [feeSpecialTerms, setFeeSpecialTerms] = useState('')

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!existing || justSaved) return
    if (existing.providerType) setType(existing.providerType as ProviderType)
    setFullName(existing.fullName ?? '')
    setPhone(existing.phone ?? '')
    setMainCity(existing.mainCity ?? '')
    setLicense(existing.licenseNumber ?? '')
    setYears(existing.experienceYears != null ? String(existing.experienceYears) : '')
    setProjects(existing.completedProjects != null ? String(existing.completedProjects) : '')
    setSpecs(existing.specializations ?? [])
    setPortfolio(existing.portfolioUrls ?? [])
    setRatingUrl(existing.ratingUrl ?? '')
    if (existing.providerType === 'lawyer') {
      const e = existing as Record<string, unknown>
      setLawyerSpecs(existing.specializations ?? [])
      setOfficeName(typeof e.officeName === 'string' ? e.officeName : (typeof e.company === 'string' ? e.company : ''))
      setNeighborhoods(Array.isArray(e.neighborhoods) ? e.neighborhoods as string[] : [])
      setPreferredSizes((Array.isArray(e.preferredProjectSizes) ? e.preferredProjectSizes : []) as ('small'|'medium'|'large')[])
      setPreferredComplexity((Array.isArray(e.preferredComplexity) ? e.preferredComplexity : []) as ('low'|'medium'|'high')[])
      setAcceptsLowFeasibility(e.acceptsLowFeasibility === true)
      setAcceptsDifficultProjects(e.acceptsDifficultProjects === true)
      setInProgressCount(typeof e.inProgressProjectsCount === 'number' ? String(e.inProgressProjectsCount) : '')
      setCompletedTypes(Array.isArray(e.completedProjectTypes) ? e.completedProjectTypes as string[] : [])
      setSampleDocs(Array.isArray(e.sampleDocumentsUrls) ? e.sampleDocumentsUrls as string[] : [])
      setLawyerRefs(Array.isArray(e.lawyerReferences) ? e.lawyerReferences as LawyerReference[] : [])
      setWhyChooseMe(typeof e.whyChooseMe === 'string' ? e.whyChooseMe : (typeof e.bio === 'string' ? e.bio : ''))
      setFeeStructure((typeof e.feeStructure === 'string' ? e.feeStructure : '') as 'from_developer'|'from_tenants'|'mixed'|'')
      setFeePercent(typeof e.feePercent === 'number' ? String(e.feePercent) : '')
      setFeeFixedAmount(typeof e.feeFixedAmount === 'number' ? String(e.feeFixedAmount) : '')
      setFeeSpecialTerms(typeof e.feeSpecialTerms === 'string' ? e.feeSpecialTerms : '')
    }
    // In edit mode: consents were already captured on first run, default to true
    if (existing.providerType) { setC1(true); setC2(true); setC3(true) }
  }, [existing, justSaved])

  const submit = trpc.provider.completeOnboarding.useMutation({
    onSuccess: (result) => {
      // Prime the onboarding-status cache so the dashboard guard doesn't
      // briefly see stale "not completed" state and bounce back here.
      utils.provider.getOnboardingStatus.setData(undefined, {
        completed: true,
        role: result?.providerType ?? null,
      })
      setJustSaved(true)
      navigate('/provider', { replace: true })
      // Refresh data in the background for the profile tab.
      utils.provider.getMyDetails.invalidate()
      utils.provider.getProfile.invalidate()
    },
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

  const addNeighborhood = () => {
    const v = neighborhoodInput.trim()
    if (v && !neighborhoods.includes(v)) setNeighborhoods([...neighborhoods, v])
    setNeighborhoodInput('')
  }
  const addCompletedType = () => {
    const v = completedTypeInput.trim()
    if (v && !completedTypes.includes(v)) setCompletedTypes([...completedTypes, v])
    setCompletedTypeInput('')
  }
  const addSampleDoc = () => {
    const v = sampleDocInput.trim()
    if (v && !sampleDocs.includes(v)) setSampleDocs([...sampleDocs, v])
    setSampleDocInput('')
  }
  const toggleLawyerSpec = (s: string) => setLawyerSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleSize = (s: 'small'|'medium'|'large') => setPreferredSizes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleComplexity = (c: 'low'|'medium'|'high') => setPreferredComplexity(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  const addRef = () => setLawyerRefs([...lawyerRefs, { name: '', phone: '', project_name: '' }])
  const updateRef = (i: number, field: keyof LawyerReference, v: string) =>
    setLawyerRefs(lawyerRefs.map((r, j) => j === i ? { ...r, [field]: v } : r))
  const removeRef = (i: number) => setLawyerRefs(lawyerRefs.filter((_, j) => j !== i))

  const handleSubmit = async () => {
    setError('')
    if (!type) { setError('בחר סוג נותן שירות'); return }
    if (!fullName.trim()) { setError('שם מלא נדרש'); return }
    if (!phone.trim()) { setError('טלפון נדרש'); return }
    if (!mainCity.trim()) { setError('עיר פעילות ראשית נדרשת'); return }
    if (!c1 || !c2 || !c3) { setError('יש לאשר את כל ההצהרות'); return }

    const isLawyer = type === 'lawyer'
    submit.mutate({
      providerType: type,
      fullName: fullName.trim(),
      phone: phone.trim(),
      mainCity: mainCity.trim(),
      licenseNumber: license.trim() || undefined,
      experienceYears: years ? +years : undefined,
      completedProjects: projects ? +projects : undefined,
      specializations: isLawyer ? lawyerSpecs : specs,
      portfolioUrls: portfolio,
      ratingUrl: ratingUrl.trim() || undefined,
      acceptTerms: c1,
      acceptDataUse: c2,
      acceptProjectSharing: c3,
      // Lawyer-specific
      officeName: isLawyer ? (officeName.trim() || undefined) : undefined,
      neighborhoods: isLawyer ? neighborhoods : [],
      preferredProjectSizes: isLawyer ? preferredSizes : [],
      preferredComplexity: isLawyer ? preferredComplexity : [],
      acceptsLowFeasibility: isLawyer ? acceptsLowFeasibility : undefined,
      acceptsDifficultProjects: isLawyer ? acceptsDifficultProjects : undefined,
      inProgressProjectsCount: isLawyer && inProgressCount ? +inProgressCount : undefined,
      completedProjectTypes: isLawyer ? completedTypes : [],
      sampleDocumentsUrls: isLawyer ? sampleDocs : [],
      lawyerReferences: isLawyer ? lawyerRefs.filter(r => r.name.trim() && r.phone.trim()) : [],
      whyChooseMe: isLawyer ? (whyChooseMe.trim() || undefined) : undefined,
      feeStructure: isLawyer && feeStructure ? feeStructure : undefined,
      feePercent: isLawyer && feePercent ? +feePercent : undefined,
      feeFixedAmount: isLawyer && feeFixedAmount ? +feeFixedAmount : undefined,
      feeSpecialTerms: isLawyer ? (feeSpecialTerms.trim() || undefined) : undefined,
    })
  }

  if (loadingExisting || justSaved) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#5a5a6e]">{justSaved ? 'נשמר! מעביר ללוח הבקרה...' : 'טוען...'}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8f9fa] py-8 px-4 font-heebo">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-1">
            {isEdit ? 'עריכת פרופיל' : 'הגדרת פרופיל מקצועי'}
          </h1>
          <p className="text-sm text-[#5a5a6e]">
            {isEdit
              ? 'עדכן את הפרטים שלך. שינויים ישמרו מיידית.'
              : 'בחר את סוג השירות שלך והשלם את הפרופיל כדי להתחיל לקבל פרויקטים מותאמים'}
          </p>
        </div>

        {/* Type selector */}
        <div className="mb-6">
          <label className="block text-xs text-[#5a5a6e] mb-2 font-semibold">סוג נותן שירות *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              {type !== 'lawyer' && (
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
              )}
            </div>

            {/* ── Lawyer-specific sections ─────────────────────── */}
            {type === 'lawyer' && (
              <>
                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">משרד ואזור פעילות</h3>
                  <LabeledInput label="שם משרד" value={officeName} onChange={setOfficeName} />
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">שכונות (בחירה מרובה)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={neighborhoodInput}
                        onChange={e => setNeighborhoodInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNeighborhood())}
                        placeholder="הקלד שם שכונה ולחץ +"
                        className="sc-input flex-1"
                      />
                      <button onClick={addNeighborhood} className="px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold">+</button>
                    </div>
                    {neighborhoods.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {neighborhoods.map((n, i) => (
                          <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                            {n}
                            <button onClick={() => setNeighborhoods(neighborhoods.filter((_, j) => j !== i))} className="text-[#3b6b9c]">x</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">תחומי התמחות</h3>
                  <div className="flex flex-wrap gap-2">
                    {LAWYER_SPECIALIZATIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => toggleLawyerSpec(s.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors
                          ${lawyerSpecs.includes(s.value) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">סוגי פרויקטים מועדפים</h3>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">מספר דיירים</label>
                    <div className="flex gap-2">
                      {PROJECT_SIZES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => toggleSize(s.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors
                            ${preferredSizes.includes(s.value) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">רמת מורכבות</label>
                    <div className="flex gap-2">
                      {COMPLEXITY_LEVELS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => toggleComplexity(c.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors
                            ${preferredComplexity.includes(c.value) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Checkbox checked={acceptsLowFeasibility} onChange={setAcceptsLowFeasibility} label="מוכן/ה לקבל פרויקטים עם כדאיות נמוכה" />
                  <Checkbox checked={acceptsDifficultProjects} onChange={setAcceptsDifficultProjects} label="מוכן/ה לפרויקטים קשים / דיירים סרבנים" />
                </div>

                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">ניסיון בפועל</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput label="פרויקטים בתהליך" value={inProgressCount} onChange={setInProgressCount} type="number" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">סוגי פרויקטים שבוצעו</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={completedTypeInput}
                        onChange={e => setCompletedTypeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCompletedType())}
                        placeholder="למשל: פינוי בינוי בתל אביב"
                        className="sc-input flex-1"
                      />
                      <button onClick={addCompletedType} className="px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold">+</button>
                    </div>
                    {completedTypes.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {completedTypes.map((t, i) => (
                          <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                            {t}
                            <button onClick={() => setCompletedTypes(completedTypes.filter((_, j) => j !== i))} className="text-[#3b6b9c]">x</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">קישורי דוגמאות (PDF אופציונלי)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sampleDocInput}
                        onChange={e => setSampleDocInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSampleDoc())}
                        placeholder="https://..."
                        className="sc-input flex-1"
                      />
                      <button onClick={addSampleDoc} className="px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold">+</button>
                    </div>
                    {sampleDocs.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {sampleDocs.map((u, i) => {
                          let host = u
                          try { host = new URL(u).hostname } catch { /* keep url */ }
                          return (
                            <span key={i} className="bg-[#ebf1f7] text-[#3b6b9c] px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                              {host}
                              <button onClick={() => setSampleDocs(sampleDocs.filter((_, j) => j !== i))} className="text-[#3b6b9c]">x</button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">אמינות והמלצות</h3>
                  {lawyerRefs.map((r, i) => (
                    <div key={i} className="border border-[#eeeeee] rounded-xl p-3 space-y-2 relative">
                      <button onClick={() => removeRef(i)} className="absolute top-2 left-2 text-red-500 text-xs">הסר</button>
                      <LabeledInput label="שם ממליץ" value={r.name} onChange={v => updateRef(i, 'name', v)} />
                      <LabeledInput label="טלפון" value={r.phone} onChange={v => updateRef(i, 'phone', v)} placeholder="050-1234567" />
                      <LabeledInput label="שם פרויקט" value={r.project_name} onChange={v => updateRef(i, 'project_name', v)} />
                    </div>
                  ))}
                  <button onClick={addRef} className="w-full py-2 rounded-xl border border-dashed border-[#3b6b9c] text-[#3b6b9c] text-sm font-semibold">
                    + הוסף ממליץ
                  </button>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">למה לבחור בי?</label>
                    <textarea
                      value={whyChooseMe}
                      onChange={e => setWhyChooseMe(e.target.value)}
                      rows={4}
                      placeholder="ספר/י על הגישה שלך, על ההבדל בשירות, על הניסיון הייחודי..."
                      className="sc-input resize-none"
                    />
                  </div>
                </div>

                <div className="sc-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1e3a5f]">שכר טרחה</h3>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">איך נגבה?</label>
                    <div className="flex gap-2">
                      {FEE_STRUCTURES.map(f => (
                        <button
                          key={f.value}
                          onClick={() => setFeeStructure(f.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors
                            ${feeStructure === f.value ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput label="אחוז (%)" value={feePercent} onChange={setFeePercent} type="number" placeholder="למשל: 2.5" />
                    <LabeledInput label="סכום קבוע (₪)" value={feeFixedAmount} onChange={setFeeFixedAmount} type="number" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a6e] mb-1">תנאים מיוחדים</label>
                    <textarea
                      value={feeSpecialTerms}
                      onChange={e => setFeeSpecialTerms(e.target.value)}
                      rows={3}
                      placeholder="למשל: תשלום בשלבים, הצלחה..."
                      className="sc-input resize-none"
                    />
                  </div>
                </div>
              </>
            )}

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

            {/* Consents (hidden in edit mode — captured once on first submit) */}
            {!isEdit && (
              <div className="sc-card p-4 mb-4 space-y-3">
                <h3 className="font-bold text-[#1e3a5f]">אישורים נדרשים</h3>
                <Checkbox checked={c1} onChange={setC1} label="אני מאשר/ת את התקנון (כולל מודל עסקי: מנוי + עמלה על הצלחה)" />
                <Checkbox checked={c2} onChange={setC2} label="אני מסכים/ה לשימוש במידע שלי בהתאם למדיניות הפרטיות" />
                <Checkbox checked={c3} onChange={setC3} label="אני מסכים/ה לשיתוף נתוני הפרויקט עם גורמים רלוונטיים במערכת" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="w-full py-4 rounded-2xl bg-[#1e3a5f] text-white font-bold text-lg disabled:opacity-60"
            >
              {submit.isPending ? 'שומר...' : isEdit ? 'שמור שינויים' : 'סיים הגדרת פרופיל והמשך'}
            </button>

            {isEdit && (
              <button
                onClick={() => navigate('/provider')}
                className="w-full mt-2 py-3 rounded-2xl bg-white border border-[#eeeeee] text-[#5a5a6e] font-semibold"
              >
                ביטול
              </button>
            )}
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
