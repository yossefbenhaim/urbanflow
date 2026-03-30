import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import Navbar from '../components/Navbar'

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
  { id: 4, title: 'ציפיות לדירה חדשה', icon: '✨' },
  { id: 5, title: 'חריגות והצמדות', icon: '📎' },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all ${
              current > s.id ? 'bg-sc-success text-white' :
              current === s.id ? 'bg-sc-blue text-white shadow-[0_0_0_4px_rgba(59,107,156,0.2)]' :
              'bg-sc-gray-light text-sc-gray'
            }`}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${
              current === s.id ? 'text-sc-blue font-semibold' : 'text-sc-gray'
            }`}>
              {s.title}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-0.5 mx-0.5 mb-5 flex-shrink-0 transition-all ${
              current > s.id + 1 ? 'bg-sc-success' : current > s.id ? 'bg-sc-blue' : 'bg-sc-gray-light'
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
              ? 'border-sc-blue bg-sc-blue-pale text-sc-blue font-semibold'
              : 'border-sc-gray-light bg-white text-sc-gray'
          }`}
        >
          <span className={`w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center text-[11px] ${
            selected.includes(opt.key)
              ? 'border-sc-blue bg-sc-blue text-white'
              : 'border-sc-gray-light bg-white'
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

  const update = (field: keyof FormData, value: any) =>
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

    if (step < 5) { setStep(s => s + 1); return }

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
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-sc-dark mb-1">השלמת פרופיל דייר</h1>
          <p className="text-sc-gray text-sm">מלא את הפרטים הנדרשים כדי להשתמש בכל הפיצ׳רים</p>
        </div>

        <div className="sc-card p-8">
          <StepBar current={step} />

          {/* ─── Step 1 - Personal ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-sc-dark mb-1">👤 פרטים אישיים</h2>
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">תעודת זהות *</label>
                <input className="sc-input" placeholder="9 ספרות" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">טלפון נייד *</label>
                <input className="sc-input" placeholder="05XXXXXXXX" value={form.phone} dir="ltr"
                  onChange={e => update('phone', e.target.value)} />
              </div>
            </div>
          )}

          {/* ─── Step 2 - Address ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-sc-dark mb-1">🏠 כתובת הדירה</h2>
              <AddressPicker value={address} onChange={setAddress} />
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">כמה דירות יש בבניין? *</label>
                <input className="sc-input" placeholder="לדוג׳ 24" type="number" min="2" value={form.apartmentsInBuilding}
                  onChange={e => update('apartmentsInBuilding', e.target.value)} />
                <p className="text-[11px] text-sc-gray mt-1">מידע זה יסייע בארגון הדיירים</p>
              </div>
            </div>
          )}

          {/* ─── Step 3 - Apartment details ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-sc-dark mb-1">📋 פרטי הדירה</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-sc-dark mb-1">קומה *</label>
                  <input className="sc-input" placeholder="0 = קרקע" type="number" min="0" value={form.floor}
                    onChange={e => update('floor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-sc-dark mb-1">מספר דירה *</label>
                  <input className="sc-input" placeholder="דירה" value={form.apartmentNumber}
                    onChange={e => update('apartmentNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">גודל הדירה (מ"ר) *</label>
                <input className="sc-input" placeholder="לדוג׳ 85" type="number" min="10" value={form.apartmentSqm}
                  onChange={e => update('apartmentSqm', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">שנת כניסה לדירה</label>
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
                        ? 'border-sc-blue bg-sc-blue-pale text-sc-blue'
                        : 'border-sc-gray-light bg-white text-sc-gray'
                    }`}>
                    {type === 'owner' ? '🏠 בעל דירה' : '🔑 שוכר'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 4 - Special Requests ─── */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-sc-dark mb-1">✨ דרישות לדירה החדשה</h2>
                <p className="text-[13px] text-sc-gray mb-4">
                  סמן מה חשוב לך במיוחד בדירה החדשה — המידע יועבר לשמאי ולאדריכל
                </p>
              </div>

              <CheckboxGroup
                options={SPECIAL_REQUESTS_OPTIONS}
                selected={form.specialRequests}
                onChange={v => update('specialRequests', v)}
              />

              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-1">פירוט דרישות נוספות</label>
                <textarea
                  value={form.specialRequestsNotes}
                  onChange={e => update('specialRequestsNotes', e.target.value)}
                  placeholder="לדוג׳ אני זקוק לקומה גבוהה בגלל בעיות ניידות, רוצה מרפסת לכיוון דרום..."
                  rows={3}
                  className="sc-input resize-y"
                />
              </div>

              {form.specialRequests.length > 0 && (
                <div className="bg-sc-success/10 border-2 border-sc-success/30 rounded-xl p-3">
                  <p className="text-xs text-sc-success font-semibold m-0">
                    ✅ נבחרו {form.specialRequests.length} דרישות — יישמרו בפרופיל שלך
                  </p>
                </div>
              )}

              <div className="bg-sc-warning/10 border border-sc-warning/30 rounded-xl p-3">
                <p className="text-xs text-sc-warning m-0">
                  💡 <strong>טיפ:</strong> ניתן לדלג על שלב זה ולעדכן מאוחר יותר מהפרופיל שלך
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 5 - Apartment Extras ─── */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[17px] font-bold text-sc-dark mb-1">📎 חריגות והצמדות בדירה הנוכחית</h2>
                <p className="text-[13px] text-sc-gray mb-4">
                  האם יש בדירה שלך משהו מיוחד מעבר לדירה הרגילה בבניין? תיעוד זה חשוב להסכם הפינוי
                </p>
              </div>

              {/* שאלת פתיחה */}
              <div>
                <label className="block text-[13px] font-semibold text-sc-dark mb-2.5">האם יש בדירה שלך יתרון מיוחד לעומת שאר הדירות?</label>
                <div className="flex gap-2.5">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => update('hasSpecialAdvantage', v)}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[15px] cursor-pointer transition-colors ${
                        form.hasSpecialAdvantage === v
                          ? (v ? 'border-sc-blue bg-sc-blue-pale text-sc-blue' : 'border-sc-gray-light bg-sc-bg text-sc-dark')
                          : 'border-sc-gray-light bg-white text-sc-dark'
                      }`}>
                      {v ? '✅ כן' : '❌ לא'}
                    </button>
                  ))}
                </div>
              </div>

              {form.hasSpecialAdvantage === true && (
                <>
                  <div>
                    <label className="block text-[13px] font-semibold text-sc-dark mb-2.5">סמן מה קיים בדירה שלך:</label>
                    <CheckboxGroup
                      options={APARTMENT_EXTRAS_OPTIONS}
                      selected={form.apartmentExtras}
                      onChange={v => update('apartmentExtras', v)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-sc-dark mb-1">תיאור התוספת או היתרון הקיים</label>
                    <textarea
                      value={form.apartmentExtrasNotes}
                      onChange={e => update('apartmentExtrasNotes', e.target.value)}
                      placeholder="לדוג׳ יש לי מרפסת סוכה של 15 מ״ר שנסגרה ב-2008, יש לי שימוש בחלק מהגג..."
                      rows={3}
                      className="sc-input resize-y"
                    />
                  </div>

                  {form.apartmentExtras.length > 0 && (
                    <div className="bg-sc-warning/10 border-2 border-sc-warning/30 rounded-xl p-3">
                      <p className="text-xs text-sc-warning font-semibold m-0">
                        ⚠️ {form.apartmentExtras.length} חריגות יועברו לשמאי ולאדריכל לבדיקה ותיעוד רשמי
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-sc-blue-pale border border-sc-blue-light rounded-xl p-3">
                <p className="text-xs text-sc-blue m-0">
                  📋 <strong>למה זה חשוב?</strong> בפינוי-בינוי, חריגות לא מתועדות עלולות לגרום לאובדן זכויות. תיעוד מראש מגן עליך.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-2.5 bg-sc-error/10 border border-sc-error/30 rounded-[10px] text-sc-error text-[13px]">
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
              {saveProfile.isPending ? 'שומר...' : step === 5 ? '✓ סיום' : step >= 4 ? 'המשך ←' : 'המשך ←'}
            </button>
          </div>

          {step >= 4 && (
            <button
              onClick={() => step === 5 ? handleNext() : setStep(s => s + 1)}
              className="w-full mt-2.5 py-2.5 bg-transparent border-none text-sc-gray text-[13px] cursor-pointer underline"
            >
              דלג על שלב זה
            </button>
          )}
        </div>

        <p className="text-center mt-4 text-xs text-sc-gray">
          ניתן לעדכן פרטים אלו בכל עת מהפרופיל שלך
        </p>
      </div>
    </div>
  )
}
