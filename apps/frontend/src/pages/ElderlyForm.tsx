import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'
import { useNavigate } from 'react-router-dom'

const LEGAL_ALTERNATIVES = [
  { value: 'small_apt_plus_cash', label: 'דירה קטנה יותר + פיצוי כספי' },
  { value: 'two_small_apts', label: 'שתי דירות קטנות' },
  { value: 'assisted_living', label: 'דיור מוגן' },
]

export default function ElderlyForm() {
  const navigate = useNavigate()
  const { data: existing, isLoading } = trpc.tenant.getElderlyProfile.useQuery()
  const save = trpc.tenant.saveElderlyProfile.useMutation({
    onSuccess: () => navigate('/dashboard'),
  })

  const [form, setForm] = useState({
    age: '',
    hasDisability: false,
    disabilityDescription: '',
    needsAccessibility: false,
    needsLowFloor: false,
    needsElevator: false,
    cannotRelocateFar: false,
    preferredArea: '',
    hasCompanion: false,
    companionName: '',
    companionPhone: '',
    legalAlternatives: [] as string[],
    notes: '',
  })

  useEffect(() => {
    if (existing) {
      setForm({
        age: (existing as any).age?.toString() ?? '',
        hasDisability: (existing as any).has_disability ?? false,
        disabilityDescription: (existing as any).disability_description ?? '',
        needsAccessibility: (existing as any).needs_accessibility ?? false,
        needsLowFloor: (existing as any).needs_low_floor ?? false,
        needsElevator: (existing as any).needs_elevator ?? false,
        cannotRelocateFar: (existing as any).cannot_relocate_far ?? false,
        preferredArea: (existing as any).preferred_area ?? '',
        hasCompanion: (existing as any).has_companion ?? false,
        companionName: (existing as any).companion_name ?? '',
        companionPhone: (existing as any).companion_phone ?? '',
        legalAlternatives: (existing as any).legal_alternatives ?? [],
        notes: (existing as any).notes ?? '',
      })
    }
  }, [existing])

  const toggleAlt = (val: string) => {
    setForm(f => ({
      ...f,
      legalAlternatives: f.legalAlternatives.includes(val)
        ? f.legalAlternatives.filter(v => v !== val)
        : [...f.legalAlternatives, val],
    }))
  }

  const handleSubmit = () => {
    const age = form.age ? parseInt(form.age) : undefined
    save.mutate({
      age,
      isOver70: age ? age >= 70 : false,
      isOver80: age ? age >= 80 : false,
      hasDisability: form.hasDisability,
      disabilityDescription: form.disabilityDescription || undefined,
      needsAccessibility: form.needsAccessibility,
      needsLowFloor: form.needsLowFloor,
      needsElevator: form.needsElevator,
      cannotRelocateFar: form.cannotRelocateFar,
      preferredArea: form.preferredArea || undefined,
      hasCompanion: form.hasCompanion,
      companionName: form.companionName || undefined,
      companionPhone: form.companionPhone || undefined,
      legalAlternatives: form.legalAlternatives,
      notes: form.notes || undefined,
    })
  }

  if (isLoading) return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-sc-primary border-t-transparent rounded-full" />
      </div>
    </div>
  )

  const ageNum = form.age ? parseInt(form.age) : 0

  return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-sc-light-blue border border-sc-primary/20 rounded-2xl p-5 mb-6 flex gap-3 items-start">
          <span className="text-2xl flex-shrink-0">ℹ️</span>
          <div>
            <h2 className="text-base font-bold text-sc-navy mb-1">זכויות מיוחדות לדיירים מעל גיל 70</h2>
            <p className="text-sm text-sc-primary leading-relaxed">
              אם את/ה מעל גיל 70, יש לך זכויות מיוחדות בפרויקט פינוי-בינוי לפי חוק.
              מילוי הטופס הזה יעזור לנו לוודא שכל הזכויות שלך נשמרות, כולל חלופות דיור מותאמות.
            </p>
          </div>
        </div>

        <div className="sc-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-sc-primary flex items-center justify-center text-2xl">👴</div>
            <div>
              <h1 className="text-xl font-bold text-sc-text">טופס קשיש / מוגבלות</h1>
              <p className="text-sm text-sc-text-light">מילוי הטופס מבטיח שמירה על זכויותיך בפרויקט</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-sc-text mb-1">גיל</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="הכנס גיל"
                className="sc-input w-full"
              />
              {ageNum >= 70 && ageNum < 80 && (
                <p className="text-sm text-sc-primary mt-1 font-medium">✅ יש לך זכויות מיוחדות כקשיש בפרויקט</p>
              )}
              {ageNum >= 80 && (
                <p className="text-sm text-sc-gold-dark mt-1 font-medium">⚠️ מעל גיל 80 — היזם חייב להציג לך חלופות דיור (תיקון 6)</p>
              )}
            </div>

            {/* Disability */}
            <div className="border border-sc-border rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasDisability}
                  onChange={e => setForm(f => ({ ...f, hasDisability: e.target.checked }))}
                  className="w-5 h-5 rounded accent-sc-primary"
                />
                <span className="text-sm font-medium text-sc-text">יש לי מוגבלות</span>
              </label>
              {form.hasDisability && (
                <textarea
                  value={form.disabilityDescription}
                  onChange={e => setForm(f => ({ ...f, disabilityDescription: e.target.value }))}
                  placeholder="תאר/י את המוגבלות..."
                  rows={3}
                  className="sc-input w-full mt-3"
                />
              )}
            </div>

            {/* Accessibility Needs */}
            <div>
              <h3 className="text-sm font-bold text-sc-text mb-3">צרכי נגישות</h3>
              <div className="space-y-2">
                {[
                  { key: 'needsAccessibility', label: '♿ נגישות מלאה (רמפות, מעלית, דלתות רחבות)' },
                  { key: 'needsLowFloor', label: '🏠 צורך בקומה נמוכה' },
                  { key: 'needsElevator', label: '🛗 חייב/ת מעלית' },
                  { key: 'cannotRelocateFar', label: '📍 לא יכול/ה לעבור רחוק מהמיקום הנוכחי' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-sc-border cursor-pointer hover:bg-sc-bg transition-colors">
                    <input
                      type="checkbox"
                      checked={(form as any)[item.key]}
                      onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                      className="w-5 h-5 rounded accent-sc-primary"
                    />
                    <span className="text-sm text-sc-text">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Area */}
            <div>
              <label className="block text-sm font-medium text-sc-text mb-1">אזור מועדף למגורים</label>
              <input
                type="text"
                value={form.preferredArea}
                onChange={e => setForm(f => ({ ...f, preferredArea: e.target.value }))}
                placeholder="לדוגמה: אותו רחוב, אותה שכונה..."
                className="sc-input w-full"
              />
            </div>

            {/* Companion */}
            <div className="border border-sc-border rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasCompanion}
                  onChange={e => setForm(f => ({ ...f, hasCompanion: e.target.checked }))}
                  className="w-5 h-5 rounded accent-sc-primary"
                />
                <span className="text-sm font-medium text-sc-text">יש לי מלווה / אפוטרופוס</span>
              </label>
              {form.hasCompanion && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-sc-text-light mb-1">שם המלווה</label>
                    <input
                      type="text"
                      value={form.companionName}
                      onChange={e => setForm(f => ({ ...f, companionName: e.target.value }))}
                      className="sc-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-sc-text-light mb-1">טלפון המלווה</label>
                    <input
                      type="tel"
                      value={form.companionPhone}
                      onChange={e => setForm(f => ({ ...f, companionPhone: e.target.value }))}
                      className="sc-input w-full"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Legal Alternatives */}
            {ageNum >= 70 && (
              <div>
                <h3 className="text-sm font-bold text-sc-text mb-2">חלופות דיור מועדפות (לפי חוק)</h3>
                <p className="text-xs text-sc-text-light mb-3">בחר/י את החלופות שמתאימות לך — היזם מחויב להציע אותן</p>
                <div className="space-y-2">
                  {LEGAL_ALTERNATIVES.map(alt => (
                    <label key={alt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      form.legalAlternatives.includes(alt.value)
                        ? 'bg-sc-primary/10 border-sc-primary'
                        : 'bg-white border-sc-border hover:bg-sc-bg'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.legalAlternatives.includes(alt.value)}
                        onChange={() => toggleAlt(alt.value)}
                        className="w-5 h-5 rounded accent-sc-primary"
                      />
                      <span className="text-sm text-sc-text">{alt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-sc-text mb-1">הערות נוספות</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="כל מידע נוסף שחשוב לנו לדעת..."
                rows={3}
                className="sc-input w-full"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={save.isPending}
            className="sc-btn-primary w-full mt-6 py-3 text-base disabled:opacity-50"
          >
            {save.isPending ? 'שומר...' : '💾 שמור טופס'}
          </button>
          {save.isError && (
            <p className="text-sc-error text-sm mt-2 text-center">שגיאה בשמירה, נסה שנית</p>
          )}
        </div>
      </div>
    </div>
  )
}
