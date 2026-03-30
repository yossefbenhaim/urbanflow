import { useState } from 'react'
import Navbar from '../components/Navbar'

const mockTenants = [
  { id: 1, name: 'דוד כהן', unit: 'דירה 1', floor: 1, signed: true, onboarded: true, phone: '050-1111111' },
  { id: 2, name: 'שרה לוי', unit: 'דירה 2', floor: 1, signed: true, onboarded: true, phone: '050-2222222' },
  { id: 3, name: 'משה ישראלי', unit: 'דירה 3', floor: 2, signed: false, onboarded: true, phone: '050-3333333' },
  { id: 4, name: 'רחל ברקוביץ', unit: 'דירה 4', floor: 2, signed: false, onboarded: false, phone: '050-4444444' },
  { id: 5, name: 'יוסי אלון', unit: 'דירה 5', floor: 3, signed: false, onboarded: true, phone: '050-5555555' },
]

type Tab = 'overview' | 'tenants' | 'broadcast' | 'minutes'

export default function CommitteeDashboard() {
  const [tab, setTab] = useState<Tab>('overview')
  const [filter, setFilter] = useState<'ALL' | 'UNSIGNED' | 'INCOMPLETE'>('ALL')
  const [broadcast, setBroadcast] = useState({ title: '', body: '' })
  const [broadcastSent, setBroadcastSent] = useState(false)

  const signed = mockTenants.filter(t => t.signed).length
  const total = mockTenants.length
  const pct = Math.round((signed / total) * 100)

  const filtered = mockTenants.filter(t => {
    if (filter === 'UNSIGNED') return !t.signed
    if (filter === 'INCOMPLETE') return !t.onboarded
    return true
  })

  return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />

      {/* Tabs */}
      <div className="bg-white border-b border-sc-gray-light sticky top-14 z-10">
        <div className="max-w-lg mx-auto flex overflow-x-auto">
          {([['overview','סקירה'],['tenants','דיירים'],['broadcast','הודעה'],['minutes','פרוטוקול']] as [Tab,string][]).map(([v,label]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === v ? 'border-sc-blue text-sc-blue' : 'border-transparent text-sc-gray'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {tab === 'overview' && (
          <>
            {/* Signature progress */}
            <div className="sc-card p-6">
              <h3 className="sc-section-title text-base mb-4">סטטוס חתימות הבניין</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold text-sc-blue">{pct}%</div>
                <div>
                  <p className="text-sm text-sc-gray">{signed} מתוך {total} דיירים חתמו</p>
                  <p className="text-xs text-sc-warning mt-0.5">נדרש 80% לפינוי בינוי</p>
                </div>
              </div>
              <div className="w-full bg-sc-gray-light rounded-full h-3">
                <div className="bg-sc-blue h-3 rounded-full transition-all relative" style={{ width: `${pct}%` }}>
                  <div className="absolute left-0 top-0 h-full bg-sc-blue-deep rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-3 flex justify-between text-xs text-sc-gray">
                <span>0%</span>
                <span className="text-sc-warning font-medium">80% (סף)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Quick alerts */}
            <div className="sc-card p-6">
              <h3 className="sc-section-title text-base mb-3">התראות</h3>
              <div className="space-y-2">
                {mockTenants.filter(t => !t.signed).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-sc-warning/10 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-sc-dark">{t.name} — {t.unit}</p>
                      <p className="text-xs text-sc-warning">טרם חתם</p>
                    </div>
                    <a href={`tel:${t.phone}`} className="text-sc-blue text-sm">📞</a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'tenants' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {([['ALL','הכל'],['UNSIGNED','לא חתמו'],['INCOMPLETE','פרטים חסרים']] as ['ALL'|'UNSIGNED'|'INCOMPLETE',string][]).map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === v ? 'bg-sc-blue text-white' : 'bg-sc-bg border border-sc-gray-light text-sc-gray'}`}>{l}</button>
              ))}
            </div>
            {filtered.map(t => (
              <div key={t.id} className="sc-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sc-dark">{t.name}</p>
                    <p className="text-xs text-sc-gray">{t.unit} | קומה {t.floor}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`sc-badge ${t.signed ? 'bg-sc-success/15 text-sc-success' : 'bg-sc-warning/15 text-sc-warning'}`}>
                      {t.signed ? 'חתם ✓' : 'לא חתם'}
                    </span>
                    {!t.onboarded && <span className="sc-badge bg-sc-error/15 text-sc-error">פרטים חסרים</span>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a href={`tel:${t.phone}`} className="sc-btn-secondary flex-1 text-center text-xs py-1.5">📞 {t.phone}</a>
                  <button className="flex-1 border border-sc-blue-light text-sc-blue py-1.5 rounded-lg text-xs hover:bg-sc-blue-pale transition-colors">שלח תזכורת</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="sc-card p-6 space-y-4">
            <h3 className="sc-section-title text-base">הודעה לכל הדיירים</h3>
            {broadcastSent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📢</div>
                <p className="font-medium text-sc-dark">ההודעה נשלחה!</p>
                <p className="text-sm text-sc-gray mt-1">ל-{total} דיירים</p>
                <button onClick={() => { setBroadcastSent(false); setBroadcast({ title: '', body: '' }) }}
                  className="mt-4 text-sc-blue text-sm">שלח הודעה נוספת</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-sc-dark mb-1">כותרת</label>
                  <input value={broadcast.title} onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))}
                    placeholder="עדכון חשוב לדיירי הבניין"
                    className="sc-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-dark mb-1">גוף ההודעה</label>
                  <textarea value={broadcast.body} onChange={e => setBroadcast(p => ({ ...p, body: e.target.value }))}
                    rows={5} placeholder="תוכן ההודעה לדיירים..."
                    className="sc-input resize-none" />
                </div>
                <div className="bg-sc-blue-pale rounded-xl p-3 text-sm text-sc-blue">
                  📧 תישלח ל-{total} דיירים באימייל
                </div>
                <button onClick={() => setBroadcastSent(true)}
                  className="sc-btn-primary w-full">
                  שלח הודעה
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'minutes' && (
          <div className="space-y-4">
            <div className="sc-card p-6">
              <h3 className="sc-section-title text-base mb-3">ישיבה אחרונה</h3>
              <div className="text-sm text-sc-gray space-y-2">
                <p><span className="font-medium text-sc-dark">תאריך:</span> 20/02/2026</p>
                <p><span className="font-medium text-sc-dark">משתתפים:</span> דוד כהן, שרה לוי, יוסי אלון</p>
                <p><span className="font-medium text-sc-dark">החלטות:</span> לשלוח תזכורת לדיירים שלא חתמו עד סוף השבוע. לתאם פגישה עם נציג היזם.</p>
              </div>
            </div>
            <button className="sc-btn-primary w-full">
              + פרוטוקול ישיבה חדש
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
