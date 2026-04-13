import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import PageLayout from '../components/PageLayout'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

// ── Special Requests (ציפיות דירה חדשה) ──────────────────
const SPECIAL_REQUESTS_OPTIONS = [
  { key: 'balcony', label: '🌿 מרפסת' },
  { key: 'sukkah_balcony', label: '🕍 מרפסת סוכה' },
  { key: 'two_sides', label: '🌬️ שני כיווני אוויר' },
  { key: 'parking', label: '🚗 חניה' },
  { key: 'storage', label: '📦 מחסן' },
  { key: 'specific_floor', label: '🏢 קומה מסוימת' },
  { key: 'near_elevator', label: '🛗 קרבה למעלית' },
  { key: 'large_balcony', label: '🌞 מרפסת גדולה' },
  { key: 'corner_apt', label: '🔲 דירה פינתית' },
  { key: 'accessible', label: '♿ נגישות לנכים' },
  { key: 'other', label: '✏️ אחר' },
]

// ── Apartment Extras (חריגות והצמדות) ───────────────────
const BUILDING_STAGE_OPTIONS = [
  { key: 'just_starting', label: '🏁 רק עכשיו מתחילים' },
  { key: 'chose_representatives', label: '👥 כבר בחרנו נציגות' },
  { key: 'signed_lawyer', label: '⚖️ כבר חתמנו עם עו"ד / גורם מלווה' },
  { key: 'signed_developer', label: '🏗️ כבר חתמנו עם יזם' },
]

const APARTMENT_EXTRAS_OPTIONS = [
  { key: 'closed_balcony', label: '🪟 סגירת מרפסת' },
  { key: 'expansion', label: '📐 הרחבת דירה' },
  { key: 'roof_use', label: '🏠 שימוש בגג' },
  { key: 'yard_attachment', label: '🌳 הצמדת חצר' },
  { key: 'extra_storage', label: '📦 מחסן נוסף' },
  { key: 'room_expansion', label: '🔧 הרחבת חדר' },
  { key: 'shared_garden', label: '🌺 שימוש בגינה משותפת' },
  { key: 'extra_parking', label: '🚗 שימוש בחניה נוספת' },
  { key: 'sukkah_balcony', label: '🕍 מרפסת סוכה' },
  { key: 'large_balcony', label: '🌞 מרפסת גדולה מהרגיל' },
  { key: 'private_space', label: '🔒 שטח נוסף בשימוש פרטי' },
  { key: 'other', label: '✏️ אחר' },
]

const OWNERSHIP_DOC_TYPES = [
  { key: 'tabu_extract', label: '📜 נסח טאבו', desc: 'נסח רשם המקרקעין' },
  { key: 'purchase_contract', label: '📝 חוזה רכישה / מכר', desc: 'חוזה קניית הדירה' },
  { key: 'ownership_certificate', label: '🏛️ אישור בעלות', desc: 'אישור מרשם המקרקעין' },
  { key: 'inheritance_docs', label: '📋 מסמכי ירושה', desc: 'צו ירושה או צוואה' },
  { key: 'power_of_attorney_doc', label: '⚖️ מסמכי ייפוי כוח', desc: 'ייפוי כוח נוטריוני' },
  { key: 'other', label: '📎 מסמך אחר', desc: 'כל מסמך רלוונטי לנכס' },
]

// ── Property Relation options (סעיף 4) ───────────────────
const PROPERTY_RELATION_OPTIONS = [
  { key: 'owner', label: '🏠 בעלים', desc: 'הנכס רשום על שמך' },
  { key: 'renter', label: '🔑 שוכר', desc: 'שוכר את הנכס' },
  { key: 'heir', label: '📋 יורש', desc: 'ירשת את הנכס' },
  { key: 'power_of_attorney', label: '⚖️ מיופה כוח', desc: 'פועל בשם הבעלים' },
] as const

// ── Declaration texts (סעיף 10) ─────────────────────────
const DECLARATIONS = [
  'אני מצהיר שכל הפרטים שהוזנו נכונים ומדויקים',
  'אני מבין שהמערכת אינה מבצעת בדיקה משפטית לבעלות',
  'האחריות על המידע חלה עליי בלבד',
  'אני מאשר את תנאי השימוש במערכת',
]

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
  ownershipType: 'sole' | 'partial' | 'renter'
  ownershipPercentage: string
  moveInYear: string
  apartmentsInBuilding: string
  tenantsInBuilding: string
  specialRequests: string[]
  specialRequestsNotes: string
  buildingStage: string
  apartmentExtras: string[]
  apartmentExtrasNotes: string
  hasSpecialAdvantage: boolean | null
  // Section 3 - Living Status
  isResiding: boolean | null
  residingStatus: 'renter' | 'family_member' | 'empty' | ''
  // Section 4 - Property Relation
  propertyRelation: 'owner' | 'renter' | 'heir' | 'power_of_attorney' | ''
  // Section 5 - Co-owners
  coOwnersCount: string
  partners: Array<{ fullName: string; phone: string }>
  // Section 8 - Companion
  companionName: string
  companionPhone: string
  // Section 10 - Declarations
  declarations: boolean[]
}

const STEPS = [
  { id: 1, title: 'פרטים אישיים', icon: '👤' },
  { id: 2, title: 'כתובת הדירה', icon: '🏠' },
  { id: 3, title: 'פרטי מגורים', icon: '🏘️' },
  { id: 4, title: 'תפקיד בנכס', icon: '🔑' },
  { id: 5, title: 'פרטי הדירה', icon: '📋' },
  { id: 6, title: 'נסח טאבו', icon: '📄' },
  { id: 7, title: 'ציפיות לדירה חדשה', icon: '✨' },
  { id: 8, title: 'חריגות והצמדות', icon: '📎' },
  { id: 9, title: 'איש קשר', icon: '👨‍👩‍👦' },
  { id: 10, title: 'הצהרות', icon: '📝' },
  { id: 11, title: 'סיכום', icon: '✅' },
]

function StepBar({ current }: { current: number }) {
  const currentStep = STEPS.find(s => s.id === current)
  const progress = ((current - 1) / (STEPS.length - 1)) * 100
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[15px] font-bold text-[#212121]">
          {currentStep?.icon} {currentStep?.title}
        </span>
        <span className="text-[13px] font-semibold text-[#3b6b9c]">
          שלב {current} מתוך {STEPS.length}
        </span>
      </div>
      <div className="w-full h-2.5 bg-[#eeeeee] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-[#3b6b9c] to-[#4a8c5c] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#5a5a6e]">
          {current > 1 ? `✓ ${current - 1} שלבים הושלמו` : 'התחלה'}
        </span>
        <span className="text-[10px] text-[#5a5a6e]">
          {STEPS.length - current > 0 ? `${STEPS.length - current} שלבים נותרו` : 'סיום!'}
        </span>
      </div>
    </div>
  )
}

// ── Multi-select checkbox group ───────────────────────────
function CheckboxGroup({ options, selected, onChange }: {
  options: { key: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => toggle(opt.key)}
          className={`p-2.5 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-1.5 ${
            selected.includes(opt.key)
              ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c] font-semibold'
              : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
          }`}
        >
          <span className={`w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center text-[11px] ${
            selected.includes(opt.key)
              ? 'border-[#3b6b9c] bg-[#3b6b9c] text-white'
              : 'border-[#eeeeee] bg-white'
          }`}>
            {selected.includes(opt.key) ? '✓' : ''}
          </span>
          {opt.label}
        </button>
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
    isOwner: true, ownershipType: 'sole', ownershipPercentage: '', moveInYear: '', apartmentsInBuilding: '', tenantsInBuilding: '',
    specialRequests: [], specialRequestsNotes: '',
    buildingStage: '',
    apartmentExtras: [], apartmentExtrasNotes: '',
    hasSpecialAdvantage: null,
    // Section 3
    isResiding: null, residingStatus: '',
    // Section 4
    propertyRelation: '',
    // Section 5
    coOwnersCount: '', partners: [],
    // Section 8
    companionName: '', companionPhone: '',
    // Section 10
    declarations: [false, false, false, false],
  })

  const update = (field: keyof FormData, value: FormData[keyof FormData]) =>
    setForm(p => ({ ...p, [field]: value }))

  const [tabuFile, setTabuFile] = useState<File | null>(null)
  const [tabuUploading, setTabuUploading] = useState(false)
  const [tabuUrl, setTabuUrl] = useState<string | null>(null)
  const [tabuError, setTabuError] = useState('')
  const [ownershipDocs, setOwnershipDocs] = useState<Array<{ file: File; type: string; name: string; url?: string }>>([])

  const uploadTabu = trpc.tenant.uploadTabu.useMutation()

  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    const token = localStorage.getItem('sb-token')
    if (!token) throw new Error('אינך מחובר')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
    const storagePath = `${folder}/${Date.now()}-${safeName}`
    const uploadRes = await fetch(`/api/upload?path=${encodeURIComponent(storagePath)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}))
      throw new Error(errJson.error || `שגיאה ${uploadRes.status}`)
    }
    return `https://supabase.byclick.co.il/storage/v1/object/public/documents/${storagePath}`
  }

  const handleTabuDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || file.type !== 'application/pdf') { setTabuError('יש להעלות קובץ PDF בלבד'); return }
    setTabuFile(file)
    setTabuUploading(true)
    setTabuError('')
    try {
      const url = await uploadFileToStorage(file, 'tabu')
      setTabuUrl(url)
      await uploadTabu.mutateAsync({ fileUrl: url })
    } catch (err) {
      setTabuError(err instanceof Error ? err.message : 'שגיאה בהעלאה')
      setTabuFile(null)
    } finally {
      setTabuUploading(false)
    }
  }, [])

  const handleTabuSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') { setTabuError('יש להעלות קובץ PDF בלבד'); return }
    setTabuFile(file)
    setTabuUploading(true)
    setTabuError('')
    try {
      const url = await uploadFileToStorage(file, 'tabu')
      setTabuUrl(url)
      await uploadTabu.mutateAsync({ fileUrl: url })
    } catch (err) {
      setTabuError(err instanceof Error ? err.message : 'שגיאה בהעלאה')
      setTabuFile(null)
    } finally {
      setTabuUploading(false)
    }
  }, [])

  const saveProfile = trpc.tenant.saveProfile.useMutation({
    onSuccess: () => { toast.success('הפרופיל נשמר בהצלחה! 🎉'); navigate('/dashboard') },
    onError: (e) => { setError(e.message || 'שגיאה בשמירה'); toast.error('שגיאה בשמירת הפרופיל') },
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
    if (!form.apartmentsInBuilding || parseInt(form.apartmentsInBuilding) < 2) return 'יש להזין מספר דירות בבניין (מינימום 2)'
    return null
  }
  const validateStep3 = () => {
    if (form.isResiding === null) return 'יש לבחור האם אתה מתגורר בדירה'
    if (form.isResiding === false && !form.residingStatus) return 'יש לבחור מי מתגורר בדירה'
    return null
  }
  const validateStep4 = () => {
    if (!form.propertyRelation) return 'יש לבחור את הקשר שלך לנכס'
    return null
  }
  const validateStep5 = () => {
    if (!form.floor) return 'קומה נדרשת'
    if (!form.apartmentNumber) return 'מספר דירה נדרש'
    if (!form.apartmentSqm) return 'גודל דירה נדרש'
    return null
  }
  const validateStep10 = () => {
    if (form.declarations.some(d => !d)) return 'יש לאשר את כל ההצהרות כדי להמשיך'
    return null
  }

  const handleNext = () => {
    setError('')
    if (step === 1) { const err = validateStep1(); if (err) { setError(err); return } }
    if (step === 2) { const err = validateStep2(); if (err) { setError(err); return } }
    if (step === 3) { const err = validateStep3(); if (err) { setError(err); return } }
    if (step === 4) { const err = validateStep4(); if (err) { setError(err); return } }
    if (step === 5) { const err = validateStep5(); if (err) { setError(err); return } }
    if (step === 10) { const err = validateStep10(); if (err) { setError(err); return } }

    if (step < 11) { setStep(s => s + 1); return }

    // Final submit from summary step
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
      ownershipType: form.ownershipType,
      ownershipPercentage: form.ownershipType === 'partial' && form.ownershipPercentage ? parseInt(form.ownershipPercentage) : undefined,
      moveInYear: form.moveInYear ? parseInt(form.moveInYear) : undefined,
      apartmentsInBuilding: form.apartmentsInBuilding ? parseInt(form.apartmentsInBuilding) : undefined,
      tenantsInBuilding: form.tenantsInBuilding ? parseInt(form.tenantsInBuilding) : undefined,
      specialRequests: form.specialRequests,
      specialRequestsNotes: form.specialRequestsNotes || undefined,
      apartmentExtras: form.apartmentExtras,
      apartmentExtrasNotes: form.apartmentExtrasNotes || undefined,
      hasSpecialAdvantage: form.hasSpecialAdvantage ?? false,
      // New fields
      isResiding: form.isResiding ?? true,
      residingStatus: form.isResiding === false && form.residingStatus ? form.residingStatus as 'renter' | 'family_member' | 'empty' : undefined,
      propertyRelation: form.propertyRelation ? form.propertyRelation as 'owner' | 'renter' | 'heir' | 'power_of_attorney' : undefined,
      coOwnersCount: form.ownershipType === 'partial' && form.coOwnersCount ? parseInt(form.coOwnersCount) : undefined,
      declarationsAccepted: form.declarations.every(Boolean),
    })
  }

  return (
    <PageLayout>
      
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#212121] mb-1">השלמת פרופיל דייר</h1>
          <p className="text-[#5a5a6e] text-sm">מלא את הפרטים הנדרשים כדי להשתמש בכל הפיצ׳רים</p>
        </div>

        <div className="sc-card p-8">
          <StepBar current={step} />

          {/* ─── Step 1 - Personal ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">👤 פרטים אישיים</h2>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">תעודת זהות *</label>
                <input className="sc-input" placeholder="9 ספרות" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">טלפון נייד *</label>
                <input className="sc-input" placeholder="05XXXXXXXX" value={form.phone} dir="ltr"
                  onChange={e => update('phone', e.target.value)} />
              </div>
            </div>
          )}

          {/* ─── Step 2 - Address ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">🏠 כתובת הדירה</h2>
              <AddressPicker value={address} onChange={setAddress} />
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">כמה דירות יש בבניין? *</label>
                <input className="sc-input" placeholder="לדוג׳ 24" type="number" min="2" value={form.apartmentsInBuilding}
                  onChange={e => update('apartmentsInBuilding', e.target.value)} />
                <p className="text-[11px] text-[#5a5a6e] mt-1">מידע זה יסייע בארגון הדיירים</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">כמה דיירים יש בבניין?</label>
                <input className="sc-input" placeholder="לדוג׳ 48" type="number" min="1" value={form.tenantsInBuilding}
                  onChange={e => update('tenantsInBuilding', e.target.value)} />
                <p className="text-[11px] text-[#5a5a6e] mt-1">מספר הדיירים המתגוררים בפועל בבניין</p>
              </div>
            </div>
          )}

          {/* ─── Step 3 - Living Status (סעיף 3) ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">🏘️ פרטי מגורים</h2>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2.5">האם אתה מתגורר בדירה כיום? *</label>
                <div className="flex gap-2.5">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => {
                      update('isResiding', v)
                      if (v) update('residingStatus', '')
                    }}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[15px] cursor-pointer transition-colors ${
                        form.isResiding === v
                          ? (v ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]')
                          : 'border-[#eeeeee] bg-white text-[#212121]'
                      }`}>
                      {v ? '✅ כן' : '❌ לא'}
                    </button>
                  ))}
                </div>
              </div>

              {form.isResiding === false && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-2.5">מי מתגורר בדירה? *</label>
                  <div className="flex flex-col gap-2">
                    {([
                      { key: 'renter', label: '🔑 משכיר (השכרה)', desc: 'הדירה מושכרת לאדם אחר' },
                      { key: 'family_member', label: '👨‍👩‍👧 קרוב משפחה', desc: 'בן משפחה מתגורר בדירה' },
                      { key: 'empty', label: '🏚️ הדירה ריקה', desc: 'אף אחד לא מתגורר בדירה' },
                    ] as const).map(opt => (
                      <button key={opt.key} onClick={() => update('residingStatus', opt.key)}
                        className={`p-3 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-2 ${
                          form.residingStatus === opt.key
                            ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c] font-semibold'
                            : 'border-sc-border bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                        }`}>
                        <div>
                          <span className="block font-semibold">{opt.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#ebf1f7] border border-[#3b6b9c]/30 rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0">
                  💡 מידע זה ישמש להתאמת התקשורת והעדכונים שתקבל מהמערכת
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 4 - Property Relation (סעיף 4) ─── */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">🔑 מה הקשר שלך לנכס?</h2>
              <p className="text-[13px] text-[#5a5a6e] mb-2">הבחירה תשפיע על הרשאות, זכויות הצבעה ודרישות מסמכים</p>
              <div className="flex flex-col gap-2">
                {PROPERTY_RELATION_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => {
                    update('propertyRelation', opt.key)
                    update('isOwner', opt.key === 'owner' || opt.key === 'heir')
                    if (opt.key === 'renter') update('ownershipType', 'renter')
                    else if (opt.key === 'owner') update('ownershipType', 'sole')
                  }}
                    className={`p-3.5 rounded-xl border-2 text-right cursor-pointer transition-all ${
                      form.propertyRelation === opt.key
                        ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c]'
                        : 'border-sc-border bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                    }`}>
                    <span className="block font-semibold text-sm">{opt.label}</span>
                    <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>

              <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
                <p className="text-xs text-[#8b6f47] m-0">
                  ⚠️ <strong>שים לב:</strong> הבחירה תקבע את ההרשאות שלך במערכת ואת דרישות המסמכים בשלבים מתקדמים
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 5 - Apartment details ─── */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">📋 פרטי הדירה</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-1">קומה *</label>
                  <input className="sc-input" placeholder="0 = קרקע" type="number" min="0" value={form.floor}
                    onChange={e => update('floor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-1">מספר דירה *</label>
                  <input className="sc-input" placeholder="דירה" value={form.apartmentNumber}
                    onChange={e => update('apartmentNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">גודל הדירה (מ"ר) *</label>
                <input className="sc-input" placeholder="לדוג׳ 85" type="number" min="10" value={form.apartmentSqm}
                  onChange={e => update('apartmentSqm', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">שנת כניסה לדירה</label>
                <select className="sc-input" value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                  <option value="">בחר שנה</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2">סוג בעלות *</label>
                <div className="flex gap-2">
                  {([
                    { key: 'sole', label: '🏠 בעלים יחידי', desc: 'הנכס רשום על שמך בלבד' },
                    { key: 'partial', label: '👥 בעלים חלקי', desc: 'הנכס רשום על מספר בעלים' },
                    { key: 'renter', label: '🔑 שוכר', desc: 'אתה שוכר את הנכס' },
                  ] as const).map(type => (
                    <button key={type.key} onClick={() => {
                      update('ownershipType', type.key)
                      update('isOwner', type.key !== 'renter')
                      if (type.key !== 'partial') update('ownershipPercentage', '')
                    }}
                      className={`flex-1 py-2.5 px-2 rounded-[10px] border-2 text-center cursor-pointer transition-colors ${
                        form.ownershipType === type.key
                          ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                          : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
                      }`}>
                      <span className="block font-semibold text-sm">{type.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.ownershipType === 'partial' && (
                <>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#212121] mb-1">אחוז הבעלות שלך *</label>
                    <div className="flex items-center gap-2">
                      <input className="sc-input flex-1" placeholder="לדוג׳ 50" type="number" min="1" max="99"
                        value={form.ownershipPercentage}
                        onChange={e => update('ownershipPercentage', e.target.value)} />
                      <span className="text-lg font-bold text-[#5a5a6e]">%</span>
                    </div>
                    <p className="text-[11px] text-[#5a5a6e] mt-1">ציין את חלקך מתוך הבעלות הכוללת על הנכס</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#212121] mb-1">מספר בעלי זכויות *</label>
                    <input className="sc-input" placeholder="לדוג׳ 2" type="number" min="2"
                      value={form.coOwnersCount}
                      onChange={e => update('coOwnersCount', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#212121] mb-2">שותפים נוספים</label>
                    {form.partners.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input className="sc-input flex-1" placeholder="שם מלא" value={p.fullName}
                          onChange={e => {
                            const updated = [...form.partners]
                            updated[i] = { ...updated[i], fullName: e.target.value }
                            update('partners', updated)
                          }} />
                        <input className="sc-input flex-1" placeholder="טלפון" dir="ltr" value={p.phone}
                          onChange={e => {
                            const updated = [...form.partners]
                            updated[i] = { ...updated[i], phone: e.target.value }
                            update('partners', updated)
                          }} />
                        <button onClick={() => update('partners', form.partners.filter((_, idx) => idx !== i))}
                          className="text-red-500 text-lg font-bold bg-transparent border-none cursor-pointer px-2">✕</button>
                      </div>
                    ))}
                    <button onClick={() => update('partners', [...form.partners, { fullName: '', phone: '' }])}
                      className="text-[13px] text-[#3b6b9c] font-semibold bg-transparent border-2 border-dashed border-[#3b6b9c]/30 rounded-xl py-2.5 w-full cursor-pointer hover:bg-[#ebf1f7]/30 transition-colors">
                      + הוסף שותף
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 6 - Ownership Documents ─── */}
          {step === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-[#212121] mb-1">📄 העלאת מסמכי בעלות</h2>
                <p className="text-[13px] text-[#5a5a6e] mb-4">
                  מסמכים המעידים על בעלות בנכס. ניתן להעלות נסח טאבו, חוזה רכישה, ומסמכים נוספים.
                </p>
              </div>

              {/* Main Tabu Upload */}
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2">📜 נסח טאבו (מומלץ)</label>
                <div
                  onDrop={handleTabuDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-[#eeeeee] rounded-xl p-6 text-center cursor-pointer hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 transition-colors"
                  onClick={() => document.getElementById('tabu-input')?.click()}
                >
                  <input id="tabu-input" type="file" accept="application/pdf" onChange={handleTabuSelect} className="hidden" />
                  {tabuUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl animate-spin">⏳</span>
                      <p className="text-sm font-semibold text-[#3b6b9c]">מעלה קובץ...</p>
                    </div>
                  ) : tabuFile && tabuUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">✅</span>
                      <p className="text-sm font-semibold text-[#212121]">{tabuFile.name}</p>
                      <p className="text-xs text-[#5a5a6e]">{(tabuFile.size / 1024).toFixed(0)} KB</p>
                      <p className="text-xs text-[#4a8c5c] font-semibold">הועלה בהצלחה!</p>
                      <button
                        onClick={e => { e.stopPropagation(); setTabuFile(null); setTabuUrl(null) }}
                        className="text-xs text-red-500 underline bg-transparent border-none cursor-pointer mt-1"
                      >הסר קובץ</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📄</span>
                      <p className="text-sm font-semibold text-[#212121]">גרור קובץ PDF לכאן</p>
                      <p className="text-xs text-[#5a5a6e]">או לחץ לבחירת קובץ</p>
                      {tabuError && <p className="text-xs text-red-500 font-semibold">{tabuError}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Ownership Documents */}
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2">📎 מסמכים נוספים לבעלות</label>
                <p className="text-[11px] text-[#5a5a6e] mb-3">בחר סוג מסמך להעלאה:</p>
                <div className="grid grid-cols-2 gap-2">
                  {OWNERSHIP_DOC_TYPES.filter(d => d.key !== 'tabu_extract').map(docType => (
                    <button
                      key={docType.key}
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'application/pdf,image/*'
                        input.onchange = async () => {
                          const file = input.files?.[0]
                          if (file) {
                            const tempDoc = { file, type: docType.key, name: docType.label }
                            setOwnershipDocs(prev => [...prev, tempDoc])
                            try {
                              const url = await uploadFileToStorage(file, 'ownership-docs')
                              setOwnershipDocs(prev => prev.map(d => d === tempDoc ? { ...d, url } : d))
                            } catch {
                              setOwnershipDocs(prev => prev.filter(d => d !== tempDoc))
                              setError('שגיאה בהעלאת מסמך: ' + docType.label)
                            }
                          }
                        }
                        input.click()
                      }}
                      className="p-2.5 rounded-xl border-2 border-[#eeeeee] bg-white text-[13px] text-right cursor-pointer transition-all hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 flex flex-col gap-0.5"
                    >
                      <span className="font-semibold text-[#212121]">{docType.label}</span>
                      <span className="text-[10px] text-[#5a5a6e]">{docType.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Uploaded Documents List */}
              {ownershipDocs.length > 0 && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#212121] mb-2">קבצים שהועלו:</label>
                  <div className="flex flex-col gap-2">
                    {ownershipDocs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f9fa] border border-[#eeeeee]">
                        <span className="text-lg flex-shrink-0">✅</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#212121] truncate">{doc.name}</p>
                          <p className="text-[11px] text-[#5a5a6e]">{doc.file.name} · {(doc.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          onClick={() => setOwnershipDocs(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 text-sm font-bold bg-transparent border-none cursor-pointer px-2"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
                <p className="text-xs text-[#8b6f47] m-0">
                  ⏰ <strong>שים לב:</strong> לאחר שעה מההעלאה, נסח הטאבו ננעל ולא ניתן לשנות אותו
                </p>
              </div>

              <div className="bg-[#3b6b9c]/10 border border-[#3b6b9c]/30 rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0">
                  🔒 <strong>סודיות:</strong> מסמכים אלו מסומנים כסודיים — גישה לדייר, מלווה ונציגות מאושרת בלבד
                </p>
              </div>

              <div className="bg-[#ebf1f7] border border-[#3b6b9c]-light rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0">
                  💡 <strong>אופציונלי</strong> — ניתן לדלג ולהעלות מאוחר יותר מהפרופיל שלך
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 7 - Special Requests ─── */}
          {step === 7 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-[#212121] mb-1">✨ דרישות לדירה החדשה</h2>
                <p className="text-[13px] text-[#5a5a6e] mb-4">
                  סמן מה חשוב לך במיוחד בדירה החדשה — המידע יועבר לשמאי ולאדריכל
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2.5">באיזה שלב אתם בבניין?</label>
                <div className="flex flex-col gap-2">
                  {BUILDING_STAGE_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => update('buildingStage', opt.key)}
                      className={`p-3 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-2 ${
                        form.buildingStage === opt.key
                          ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c] font-semibold'
                          : 'border-sc-border bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                      }`}
                    >
                      {form.buildingStage === opt.key && <span>✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-sc-border" />

              <CheckboxGroup
                options={SPECIAL_REQUESTS_OPTIONS}
                selected={form.specialRequests}
                onChange={v => update('specialRequests', v)}
              />

              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">פירוט דרישות נוספות</label>
                <textarea
                  value={form.specialRequestsNotes}
                  onChange={e => update('specialRequestsNotes', e.target.value)}
                  placeholder="לדוג׳ אני זקוק לקומה גבוהה בגלל בעיות ניידות, רוצה מרפסת לכיוון דרום..."
                  rows={3}
                  className="sc-input resize-y"
                />
              </div>

              {form.specialRequests.length > 0 && (
                <div className="bg-[#4a8c5c]/10 border-2 border-sc-success/30 rounded-xl p-3">
                  <p className="text-xs text-[#4a8c5c] font-semibold m-0">
                    ✅ נבחרו {form.specialRequests.length} דרישות — יישמרו בפרופיל שלך
                  </p>
                </div>
              )}

              <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
                <p className="text-xs text-[#8b6f47] m-0">
                  💡 <strong>טיפ:</strong> ניתן לדלג על שלב זה ולעדכן מאוחר יותר מהפרופיל שלך
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 8 - Apartment Extras ─── */}
          {step === 8 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-[#212121] mb-1">📎 חריגות והצמדות בדירה הנוכחית</h2>
                <p className="text-[13px] text-[#5a5a6e] mb-4">
                  האם יש בדירה שלך משהו מיוחד מעבר לדירה הרגילה בבניין? תיעוד זה חשוב להסכם הפינוי
                </p>
              </div>

              {/* שאלת פתיחה */}
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-2.5">האם יש בדירה שלך יתרון מיוחד לעומת שאר הדירות?</label>
                <div className="flex gap-2.5">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => update('hasSpecialAdvantage', v)}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[15px] cursor-pointer transition-colors ${
                        form.hasSpecialAdvantage === v
                          ? (v ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]' : 'border-[#eeeeee] bg-[#f8f9fa] text-[#212121]')
                          : 'border-[#eeeeee] bg-white text-[#212121]'
                      }`}>
                      {v ? '✅ כן' : '❌ לא'}
                    </button>
                  ))}
                </div>
              </div>

              {form.hasSpecialAdvantage === true && (
                <>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#212121] mb-2.5">סמן מה קיים בדירה שלך:</label>
                    <CheckboxGroup
                      options={APARTMENT_EXTRAS_OPTIONS}
                      selected={form.apartmentExtras}
                      onChange={v => update('apartmentExtras', v)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#212121] mb-1">תיאור התוספת או היתרון הקיים</label>
                    <textarea
                      value={form.apartmentExtrasNotes}
                      onChange={e => update('apartmentExtrasNotes', e.target.value)}
                      placeholder="לדוג׳ יש לי מרפסת סוכה של 15 מ״ר שנסגרה ב-2008, יש לי שימוש בחלק מהגג..."
                      rows={3}
                      className="sc-input resize-y"
                    />
                  </div>

                  {form.apartmentExtras.length > 0 && (
                    <div className="bg-[#8b6f47]/10 border-2 border-[#8b6f47]/30 rounded-xl p-3">
                      <p className="text-xs text-[#8b6f47] font-semibold m-0">
                        ⚠️ {form.apartmentExtras.length} חריגות יועברו לשמאי ולאדריכל לבדיקה ותיעוד רשמי
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-[#ebf1f7] border border-[#3b6b9c]-light rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0">
                  📋 <strong>למה זה חשוב?</strong> בפינוי-בינוי, חריגות לא מתועדות עלולות לגרום לאובדן זכויות. תיעוד מראש מגן עליך.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 9 - Companion (סעיף 8) ─── */}
          {step === 9 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">👨‍👩‍👦 הוספת בן משפחה / מלווה</h2>
              <p className="text-[13px] text-[#5a5a6e] mb-2">
                ניתן להוסיף איש קשר שיקבל גישה לצפייה בלבד ועדכונים על הפרויקט
              </p>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">שם מלא</label>
                <input className="sc-input" placeholder="שם מלא של איש הקשר" value={form.companionName}
                  onChange={e => update('companionName', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#212121] mb-1">מספר טלפון</label>
                <input className="sc-input" placeholder="05XXXXXXXX" dir="ltr" value={form.companionPhone}
                  onChange={e => update('companionPhone', e.target.value)} />
              </div>

              {(form.companionName || form.companionPhone) && (
                <div className="bg-[#4a8c5c]/10 border-2 border-sc-success/30 rounded-xl p-3">
                  <p className="text-xs text-[#4a8c5c] font-semibold m-0">
                    📲 איש הקשר יקבל לינק התחברות ב-SMS ויוכל לצפות בעדכונים
                  </p>
                </div>
              )}

              <div className="bg-[#ebf1f7] border border-[#3b6b9c]/30 rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0">
                  🔐 <strong>הרשאות:</strong> איש הקשר יקבל צפייה בלבד וקבלת עדכונים — ללא אפשרות הצבעה או חתימה
                </p>
              </div>

              <div className="bg-[#8b6f47]/10 border border-[#8b6f47]/30 rounded-xl p-3">
                <p className="text-xs text-[#8b6f47] m-0">
                  💡 <strong>אופציונלי</strong> — ניתן לדלג ולהוסיף מאוחר יותר
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 10 - Declarations (סעיף 10) ─── */}
          {step === 10 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#212121] mb-1">📝 הצהרות ואישורים</h2>
              <p className="text-[13px] text-[#5a5a6e] mb-2">
                יש לאשר את כל ההצהרות כדי להשלים את הרישום
              </p>
              <div className="flex flex-col gap-3">
                {DECLARATIONS.map((text, i) => (
                  <button key={i} onClick={() => {
                    const updated = [...form.declarations]
                    updated[i] = !updated[i]
                    update('declarations', updated)
                  }}
                    className={`p-3.5 rounded-xl border-2 text-right cursor-pointer transition-all flex items-start gap-3 ${
                      form.declarations[i]
                        ? 'border-[#4a8c5c] bg-[#4a8c5c]/10'
                        : 'border-[#eeeeee] bg-white hover:border-[#3b6b9c]/40'
                    }`}>
                    <span className={`w-[22px] h-[22px] rounded-md border-2 flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 ${
                      form.declarations[i]
                        ? 'border-[#4a8c5c] bg-[#4a8c5c] text-white'
                        : 'border-[#eeeeee] bg-white'
                    }`}>
                      {form.declarations[i] ? '✓' : ''}
                    </span>
                    <span className={`text-[13px] leading-relaxed ${form.declarations[i] ? 'text-[#212121] font-medium' : 'text-[#5a5a6e]'}`}>
                      {text}
                    </span>
                  </button>
                ))}
              </div>

              {form.declarations.every(Boolean) && (
                <div className="bg-[#4a8c5c]/10 border-2 border-sc-success/30 rounded-xl p-3">
                  <p className="text-xs text-[#4a8c5c] font-semibold m-0 text-center">
                    ✅ כל ההצהרות אושרו — ניתן להמשיך לסיכום
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 11 - Summary ─── */}
          {step === 11 && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-20 h-20 rounded-full bg-[#4a8c5c]/10 flex items-center justify-center">
                <span className="text-4xl">✅</span>
              </div>
              <div className="text-center">
                <h2 className="text-[20px] font-bold text-[#212121] mb-2">הטופס הוגש בהצלחה!</h2>
                <p className="text-[15px] text-[#5a5a6e] leading-relaxed">
                  המערכת מחכה להרשמה של כלל הדיירים בבניין.
                  <br />
                  ברגע שמספיק דיירים יצטרפו, תוכלו להתחיל בתהליך.
                </p>
              </div>

              <div className="w-full bg-[#f8f9fa] rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-[14px] font-bold text-[#212121]">📋 סיכום הפרטים שהוזנו:</h3>
                <div className="flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">ת.ז.</span><span className="font-semibold text-[#212121]">{form.idNumber}</span></div>
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">כתובת</span><span className="font-semibold text-[#212121]">{address.street} {address.buildingNumber}, {address.city}</span></div>
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">דירה</span><span className="font-semibold text-[#212121]">דירה {form.apartmentNumber}, קומה {form.floor}</span></div>
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">גודל</span><span className="font-semibold text-[#212121]">{form.apartmentSqm} מ"ר</span></div>
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">בעלות</span><span className="font-semibold text-[#212121]">{form.ownershipType === 'sole' ? 'בעלים יחידי' : form.ownershipType === 'partial' ? `בעלים חלקי (${form.ownershipPercentage}%)` : 'שוכר'}</span></div>
                  {tabuFile && <div className="flex justify-between"><span className="text-[#5a5a6e]">נסח טאבו</span><span className="font-semibold text-[#4a8c5c]">✓ הועלה</span></div>}
                  {form.buildingStage && <div className="flex justify-between"><span className="text-[#5a5a6e]">שלב הבניין</span><span className="font-semibold text-[#212121]">{BUILDING_STAGE_OPTIONS.find(o => o.key === form.buildingStage)?.label}</span></div>}
                  {form.specialRequests.length > 0 && <div className="flex justify-between"><span className="text-[#5a5a6e]">דרישות לדירה חדשה</span><span className="font-semibold text-[#212121]">{form.specialRequests.length} נבחרו</span></div>}
                  {form.apartmentExtras.length > 0 && <div className="flex justify-between"><span className="text-[#5a5a6e]">חריגות/הצמדות</span><span className="font-semibold text-[#212121]">{form.apartmentExtras.length} דווחו</span></div>}
                  {form.isResiding !== null && <div className="flex justify-between"><span className="text-[#5a5a6e]">מתגורר בדירה</span><span className="font-semibold text-[#212121]">{form.isResiding ? 'כן' : 'לא'}</span></div>}
                  {form.isResiding === false && form.residingStatus && <div className="flex justify-between"><span className="text-[#5a5a6e]">סטטוס מגורים</span><span className="font-semibold text-[#212121]">{form.residingStatus === 'renter' ? 'משכיר' : form.residingStatus === 'family_member' ? 'קרוב משפחה' : 'ריקה'}</span></div>}
                  {form.propertyRelation && <div className="flex justify-between"><span className="text-[#5a5a6e]">קשר לנכס</span><span className="font-semibold text-[#212121]">{PROPERTY_RELATION_OPTIONS.find(o => o.key === form.propertyRelation)?.label}</span></div>}
                  {form.partners.length > 0 && <div className="flex justify-between"><span className="text-[#5a5a6e]">שותפים</span><span className="font-semibold text-[#212121]">{form.partners.length} שותפים</span></div>}
                  {form.companionName && <div className="flex justify-between"><span className="text-[#5a5a6e]">איש קשר</span><span className="font-semibold text-[#212121]">{form.companionName}</span></div>}
                  <div className="flex justify-between"><span className="text-[#5a5a6e]">הצהרות</span><span className="font-semibold text-[#4a8c5c]">✓ אושרו</span></div>
                </div>
              </div>

              <div className="w-full bg-[#3b6b9c]/10 border border-[#3b6b9c]/30 rounded-xl p-3">
                <p className="text-xs text-[#3b6b9c] m-0 text-center">
                  📬 תקבל עדכונים על התקדמות הפרויקט בזמן אמת
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-2.5 bg-red-500/10 border border-sc-error/30 rounded-[10px] text-red-500 text-[13px]">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 mt-6">
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }}
                className="sc-btn-secondary flex-1 text-[15px]">
                ← חזרה
              </button>
            )}
            <button onClick={handleNext} disabled={saveProfile.isPending}
              className="sc-btn-primary flex-[2] text-[15px] disabled:opacity-70">
              {saveProfile.isPending ? 'שומר...' : step === 11 ? '✓ שמירה וסיום' : step === 10 ? 'לסיכום ←' : 'המשך ←'}
            </button>
          </div>

          {((step >= 6 && step <= 9)) && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="w-full mt-2.5 py-2.5 bg-transparent border-none text-[#5a5a6e] text-[13px] cursor-pointer underline"
            >
              דלג על שלב זה
            </button>
          )}
        </div>

        <p className="text-center mt-4 text-xs text-[#5a5a6e]">
          ניתן לעדכן פרטים אלו בכל עת מהפרופיל שלך
        </p>
      </div>
    </PageLayout>
  )
}
