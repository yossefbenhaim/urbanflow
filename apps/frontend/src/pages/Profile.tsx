import { useState } from 'react'

export default function Profile() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ fullName: 'יוסי מזרחי', phone: '052-1234567', email: 'yossi@example.com', idNumber: '123456789' })
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto"><h1 className="font-bold text-gray-900 text-lg">הפרופיל שלי</h1></div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {form.fullName[0] || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{form.fullName}</p>
            <p className="text-sm text-gray-500">{form.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">דייר</span>
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">פרטים אישיים</h2>
          {[
            { label: 'שם מלא', key: 'fullName' },
            { label: 'טלפון', key: 'phone' },
            { label: 'מספר ת"ז', key: 'idNumber' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e => update(f.key, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input value={form.email} readOnly className="w-full px-4 py-3 border border-gray-100 rounded-xl text-gray-400 bg-gray-50 cursor-not-allowed" />
          </div>

          <button
            onClick={save}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {saved ? '✅ נשמר בהצלחה' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  )
}
