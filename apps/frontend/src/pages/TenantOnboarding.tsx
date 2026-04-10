import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  apartmentsInBuilding: string
  specialRequests: string[]
  specialRequestsNotes: string
  apartmentExtras: string[]
  apartmentExtrasNotes: string
  hasSpecialAdvantage: boolean | null
}

const STEPS = [
  { id: 1, title: 'פרטים אישיים', icon: '👤' },
  { id: 2, title: 'כתובת הדירה', icon: '🏠' },
  { id: 3, title: 'פרטי הדירה', icon: '📋' },
  { id: 4, title: 'נסח טאבו', icon: '📄' },
  { id: 5, title: 'ציפיות לדירה חדשה', icon: '✨' },
  { id: 6, title: 'חריגות והצמדות', icon: '📎' },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all ${
              current > s.id ? 'bg-[#4a8c5c] text-white' :
              current === s.id ? 'bg-[#3b6b9c] text-white shadow-[0_0_0_4px_rgba(59,107,156,0.2)]' :
              'bg-sc-border text-[#5a5a6e]'
            }`}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${
              current === s.id ? 'text-[#3b6b9c] font-semibold' : 'text-[#5a5a6e]'
            }`}>
              {s.title}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-0.5 mx-0.5 mb-5 flex-shrink-0 transition-all ${
              current > s.id + 1 ? 'bg-[#4a8c5c]' : current > s.id ? 'bg-[#3b6b9c]' : 'bg-sc-border'
            }`} />
          )}
        </div>
      ))}
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
    isOwner: true, moveInYear: '', apartmentsInBuilding: '',
    specialRequests: [], specialRequestsNotes: '',
    apartmentExtras: [], apartmentExtrasNotes: '',
    hasSpecialAdvantage: null,
  })

  const update = (field: keyof FormData, value: FormData[keyof FormData]) =>
    setForm(p => ({ ...p, [field]: value }))

  const [tabuFile, setTabuFile] = useState<File | null>(null)
  const [tabuUploading, setTabuUploading] = useState(false)
  const [tabuUrl, setTabuUrl] = useState<string | null>(null)
  const [ownershipDocs, setOwnershipDocs] = useState<Array<{ file: File; type: string; name: string }>>([])


  const uploadTabu = trpc.tenant.uploadTabu.useMutation()

  const handleTabuDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setTabuFile(file)
  }, [])

  const handleTabuSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') setTabuFile(file)
  }, [])

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
    if (!form.apartmentsInBuilding || parseInt(form.apartmentsInBuilding) < 2) return 'יש להזין מספר דירות בבניין (מינימום 2)'
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
    if (step === 1) { const err = validateStep1(); if (err) { setError(err); return } }
    if (step === 2) { const err = validateStep2(); if (err) { setError(err); return } }
    if (step === 3) { const err = validateStep3(); if (err) { setError(err); return } }
    // Step 4 (tabu) is optional — no validation needed

    if (step < 6) { setStep(s => s + 1); return }

    // Final submit
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
      apartmentsInBuilding: form.apartmentsInBuilding ? parseInt(form.apartmentsInBuilding) : undefined,
      specialRequests: form.specialRequests,
      specialRequestsNotes: form.specialRequestsNotes || undefined,
      apartmentExtras: form.apartmentExtras,
      apartmentExtrasNotes: form.apartmentExtrasNotes || undefined,
      hasSpecialAdvantage: form.hasSpecialAdvantage ?? false,
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
            </div>
          )}

          {/* ─── Step 3 - Apartment details ─── */}
          {step === 3 && (
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
              <div className="flex gap-2.5">
                {['owner','renter'].map(type => (
                  <button key={type} onClick={() => update('isOwner', type === 'owner')}
                    className={`flex-1 py-2.5 rounded-[10px] border-2 font-semibold text-sm cursor-pointer transition-colors ${
                      (form.isOwner ? 'owner' : 'renter') === type
                        ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                        : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
                    }`}>
                    {type === 'owner' ? '🏠 בעל דירה' : '🔑 שוכר'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 4 - Ownership Documents ─── */}
          {step === 4 && (
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
                  {tabuFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">✅</span>
                      <p className="text-sm font-semibold text-[#212121]">{tabuFile.name}</p>
                      <p className="text-xs text-[#5a5a6e]">{(tabuFile.size / 1024).toFixed(0)} KB</p>
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
                        input.onchange = () => {
                          const file = input.files?.[0]
                          if (file) {
                            setOwnershipDocs(prev => [...prev, { file, type: docType.key, name: docType.label }])
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

          {/* ─── Step 5 - Special Requests ─── */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-[#212121] mb-1">✨ דרישות לדירה החדשה</h2>
                <p className="text-[13px] text-[#5a5a6e] mb-4">
                  סמן מה חשוב לך במיוחד בדירה החדשה — המידע יועבר לשמאי ולאדריכל
                </p>
              </div>

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

          {/* ─── Step 6 - Apartment Extras ─── */}
          {step === 6 && (
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
              {saveProfile.isPending ? 'שומר...' : step === 6 ? '✓ סיום' : step >= 4 ? 'המשך ←' : 'המשך ←'}
            </button>
          </div>

          {step >= 4 && (
            <button
              onClick={() => step === 6 ? handleNext() : setStep(s => s + 1)}
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
