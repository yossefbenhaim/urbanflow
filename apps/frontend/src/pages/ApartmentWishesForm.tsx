import { useState, useEffect } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'
import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────

const CURRENT_APT_TYPES = [
  { value: 'regular', label: 'דירה רגילה' },
  { value: 'garden', label: 'דירת גן' },
  { value: 'penthouse', label: 'פנטהאוז' },
  { value: 'duplex', label: 'דופלקס' },
  { value: 'other', label: 'אחר' },
] as const

const CURRENT_FEATURES = [
  { value: 'balcony', label: 'מרפסת' },
  { value: 'sukkah_balcony', label: 'מרפסת סוכה' },
  { value: 'parking', label: 'חניה' },
  { value: 'two_parking', label: 'שתי חניות' },
  { value: 'storage', label: 'מחסן' },
  { value: 'garden', label: 'גינה / חצר' },
  { value: 'roof', label: 'גג' },
  { value: 'separate_entrance', label: 'כניסה נפרדת' },
  { value: 'elevator', label: 'מעלית בבניין' },
  { value: 'shabbat_elevator', label: 'מעלית שבת' },
  { value: 'two_air', label: 'שני כיווני אוויר' },
  { value: 'three_air', label: 'שלושה כיווני אוויר' },
  { value: 'corner', label: 'דירה פינתית' },
  { value: 'other', label: 'אחר' },
] as const

const DESIRED_APT_TYPES = [
  { value: 'regular', label: 'דירה רגילה' },
  { value: 'garden', label: 'דירת גן' },
  { value: 'penthouse', label: 'פנטהאוז' },
  { value: 'duplex', label: 'דופלקס' },
  { value: 'split_two', label: 'לפצל לשתי דירות קטנות' },
  { value: 'premium', label: 'לשדרג לדירה גדולה יותר (פרימיום)' },
  { value: 'any', label: 'לא משנה' },
] as const

const INTERIOR_CHANGES = [
  { value: 'open_kitchen', label: 'מטבח פתוח' },
  { value: 'large_salon', label: 'סלון גדול יותר' },
  { value: 'large_bedroom', label: 'חדר הורים גדול' },
  { value: 'add_room', label: 'הוספת חדר' },
  { value: 'change_layout', label: 'שינוי חלוקת חדרים' },
  { value: 'public_private_sep', label: 'הפרדה בין אזור ציבורי לפרטי' },
  { value: 'upgraded_master', label: 'יחידת הורים משודרגת' },
  { value: 'custom', label: 'תכנון מותאם אישית' },
  { value: 'other', label: 'אחר' },
] as const

const EXTRA_ADDITIONS = [
  { value: 'elevator', label: 'מעלית' },
  { value: 'shabbat_elevator', label: 'מעלית שבת' },
  { value: 'bike_room', label: 'חדר אופניים' },
  { value: 'shared_spaces', label: 'שטחים משותפים' },
  { value: 'other', label: 'אחר' },
] as const

const BUILDING_PREFS = [
  { value: 'designed_lobby', label: 'לובי גדול ומעוצב' },
  { value: 'gym', label: 'חדר כושר' },
  { value: 'residents_room', label: 'חדר דיירים' },
  { value: 'underground_parking', label: 'חניה תת קרקעית' },
  { value: 'green_spaces', label: 'שטחים ירוקים' },
  { value: 'fast_elevators', label: 'מעליות מהירות' },
  { value: 'privacy', label: 'פרטיות (מעט דירות בקומה)' },
  { value: 'other', label: 'אחר' },
] as const

const PRIORITIES = [
  { value: 'size', label: 'גודל הדירה' },
  { value: 'floor', label: 'קומה' },
  { value: 'parking', label: 'חניה' },
  { value: 'balcony', label: 'מרפסת' },
  { value: 'air_directions', label: 'כיווני אוויר' },
  { value: 'interior', label: 'תכנון פנימי' },
  { value: 'building_quality', label: 'איכות הבניין' },
  { value: 'quiet', label: 'שקט' },
  { value: 'view', label: 'נוף' },
  { value: 'other', label: 'אחר' },
] as const

// ─── Types ───────────────────────────────────────────────

interface StandardAdditions {
  mamad: { want: boolean; sqm: string }
  balcony: { want: boolean; sqm: string }
  sukkah: { want: boolean; sqm: string }
  largeBalcony: { want: boolean; sqm: string }
  parking: { want: boolean; count: string }
  storage: { want: boolean; sqm: string }
  lobby: { want: boolean }
}

interface FormState {
  fullName: string
  idNumber: string
  phone: string
  email: string
  apartmentNumber: string
  currentFloor: string
  currentType: string
  currentTypeOther: string
  currentFeatures: string[]
  currentFeaturesOther: string
  tabuMatch: string
  tabuMismatchDetails: string
  floorPreference: string
  floorChangeAmount: string
  sizePreference: string
  roomsPreference: string
  airDirections: string
  desiredType: string
  standardAdditions: StandardAdditions
  extraAdditions: string[]
  extraAdditionsOther: string
  wantsInteriorChanges: boolean
  interiorChanges: string[]
  interiorChangesOther: string
  ceilingHeight: string
  ceilingHeightMeters: string
  parkingCurrent: string
  parkingDesired: string
  balconyCurrent: string
  balconyDesired: string
  gardenRoofPreference: string
  buildingPreferences: string[]
  buildingPreferencesOther: string
  topPriorities: string[]
  topPrioritiesOther: string
}

const defaultAdditions: StandardAdditions = {
  mamad: { want: false, sqm: '' },
  balcony: { want: false, sqm: '' },
  sukkah: { want: false, sqm: '' },
  largeBalcony: { want: false, sqm: '' },
  parking: { want: false, count: '1' },
  storage: { want: false, sqm: '' },
  lobby: { want: false },
}

const defaultForm: FormState = {
  fullName: '', idNumber: '', phone: '', email: '',
  apartmentNumber: '', currentFloor: '',
  currentType: '', currentTypeOther: '',
  currentFeatures: [], currentFeaturesOther: '',
  tabuMatch: '', tabuMismatchDetails: '',
  floorPreference: '', floorChangeAmount: '',
  sizePreference: '', roomsPreference: '', airDirections: '',
  desiredType: '',
  standardAdditions: { ...defaultAdditions },
  extraAdditions: [], extraAdditionsOther: '',
  wantsInteriorChanges: false,
  interiorChanges: [], interiorChangesOther: '',
  ceilingHeight: '', ceilingHeightMeters: '',
  parkingCurrent: '', parkingDesired: '',
  balconyCurrent: '', balconyDesired: '',
  gardenRoofPreference: '',
  buildingPreferences: [], buildingPreferencesOther: '',
  topPriorities: [], topPrioritiesOther: '',
}

// ─── Helpers ─────────────────────────────────────────────

interface AIAnalysis {
  summary?: string
  guaranteedRights?: string[]
  pointsToCheck?: string[]
  recommendations?: string[]
  matchScore?: number
  matchExplanation?: string
  raw?: string
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#eeeeee] rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  )
}

function RadioGroup({ name, value, options, onChange }: {
  name: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
          value === opt.value ? 'bg-[#3b6b9c]/10 border-[#3b6b9c]' : 'bg-white border-[#eeeeee] hover:bg-[#f8f9fa]'
        }`}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="w-4 h-4 accent-[#3b6b9c]"
          />
          <span className="text-sm text-[#212121]">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({ selected, options, onChange, max }: {
  selected: string[]
  options: readonly { value: string; label: string }[]
  onChange: (v: string[]) => void
  max?: number
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val))
    } else if (!max || selected.length < max) {
      onChange([...selected, val])
    }
  }

  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
          selected.includes(opt.value) ? 'bg-[#3b6b9c]/10 border-[#3b6b9c]' : 'bg-white border-[#eeeeee] hover:bg-[#f8f9fa]'
        }`}>
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="w-5 h-5 rounded accent-[#3b6b9c]"
          />
          <span className="text-sm text-[#212121]">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export default function ApartmentWishesForm() {
  const { data: existing, isLoading } = trpc.tenant.getApartmentWishes.useQuery()
  const save = trpc.tenant.saveApartmentWishes.useMutation({
    onSuccess: () => toast.success('הטופס נשמר בהצלחה'),
    onError: () => toast.error('שגיאה בשמירה, נסה שנית'),
  })
  const analyze = trpc.tenant.analyzeApartmentWishes.useMutation({
    onSuccess: (data) => setAnalysis(data as AIAnalysis),
    onError: () => toast.error('שגיאה בניתוח, נסה שנית'),
  })

  const [form, setForm] = useState<FormState>({ ...defaultForm })
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!existing) return
    const e = existing as Record<string, unknown>
    setForm({
      fullName: (e.full_name as string) ?? '',
      idNumber: (e.id_number as string) ?? '',
      phone: (e.phone as string) ?? '',
      email: (e.email as string) ?? '',
      apartmentNumber: (e.apartment_number as string) ?? '',
      currentFloor: e.current_floor != null ? String(e.current_floor) : '',
      currentType: (e.current_type as string) ?? '',
      currentTypeOther: (e.current_type_other as string) ?? '',
      currentFeatures: (e.current_features as string[]) ?? [],
      currentFeaturesOther: (e.current_features_other as string) ?? '',
      tabuMatch: e.tabu_match === true ? 'yes' : e.tabu_match === false ? 'no' : '',
      tabuMismatchDetails: (e.tabu_mismatch_details as string) ?? '',
      floorPreference: (e.floor_preference as string) ?? '',
      floorChangeAmount: e.floor_change_amount != null ? String(e.floor_change_amount) : '',
      sizePreference: (e.size_preference as string) ?? '',
      roomsPreference: (e.rooms_preference as string) ?? '',
      airDirections: (e.air_directions as string) ?? '',
      desiredType: (e.desired_type as string) ?? '',
      standardAdditions: e.standard_additions ? { ...defaultAdditions, ...(e.standard_additions as StandardAdditions) } : { ...defaultAdditions },
      extraAdditions: (e.extra_additions as string[]) ?? [],
      extraAdditionsOther: (e.extra_additions_other as string) ?? '',
      wantsInteriorChanges: (e.wants_interior_changes as boolean) ?? false,
      interiorChanges: (e.interior_changes as string[]) ?? [],
      interiorChangesOther: (e.interior_changes_other as string) ?? '',
      ceilingHeight: (e.ceiling_height as string) ?? '',
      ceilingHeightMeters: e.ceiling_height_meters != null ? String(e.ceiling_height_meters) : '',
      parkingCurrent: (e.parking_current as string) ?? '',
      parkingDesired: (e.parking_desired as string) ?? '',
      balconyCurrent: (e.balcony_current as string) ?? '',
      balconyDesired: (e.balcony_desired as string) ?? '',
      gardenRoofPreference: (e.garden_roof_preference as string) ?? '',
      buildingPreferences: (e.building_preferences as string[]) ?? [],
      buildingPreferencesOther: (e.building_preferences_other as string) ?? '',
      topPriorities: (e.top_priorities as string[]) ?? [],
      topPrioritiesOther: (e.top_priorities_other as string) ?? '',
    })
    if (e.ai_analysis) setAnalysis(e.ai_analysis as AIAnalysis)
  }, [existing])

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const setAddition = (key: keyof StandardAdditions, field: string, val: unknown) =>
    setForm(f => ({
      ...f,
      standardAdditions: {
        ...f.standardAdditions,
        [key]: { ...f.standardAdditions[key], [field]: val },
      },
    }))

  const handleSave = (status: 'draft' | 'submitted' = 'draft') => {
    save.mutate({
      fullName: form.fullName || undefined,
      idNumber: form.idNumber || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      apartmentNumber: form.apartmentNumber || undefined,
      currentFloor: form.currentFloor ? parseInt(form.currentFloor) : undefined,
      currentType: (form.currentType as 'regular' | 'garden' | 'penthouse' | 'duplex' | 'other') || undefined,
      currentTypeOther: form.currentTypeOther || undefined,
      currentFeatures: form.currentFeatures,
      currentFeaturesOther: form.currentFeaturesOther || undefined,
      tabuMatch: form.tabuMatch === 'yes' ? true : form.tabuMatch === 'no' ? false : undefined,
      tabuMismatchDetails: form.tabuMismatchDetails || undefined,
      floorPreference: (form.floorPreference as 'same' | 'up' | 'down' | 'any') || undefined,
      floorChangeAmount: form.floorChangeAmount ? parseInt(form.floorChangeAmount) : undefined,
      sizePreference: (form.sizePreference as 'same' | 'bigger' | 'smaller' | 'any') || undefined,
      roomsPreference: (form.roomsPreference as 'same' | 'add' | 'remove' | 'any') || undefined,
      airDirections: (form.airDirections as 'same' | 'important' | 'any') || undefined,
      desiredType: (form.desiredType as 'regular' | 'garden' | 'penthouse' | 'duplex' | 'split_two' | 'premium' | 'any') || undefined,
      standardAdditions: JSON.parse(JSON.stringify(form.standardAdditions)),
      extraAdditions: form.extraAdditions,
      extraAdditionsOther: form.extraAdditionsOther || undefined,
      wantsInteriorChanges: form.wantsInteriorChanges,
      interiorChanges: form.interiorChanges,
      interiorChangesOther: form.interiorChangesOther || undefined,
      ceilingHeight: (form.ceilingHeight as 'standard' | 'high') || undefined,
      ceilingHeightMeters: form.ceilingHeightMeters ? parseFloat(form.ceilingHeightMeters) : undefined,
      parkingCurrent: (form.parkingCurrent as 'none' | 'one' | 'two') || undefined,
      parkingDesired: (form.parkingDesired as 'none' | 'one' | 'two') || undefined,
      balconyCurrent: (form.balconyCurrent as 'none' | 'regular' | 'sukkah' | 'large') || undefined,
      balconyDesired: (form.balconyDesired as 'none' | 'regular' | 'sukkah' | 'large') || undefined,
      gardenRoofPreference: (form.gardenRoofPreference as 'garden' | 'roof' | 'any') || undefined,
      buildingPreferences: form.buildingPreferences,
      buildingPreferencesOther: form.buildingPreferencesOther || undefined,
      topPriorities: form.topPriorities,
      topPrioritiesOther: form.topPrioritiesOther || undefined,
      status,
    })
  }

  const handleSubmitAndAnalyze = () => {
    save.mutate({
      fullName: form.fullName || undefined,
      idNumber: form.idNumber || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      apartmentNumber: form.apartmentNumber || undefined,
      currentFloor: form.currentFloor ? parseInt(form.currentFloor) : undefined,
      currentType: (form.currentType as 'regular' | 'garden' | 'penthouse' | 'duplex' | 'other') || undefined,
      currentTypeOther: form.currentTypeOther || undefined,
      currentFeatures: form.currentFeatures,
      currentFeaturesOther: form.currentFeaturesOther || undefined,
      tabuMatch: form.tabuMatch === 'yes' ? true : form.tabuMatch === 'no' ? false : undefined,
      tabuMismatchDetails: form.tabuMismatchDetails || undefined,
      floorPreference: (form.floorPreference as 'same' | 'up' | 'down' | 'any') || undefined,
      floorChangeAmount: form.floorChangeAmount ? parseInt(form.floorChangeAmount) : undefined,
      sizePreference: (form.sizePreference as 'same' | 'bigger' | 'smaller' | 'any') || undefined,
      roomsPreference: (form.roomsPreference as 'same' | 'add' | 'remove' | 'any') || undefined,
      airDirections: (form.airDirections as 'same' | 'important' | 'any') || undefined,
      desiredType: (form.desiredType as 'regular' | 'garden' | 'penthouse' | 'duplex' | 'split_two' | 'premium' | 'any') || undefined,
      standardAdditions: JSON.parse(JSON.stringify(form.standardAdditions)),
      extraAdditions: form.extraAdditions,
      extraAdditionsOther: form.extraAdditionsOther || undefined,
      wantsInteriorChanges: form.wantsInteriorChanges,
      interiorChanges: form.interiorChanges,
      interiorChangesOther: form.interiorChangesOther || undefined,
      ceilingHeight: (form.ceilingHeight as 'standard' | 'high') || undefined,
      ceilingHeightMeters: form.ceilingHeightMeters ? parseFloat(form.ceilingHeightMeters) : undefined,
      parkingCurrent: (form.parkingCurrent as 'none' | 'one' | 'two') || undefined,
      parkingDesired: (form.parkingDesired as 'none' | 'one' | 'two') || undefined,
      balconyCurrent: (form.balconyCurrent as 'none' | 'regular' | 'sukkah' | 'large') || undefined,
      balconyDesired: (form.balconyDesired as 'none' | 'regular' | 'sukkah' | 'large') || undefined,
      gardenRoofPreference: (form.gardenRoofPreference as 'garden' | 'roof' | 'any') || undefined,
      buildingPreferences: form.buildingPreferences,
      buildingPreferencesOther: form.buildingPreferencesOther || undefined,
      topPriorities: form.topPriorities,
      topPrioritiesOther: form.topPrioritiesOther || undefined,
      status: 'submitted',
    }, {
      onSuccess: () => {
        toast.success('הטופס נשלח! מנתח...')
        analyze.mutate()
      },
    })
  }

  if (isLoading) return (
    <PageLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
      </div>
    </PageLayout>
  )

  const steps = [
    'פרטים בסיסיים',
    'מצב קיים',
    'ציפיות - דירה',
    'תוספות ותכנון',
    'חניה ומרפסות',
    'העדפות בניין',
  ]

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-[#ebf1f7] border border-[#3b6b9c]/20 rounded-2xl p-5 mb-6 flex gap-3 items-start">
          <span className="text-2xl flex-shrink-0">🏠</span>
          <div>
            <h2 className="text-base font-bold text-[#1e3a5f] mb-1">טופס דירה חדשה (DI2)</h2>
            <p className="text-sm text-[#3b6b9c] leading-relaxed">
              תיאום ציפיות — ספר/י לנו מה חשוב לך בדירה החדשה. המערכת תנתח את הציפיות שלך ותחזיר משוב מקצועי.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                i === step
                  ? 'bg-[#3b6b9c] text-white'
                  : i < step
                    ? 'bg-[#3b6b9c]/20 text-[#1e3a5f]'
                    : 'bg-[#f0f0f0] text-[#5a5a6e]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="sc-card p-6">
          {/* ─── Step 0: Basic Info ────────────────────── */}
          {step === 0 && (
            <Section title="פרטים בסיסיים" icon="🧾">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">שם מלא</label>
                  <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} className="sc-input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">תעודת זהות</label>
                  <input type="text" value={form.idNumber} onChange={e => set('idNumber', e.target.value)} className="sc-input w-full" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">טלפון</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="sc-input w-full" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">אימייל</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="sc-input w-full" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">מספר דירה</label>
                  <input type="text" value={form.apartmentNumber} onChange={e => set('apartmentNumber', e.target.value)} className="sc-input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#5a5a6e] mb-1">קומה נוכחית</label>
                  <input type="number" value={form.currentFloor} onChange={e => set('currentFloor', e.target.value)} className="sc-input w-full" />
                </div>
              </div>
            </Section>
          )}

          {/* ─── Step 1: Current State ─────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <Section title="סוג דירה נוכחית" icon="🏡">
                <RadioGroup
                  name="currentType"
                  value={form.currentType}
                  options={[...CURRENT_APT_TYPES]}
                  onChange={v => set('currentType', v)}
                />
                {form.currentType === 'other' && (
                  <input type="text" value={form.currentTypeOther} onChange={e => set('currentTypeOther', e.target.value)}
                    placeholder="פרט..." className="sc-input w-full mt-2" />
                )}
              </Section>

              <Section title="מה יש לך היום בדירה" icon="📋">
                <CheckboxGroup
                  selected={form.currentFeatures}
                  options={CURRENT_FEATURES}
                  onChange={v => set('currentFeatures', v)}
                />
                {form.currentFeatures.includes('other') && (
                  <input type="text" value={form.currentFeaturesOther} onChange={e => set('currentFeaturesOther', e.target.value)}
                    placeholder="פרט..." className="sc-input w-full mt-2" />
                )}
              </Section>

              <Section title="התאמה לטאבו" icon="📄">
                <p className="text-sm text-[#5a5a6e] mb-3">האם כל מה שסימנת רשום בטאבו?</p>
                <RadioGroup
                  name="tabuMatch"
                  value={form.tabuMatch}
                  options={[{ value: 'yes', label: 'כן' }, { value: 'no', label: 'לא' }]}
                  onChange={v => set('tabuMatch', v)}
                />
                {form.tabuMatch === 'no' && (
                  <textarea value={form.tabuMismatchDetails} onChange={e => set('tabuMismatchDetails', e.target.value)}
                    placeholder="פרט מה לא רשום בטאבו..." rows={3} className="sc-input w-full mt-3" />
                )}
              </Section>
            </div>
          )}

          {/* ─── Step 2: Apartment Expectations ────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <Section title="קומה רצויה" icon="📌">
                <RadioGroup
                  name="floorPref"
                  value={form.floorPreference}
                  options={[
                    { value: 'same', label: 'להישאר באותה קומה' },
                    { value: 'up', label: 'לעלות קומה' },
                    { value: 'down', label: 'לרדת קומה' },
                    { value: 'any', label: 'לא משנה' },
                  ]}
                  onChange={v => set('floorPreference', v)}
                />
                {(form.floorPreference === 'up' || form.floorPreference === 'down') && (
                  <div className="mt-3">
                    <label className="block text-xs text-[#5a5a6e] mb-1">כמה קומות?</label>
                    <RadioGroup
                      name="floorAmount"
                      value={form.floorChangeAmount}
                      options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3+' }]}
                      onChange={v => set('floorChangeAmount', v)}
                    />
                  </div>
                )}
              </Section>

              <Section title="גודל הדירה" icon="📌">
                <RadioGroup
                  name="sizePref"
                  value={form.sizePreference}
                  options={[
                    { value: 'same', label: 'כמו היום' },
                    { value: 'bigger', label: 'גדול יותר' },
                    { value: 'smaller', label: 'קטן יותר' },
                    { value: 'any', label: 'לא משנה' },
                  ]}
                  onChange={v => set('sizePreference', v)}
                />
              </Section>

              <Section title="מספר חדרים" icon="📌">
                <RadioGroup
                  name="roomsPref"
                  value={form.roomsPreference}
                  options={[
                    { value: 'same', label: 'כמו היום' },
                    { value: 'add', label: 'להוסיף חדר' },
                    { value: 'remove', label: 'להוריד חדר' },
                    { value: 'any', label: 'לא משנה' },
                  ]}
                  onChange={v => set('roomsPreference', v)}
                />
              </Section>

              <Section title="כיווני אוויר" icon="📌">
                <RadioGroup
                  name="airPref"
                  value={form.airDirections}
                  options={[
                    { value: 'same', label: 'כמו היום' },
                    { value: 'important', label: 'חשוב לשמור' },
                    { value: 'any', label: 'לא משנה' },
                  ]}
                  onChange={v => set('airDirections', v)}
                />
              </Section>

              <Section title="סוג דירה רצוי" icon="🏢">
                <RadioGroup
                  name="desiredType"
                  value={form.desiredType}
                  options={[...DESIRED_APT_TYPES]}
                  onChange={v => set('desiredType', v)}
                />
              </Section>
            </div>
          )}

          {/* ─── Step 3: Additions & Interior ──────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <Section title="תוספות סטנדרטיות" icon="⭐">
                {/* Mamad */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.mamad.want}
                      onChange={e => setAddition('mamad', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">ממ"ד</span>
                  </label>
                  {form.standardAdditions.mamad.want && (
                    <div>
                      <label className="block text-xs text-[#5a5a6e] mb-1">כמה מ"ר אתה מצפה?</label>
                      <input type="number" value={form.standardAdditions.mamad.sqm}
                        onChange={e => setAddition('mamad', 'sqm', e.target.value)} className="sc-input w-32" />
                    </div>
                  )}
                </div>

                {/* Balcony */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.balcony.want}
                      onChange={e => setAddition('balcony', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">מרפסת</span>
                  </label>
                  {form.standardAdditions.balcony.want && (
                    <div>
                      <label className="block text-xs text-[#5a5a6e] mb-1">כמה מ"ר?</label>
                      <input type="number" value={form.standardAdditions.balcony.sqm}
                        onChange={e => setAddition('balcony', 'sqm', e.target.value)} className="sc-input w-32" />
                    </div>
                  )}
                </div>

                {/* Sukkah Balcony */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.sukkah.want}
                      onChange={e => setAddition('sukkah', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">מרפסת סוכה</span>
                  </label>
                  {form.standardAdditions.sukkah.want && (
                    <div>
                      <label className="block text-xs text-[#5a5a6e] mb-1">כמה מ"ר?</label>
                      <input type="number" value={form.standardAdditions.sukkah.sqm}
                        onChange={e => setAddition('sukkah', 'sqm', e.target.value)} className="sc-input w-32" />
                    </div>
                  )}
                </div>

                {/* Large Balcony */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.largeBalcony.want}
                      onChange={e => setAddition('largeBalcony', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">מרפסת גדולה</span>
                  </label>
                  {form.standardAdditions.largeBalcony.want && (
                    <div>
                      <label className="block text-xs text-[#5a5a6e] mb-1">כמה מ"ר?</label>
                      <input type="number" value={form.standardAdditions.largeBalcony.sqm}
                        onChange={e => setAddition('largeBalcony', 'sqm', e.target.value)} className="sc-input w-32" />
                    </div>
                  )}
                </div>

                {/* Parking */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.parking.want}
                      onChange={e => setAddition('parking', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">חניה</span>
                  </label>
                  {form.standardAdditions.parking.want && (
                    <RadioGroup
                      name="parkingCount"
                      value={form.standardAdditions.parking.count}
                      options={[{ value: '1', label: 'חניה אחת' }, { value: '2', label: 'שתי חניות' }]}
                      onChange={v => setAddition('parking', 'count', v)}
                    />
                  )}
                </div>

                {/* Storage */}
                <div className="border border-[#eeeeee] rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.storage.want}
                      onChange={e => setAddition('storage', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">מחסן</span>
                  </label>
                  {form.standardAdditions.storage.want && (
                    <div>
                      <label className="block text-xs text-[#5a5a6e] mb-1">כמה מ"ר?</label>
                      <input type="number" value={form.standardAdditions.storage.sqm}
                        onChange={e => setAddition('storage', 'sqm', e.target.value)} className="sc-input w-32" />
                    </div>
                  )}
                </div>

                {/* Lobby */}
                <div className="border border-[#eeeeee] rounded-xl p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.standardAdditions.lobby.want}
                      onChange={e => setAddition('lobby', 'want', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                    <span className="text-sm font-medium">לובי מושקע בבניין</span>
                  </label>
                </div>
              </Section>

              <Section title="תוספות נוספות" icon="➕">
                <CheckboxGroup
                  selected={form.extraAdditions}
                  options={EXTRA_ADDITIONS}
                  onChange={v => set('extraAdditions', v)}
                />
                {form.extraAdditions.includes('other') && (
                  <input type="text" value={form.extraAdditionsOther} onChange={e => set('extraAdditionsOther', e.target.value)}
                    placeholder="פרט..." className="sc-input w-full mt-2" />
                )}
              </Section>

              <Section title="תכנון פנימי של הדירה" icon="🏗️">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.wantsInteriorChanges}
                    onChange={e => set('wantsInteriorChanges', e.target.checked)} className="w-5 h-5 rounded accent-[#3b6b9c]" />
                  <span className="text-sm font-medium">כן, אני רוצה לשנות את תכנון הדירה</span>
                </label>
                {form.wantsInteriorChanges && (
                  <>
                    <CheckboxGroup
                      selected={form.interiorChanges}
                      options={INTERIOR_CHANGES}
                      onChange={v => set('interiorChanges', v)}
                    />
                    {form.interiorChanges.includes('other') && (
                      <input type="text" value={form.interiorChangesOther} onChange={e => set('interiorChangesOther', e.target.value)}
                        placeholder="פרט..." className="sc-input w-full mt-2" />
                    )}
                  </>
                )}
              </Section>

              <Section title="גובה תקרה רצוי" icon="📏">
                <RadioGroup
                  name="ceiling"
                  value={form.ceilingHeight}
                  options={[{ value: 'standard', label: 'סטנדרטי' }, { value: 'high', label: 'גבוה מהרגיל' }]}
                  onChange={v => set('ceilingHeight', v)}
                />
                {form.ceilingHeight === 'high' && (
                  <div className="mt-2">
                    <label className="block text-xs text-[#5a5a6e] mb-1">כמה מטר?</label>
                    <input type="number" step="0.1" value={form.ceilingHeightMeters}
                      onChange={e => set('ceilingHeightMeters', e.target.value)} className="sc-input w-32" />
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ─── Step 4: Parking & Balconies ───────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <Section title="חניה" icon="🚗">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#5a5a6e] mb-2 font-medium">מה יש לך היום?</p>
                    <RadioGroup
                      name="parkCurrent"
                      value={form.parkingCurrent}
                      options={[
                        { value: 'none', label: 'אין' },
                        { value: 'one', label: 'חניה אחת' },
                        { value: 'two', label: 'שתי חניות' },
                      ]}
                      onChange={v => set('parkingCurrent', v)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#5a5a6e] mb-2 font-medium">מה אתה רוצה?</p>
                    <RadioGroup
                      name="parkDesired"
                      value={form.parkingDesired}
                      options={[
                        { value: 'none', label: 'לא צריך' },
                        { value: 'one', label: 'חניה אחת' },
                        { value: 'two', label: 'שתי חניות' },
                      ]}
                      onChange={v => set('parkingDesired', v)}
                    />
                  </div>
                </div>
              </Section>

              <Section title="מרפסות" icon="🌿">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#5a5a6e] mb-2 font-medium">מה יש לך היום?</p>
                    <RadioGroup
                      name="balcCurrent"
                      value={form.balconyCurrent}
                      options={[
                        { value: 'none', label: 'אין' },
                        { value: 'regular', label: 'מרפסת רגילה' },
                        { value: 'sukkah', label: 'מרפסת סוכה' },
                        { value: 'large', label: 'מרפסת גדולה' },
                      ]}
                      onChange={v => set('balconyCurrent', v)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#5a5a6e] mb-2 font-medium">מה אתה רוצה?</p>
                    <RadioGroup
                      name="balcDesired"
                      value={form.balconyDesired}
                      options={[
                        { value: 'none', label: 'לא צריך' },
                        { value: 'regular', label: 'מרפסת רגילה' },
                        { value: 'sukkah', label: 'מרפסת סוכה' },
                        { value: 'large', label: 'מרפסת גדולה' },
                      ]}
                      onChange={v => set('balconyDesired', v)}
                    />
                  </div>
                </div>
              </Section>

              <Section title="גינה / גג" icon="🌳">
                <RadioGroup
                  name="gardenRoof"
                  value={form.gardenRoofPreference}
                  options={[
                    { value: 'garden', label: 'גינה פרטית' },
                    { value: 'roof', label: 'גג פרטי' },
                    { value: 'any', label: 'לא משנה' },
                  ]}
                  onChange={v => set('gardenRoofPreference', v)}
                />
              </Section>
            </div>
          )}

          {/* ─── Step 5: Building Prefs & Priorities ───── */}
          {step === 5 && (
            <div className="space-y-5">
              <Section title="העדפות לבניין" icon="🏢">
                <CheckboxGroup
                  selected={form.buildingPreferences}
                  options={BUILDING_PREFS}
                  onChange={v => set('buildingPreferences', v)}
                />
                {form.buildingPreferences.includes('other') && (
                  <input type="text" value={form.buildingPreferencesOther} onChange={e => set('buildingPreferencesOther', e.target.value)}
                    placeholder="פרט..." className="sc-input w-full mt-2" />
                )}
              </Section>

              <Section title="עדיפות כללית (בחר עד 3)" icon="⚖️">
                <CheckboxGroup
                  selected={form.topPriorities}
                  options={PRIORITIES}
                  onChange={v => set('topPriorities', v)}
                  max={3}
                />
                {form.topPriorities.includes('other') && (
                  <input type="text" value={form.topPrioritiesOther} onChange={e => set('topPrioritiesOther', e.target.value)}
                    placeholder="פרט..." className="sc-input w-full mt-2" />
                )}
                {form.topPriorities.length >= 3 && (
                  <p className="text-xs text-[#8b6f47] mt-2">בחרת 3 עדיפויות — המקסימום</p>
                )}
              </Section>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="sc-btn-secondary flex-1 py-3">
                הקודם
              </button>
            )}
            {step < steps.length - 1 && (
              <button onClick={() => { handleSave(); setStep(s => s + 1) }} className="sc-btn-primary flex-1 py-3">
                הבא
              </button>
            )}
            {step === steps.length - 1 && (
              <button
                onClick={handleSubmitAndAnalyze}
                disabled={save.isPending || analyze.isPending}
                className="sc-btn-primary flex-1 py-3 disabled:opacity-50"
              >
                {save.isPending ? 'שומר...' : analyze.isPending ? 'מנתח...' : '📊 שלח וקבל ניתוח'}
              </button>
            )}
          </div>

          {/* Save Draft */}
          {step < steps.length - 1 && (
            <button onClick={() => handleSave()} disabled={save.isPending}
              className="w-full mt-2 text-sm text-[#3b6b9c] hover:underline disabled:opacity-50">
              {save.isPending ? 'שומר...' : 'שמור טיוטה'}
            </button>
          )}
        </div>

        {/* ─── AI Analysis Result ──────────────────────── */}
        {analysis && (
          <div className="sc-card p-6 mt-6 border-2 border-[#3b6b9c]/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#3b6b9c] flex items-center justify-center text-xl">🤖</div>
              <div>
                <h3 className="text-lg font-bold text-[#1e3a5f]">ניתוח AI</h3>
                <p className="text-xs text-[#5a5a6e]">ניתוח אוטומטי של הציפיות שלך</p>
              </div>
              {analysis.matchScore != null && (
                <div className={`mr-auto px-4 py-2 rounded-xl text-lg font-bold ${
                  analysis.matchScore >= 7 ? 'bg-green-100 text-green-700' :
                  analysis.matchScore >= 4 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {analysis.matchScore}/10
                </div>
              )}
            </div>

            {analysis.raw ? (
              <p className="text-sm text-[#212121] whitespace-pre-wrap">{analysis.raw}</p>
            ) : (
              <div className="space-y-4">
                {analysis.summary && (
                  <div>
                    <h4 className="text-sm font-bold text-[#1e3a5f] mb-1">סיכום ציפיות</h4>
                    <p className="text-sm text-[#212121]">{analysis.summary}</p>
                  </div>
                )}

                {analysis.guaranteedRights && analysis.guaranteedRights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-green-700 mb-1">זכויות מובטחות</h4>
                    <ul className="space-y-1">
                      {analysis.guaranteedRights.map((r, i) => (
                        <li key={i} className="text-sm text-[#212121] flex gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.pointsToCheck && analysis.pointsToCheck.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#8b6f47] mb-1">נקודות לבירור</h4>
                    <ul className="space-y-1">
                      {analysis.pointsToCheck.map((p, i) => (
                        <li key={i} className="text-sm text-[#212121] flex gap-2">
                          <span className="text-[#8b6f47] flex-shrink-0">!</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#3b6b9c] mb-1">המלצות</h4>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-[#212121] flex gap-2">
                          <span className="text-[#3b6b9c] flex-shrink-0">*</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.matchExplanation && (
                  <div className="bg-[#f8f9fa] rounded-xl p-3">
                    <p className="text-sm text-[#5a5a6e]">{analysis.matchExplanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {analyze.isPending && (
          <div className="sc-card p-6 mt-6 flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
            <p className="text-sm text-[#5a5a6e]">המערכת מנתחת את הציפיות שלך...</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
