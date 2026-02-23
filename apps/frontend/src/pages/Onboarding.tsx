import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const steps = ['פרטים אישיים', 'פרטי הדירה', 'אימות']

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    fullName: '', idNumber: '', phone: '',
    address: '', unitNumber: '', floor: '', areaSqm: '', rooms: '', isOwner: 'true',
    parking: '', storage: '', otp: ''
  })
  const navigate = useNavigate()

  const update = (field: string, value: string) => setData(p => ({ ...p, [field]: value }))

  const next = () => step < 2 ? setStep(s => s + 1) : navigate('/dashboard')
  const back = () => setStep(s => s - 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((s, i) => (
              <span key={i} className={`text-xs font-medium ${i <= step ? 'text-blue-600' : 'text-gray-400'}`}>{s}</span>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{steps[step]}</h2>
          <p className="text-gray-500 text-sm mb-6">שלב {step + 1} מתוך 3</p>

          {step === 0 && (
            <div className="space-y-4">
              <Field label="שם מלא" value={data.fullName} onChange={v => update('fullName', v)} placeholder="ישראל ישראלי" />
              <Field label="מספר ת"ז" value={data.idNumber} onChange={v => update('idNumber', v)} placeholder="123456789" type="number" />
              <Field label="טלפון נייד" value={data.phone} onChange={v => update('phone', v)} placeholder="050-0000000" type="tel" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="כתובת" value={data.address} onChange={v => update('address', v)} placeholder="רחוב הרצל 15, תל אביב" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="מספר דירה" value={data.unitNumber} onChange={v => update('unitNumber', v)} placeholder="5" />
                <Field label="קומה" value={data.floor} onChange={v => update('floor', v)} placeholder="2" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label='גודל (מ"ר)' value={data.areaSqm} onChange={v => update('areaSqm', v)} placeholder="75" type="number" />
                <Field label="מספר חדרים" value={data.rooms} onChange={v => update('rooms', v)} placeholder="3" type="number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סוג דיירות</label>
                <select
                  value={data.isOwner}
                  onChange={e => update('isOwner', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="true">בעל הדירה</option>
                  <option value="false">שוכר</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="מספר חניה (אופציונלי)" value={data.parking} onChange={v => update('parking', v)} placeholder="12" />
                <Field label="מספר מחסן (אופציונלי)" value={data.storage} onChange={v => update('storage', v)} placeholder="7" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-blue-700 text-sm font-medium">קוד אימות נשלח ל-{data.phone || '050-XXXX'}</p>
              </div>
              <Field label="קוד אימות (4 ספרות)" value={data.otp} onChange={v => update('otp', v)} placeholder="1234" maxLength={4} className="text-center text-2xl tracking-widest" />
              <p className="text-center text-sm text-gray-500">לא קיבלת? <button className="text-blue-600">שלח שוב</button></p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={back} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                חזרה
              </button>
            )}
            <button onClick={next} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              {step === 2 ? 'סיום ✓' : 'המשך'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', maxLength, className = '' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; maxLength?: number; className?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${className}`}
      />
    </div>
  )
}
