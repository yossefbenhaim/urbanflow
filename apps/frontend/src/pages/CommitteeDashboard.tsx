import { useState } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import type { NavItem } from '../components/Sidebar'

const committeeSidebar: NavItem[] = [
  { to: '/committee', icon: '🏠', label: 'ראשי' },
  { to: '/votes-tracker', icon: '📊', label: 'מעקב הצבעות' },
  { to: '/committee-actions', icon: '📢', label: 'שידורים' },
  { to: '/committee', icon: '📝', label: 'פרוטוקולים' },
  { to: '/committee', icon: '👥', label: 'דיירים' },
]

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

  const tabs: [Tab, string][] = [['overview','סקירה'],['tenants','דיירים'],['broadcast','הודעה'],['minutes','פרוטוקול']]

  return (
    <PageLayout sidebarItems={committeeSidebar}>
      <PageTitle>ועד בניין — רחוב הרצל 15</PageTitle>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
              tab === v ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#8e8e9e]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'overview' && (
          <>
            <div className="sc-card p-6">
              <h3 className="text-[16px] font-bold text-[#212121] mb-4">סטטוס חתימות הבניין</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-extrabold text-[#3b6b9c]">{pct}%</div>
                <div>
                  <p className="text-[13px] text-[#5a5a6e]">{signed} מתוך {total} דיירים חתמו</p>
                  <p className="text-[11px] text-[#c4841d] mt-0.5">נדרש 80% לפינוי בינוי</p>
                </div>
              </div>
              <div className="w-full bg-[#eeeeee] rounded-full h-3">
                <div className="bg-[#3b6b9c] h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="sc-card p-6">
              <h3 className="text-[16px] font-bold text-[#212121] mb-3">התראות</h3>
              <div className="space-y-2">
                {mockTenants.filter(t => !t.signed).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#fcf4e7] rounded-[10px]">
                    <div>
                      <p className="text-[13px] font-medium text-[#212121]">{t.name} — {t.unit}</p>
                      <p className="text-[11px] text-[#c4841d]">טרם חתם</p>
                    </div>
                    <a href={`tel:${t.phone}`} className="text-[#3b6b9c] text-sm">📞</a>
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
                  className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
                    filter === v ? 'bg-[#3b6b9c] text-white' : 'bg-[#f8f9fa] text-[#8e8e9e]'
                  }`}>{l}</button>
              ))}
            </div>
            {filtered.map(t => (
              <div key={t.id} className="sc-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#212121] text-[13px]">{t.name}</p>
                    <p className="text-[11px] text-[#5a5a6e]">{t.unit} | קומה {t.floor}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${t.signed ? 'bg-[#edf5ef] text-[#4a8c5c]' : 'bg-[#fcf4e7] text-[#c4841d]'}`}>
                      {t.signed ? 'חתם ✓' : 'לא חתם'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="sc-card p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-[#212121]">הודעה לכל הדיירים</h3>
            {broadcastSent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📢</div>
                <p className="font-bold text-[#212121]">ההודעה נשלחה!</p>
                <p className="text-[13px] text-[#8e8e9e] mt-1">ל-{total} דיירים</p>
                <button onClick={() => { setBroadcastSent(false); setBroadcast({ title: '', body: '' }) }}
                  className="mt-4 text-[#3b6b9c] text-[13px] font-semibold">שלח הודעה נוספת</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="sc-label">כותרת</label>
                  <input value={broadcast.title} onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))}
                    placeholder="עדכון חשוב לדיירי הבניין" className="sc-input" />
                </div>
                <div>
                  <label className="sc-label">גוף ההודעה</label>
                  <textarea value={broadcast.body} onChange={e => setBroadcast(p => ({ ...p, body: e.target.value }))}
                    rows={5} placeholder="תוכן ההודעה לדיירים..." className="sc-input resize-none" />
                </div>
                <button onClick={() => setBroadcastSent(true)} className="sc-btn-primary w-full">שלח הודעה</button>
              </>
            )}
          </div>
        )}

        {tab === 'minutes' && (
          <div className="space-y-4">
            <div className="sc-card p-6">
              <h3 className="text-[16px] font-bold text-[#212121] mb-3">ישיבה אחרונה</h3>
              <div className="text-[13px] text-[#5a5a6e] space-y-2">
                <p><span className="font-semibold text-[#212121]">תאריך:</span> 20/02/2026</p>
                <p><span className="font-semibold text-[#212121]">משתתפים:</span> דוד כהן, שרה לוי, יוסי אלון</p>
                <p><span className="font-semibold text-[#212121]">החלטות:</span> לשלוח תזכורת לדיירים שלא חתמו עד סוף השבוע.</p>
              </div>
            </div>
            <button className="sc-btn-primary w-full">+ פרוטוקול ישיבה חדש</button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
