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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '32px', overflowX: 'auto' }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              background: current > s.id ? '#22c55e' : current === s.id ? '#2563EB' : '#e2e8f0',
              color: current >= s.id ? '#fff' : '#94a3b8',
              fontWeight: 700, transition: 'all 0.3s',
              boxShadow: current === s.id ? '0 0 0 4px #bfdbfe' : 'none',
            }}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span style={{ fontSize: '10px', color: current === s.id ? '#2563EB' : '#64748b', fontWeight: current === s.id ? 600 : 400, whiteSpace: 'nowrap' }}>
              {s.title}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: '40px', height: '2px', background: current > s.id + 1 ? '#22c55e' : current > s.id ? '#2563EB' : '#e2e8f0', margin: '0 2px 20px', transition: 'all 0.3s', flexShrink: 0 }} />
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => toggle(opt.key)}
          style={{
            padding: '10px 12px', borderRadius: '12px', border: '2px solid',
            borderColor: selected.includes(opt.key) ? '#2563EB' : '#e2e8f0',
            background: selected.includes(opt.key) ? '#eff6ff' : '#fff',
            color: selected.includes(opt.key) ? '#2563EB' : '#4b5563',
            fontWeight: selected.includes(opt.key) ? 600 : 400,
            fontSize: '13px', cursor: 'pointer', textAlign: 'right',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <span style={{
            width: '18px', height: '18px', borderRadius: '5px', border: '2px solid',
            borderColor: selected.includes(opt.key) ? '#2563EB' : '#d1d5db',
            background: selected.includes(opt.key) ? '#2563EB' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '11px', color: '#fff',
          }}>
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

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const, color: '#1e293b',
  }
  const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' } as const

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }} dir="rtl">
      <Navbar />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>השלמת פרופיל דייר</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>מלא את הפרטים הנדרשים כדי להשתמש בכל הפיצ׳רים</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <StepBar current={step} />

          {/* ─── Step 1 - Personal ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>👤 פרטים אישיים</h2>
              <div>
                <label style={labelStyle}>תעודת זהות *</label>
                <input style={inputStyle} placeholder="9 ספרות" maxLength={9} value={form.idNumber}
                  onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} />
              </div>
              <div>
                <label style={labelStyle}>טלפון נייד *</label>
                <input style={inputStyle} placeholder="05XXXXXXXX" value={form.phone} dir="ltr"
                  onChange={e => update('phone', e.target.value)} />
              </div>
            </div>
          )}

          {/* ─── Step 2 - Address ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>🏠 כתובת הדירה</h2>
              <AddressPicker value={address} onChange={setAddress} />
              <div>
                <label style={labelStyle}>כמה דירות יש בבניין? *</label>
                <input style={inputStyle} placeholder="לדוג׳ 24" type="number" min="2" value={form.apartmentsInBuilding}
                  onChange={e => update('apartmentsInBuilding', e.target.value)} />
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>מידע זה יסייע בארגון הדיירים</p>
              </div>
            </div>
          )}

          {/* ─── Step 3 - Apartment details ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>📋 פרטי הדירה</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>קומה *</label>
                  <input style={inputStyle} placeholder="0 = קרקע" type="number" min="0" value={form.floor}
                    onChange={e => update('floor', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>מספר דירה *</label>
                  <input style={inputStyle} placeholder="דירה" value={form.apartmentNumber}
                    onChange={e => update('apartmentNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>גודל הדירה (מ"ר) *</label>
                <input style={inputStyle} placeholder="לדוג׳ 85" type="number" min="10" value={form.apartmentSqm}
                  onChange={e => update('apartmentSqm', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>שנת כניסה לדירה</label>
                <select style={inputStyle} value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                  <option value="">בחר שנה</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['owner','renter'].map(type => (
                  <button key={type} onClick={() => update('isOwner', type === 'owner')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid',
                      borderColor: (form.isOwner ? 'owner' : 'renter') === type ? '#2563EB' : '#e2e8f0',
                      background: (form.isOwner ? 'owner' : 'renter') === type ? '#eff6ff' : '#fff',
                      color: (form.isOwner ? 'owner' : 'renter') === type ? '#2563EB' : '#64748b',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                    }}>
                    {type === 'owner' ? '🏠 בעל דירה' : '🔑 שוכר'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 4 - Special Requests ─── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>✨ דרישות לדירה החדשה</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                  סמן מה חשוב לך במיוחד בדירה החדשה — המידע יועבר לשמאי ולאדריכל
                </p>
              </div>

              <CheckboxGroup
                options={SPECIAL_REQUESTS_OPTIONS}
                selected={form.specialRequests}
                onChange={v => update('specialRequests', v)}
              />

              <div>
                <label style={labelStyle}>פירוט דרישות נוספות</label>
                <textarea
                  value={form.specialRequestsNotes}
                  onChange={e => update('specialRequestsNotes', e.target.value)}
                  placeholder="לדוג׳ אני זקוק לקומה גבוהה בגלל בעיות ניידות, רוצה מרפסת לכיוון דרום..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {form.specialRequests.length > 0 && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '12px', color: '#15803d', margin: 0, fontWeight: 600 }}>
                    ✅ נבחרו {form.specialRequests.length} דרישות — יישמרו בפרופיל שלך
                  </p>
                </div>
              )}

              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ fontSize: '12px', color: '#854d0e', margin: 0 }}>
                  💡 <strong>טיפ:</strong> ניתן לדלג על שלב זה ולעדכן מאוחר יותר מהפרופיל שלך
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 5 - Apartment Extras ─── */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>📎 חריגות והצמדות בדירה הנוכחית</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                  האם יש בדירה שלך משהו מיוחד מעבר לדירה הרגילה בבניין? תיעוד זה חשוב להסכם הפינוי
                </p>
              </div>

              {/* שאלת פתיחה */}
              <div>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>האם יש בדירה שלך יתרון מיוחד לעומת שאר הדירות?</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => update('hasSpecialAdvantage', v)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid',
                        borderColor: form.hasSpecialAdvantage === v ? (v ? '#2563EB' : '#e2e8f0') : '#e2e8f0',
                        background: form.hasSpecialAdvantage === v ? (v ? '#eff6ff' : '#f8fafc') : '#fff',
                        color: form.hasSpecialAdvantage === v && v ? '#2563EB' : '#374151',
                        fontWeight: 600, fontSize: '15px', cursor: 'pointer',
                      }}>
                      {v ? '✅ כן' : '❌ לא'}
                    </button>
                  ))}
                </div>
              </div>

              {form.hasSpecialAdvantage === true && (
                <>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '10px' }}>סמן מה קיים בדירה שלך:</label>
                    <CheckboxGroup
                      options={APARTMENT_EXTRAS_OPTIONS}
                      selected={form.apartmentExtras}
                      onChange={v => update('apartmentExtras', v)}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>תיאור התוספת או היתרון הקיים</label>
                    <textarea
                      value={form.apartmentExtrasNotes}
                      onChange={e => update('apartmentExtrasNotes', e.target.value)}
                      placeholder="לדוג׳ יש לי מרפסת סוכה של 15 מ״ר שנסגרה ב-2008, יש לי שימוש בחלק מהגג..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  {form.apartmentExtras.length > 0 && (
                    <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: '12px', padding: '12px 14px' }}>
                      <p style={{ fontSize: '12px', color: '#92400e', margin: 0, fontWeight: 600 }}>
                        ⚠️ {form.apartmentExtras.length} חריגות יועברו לשמאי ולאדריכל לבדיקה ותיעוד רשמי
                      </p>
                    </div>
                  )}
                </>
              )}

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ fontSize: '12px', color: '#0369a1', margin: 0 }}>
                  📋 <strong>למה זה חשוב?</strong> בפינוי-בינוי, חריגות לא מתועדות עלולות לגרום לאובדן זכויות. תיעוד מראש מגן עליך.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
                ← חזרה
              </button>
            )}
            <button onClick={handleNext} disabled={saveProfile.isPending}
              style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px', opacity: saveProfile.isPending ? 0.7 : 1 }}>
              {saveProfile.isPending ? 'שומר...' : step === 5 ? '✓ סיום' : step >= 4 ? 'המשך ←' : 'המשך ←'}
            </button>
          </div>

          {step >= 4 && (
            <button
              onClick={() => step === 5 ? handleNext() : setStep(s => s + 1)}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              דלג על שלב זה
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          ניתן לעדכן פרטים אלו בכל עת מהפרופיל שלך
        </p>
      </div>
    </div>
  )
}
