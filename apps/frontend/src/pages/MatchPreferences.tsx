import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import PageLayout from '../components/PageLayout'
import CityAutocomplete from '../components/CityAutocomplete'

type ProjectType = 'pinuy_binuy' | 'tama_38_2' | 'chalufat_shaked' | 'binui_pinui'
type AnyLevel = 'low' | 'medium' | 'high' | 'any'
type WorkType = 'full_accompaniment' | 'spot_consulting' | 'specific_phase' | 'any'

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'pinuy_binuy', label: 'פינוי בינוי' },
  { value: 'tama_38_2', label: `תמ"א 38/2` },
  { value: 'chalufat_shaked', label: 'חלופת שקד' },
  { value: 'binui_pinui', label: 'בינוי פינוי' },
]

export default function MatchPreferences() {
  const navigate = useNavigate()
  const { data: existing, refetch } = trpc.match.getPreferences.useQuery()
  const save = trpc.match.setPreferences.useMutation()

  const [cities, setCities] = useState<string[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [complexity, setComplexity] = useState<AnyLevel>('any')
  const [risk, setRisk] = useState<AnyLevel>('any')
  const [workType, setWorkType] = useState<WorkType>('any')
  const [minProfit, setMinProfit] = useState<string>('')
  const [timelineMonths, setTimelineMonths] = useState<string>('')
  const [minScore, setMinScore] = useState<number>(70)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!existing) return
    const e = existing as {
      cities: string[]
      project_types: string[]
      complexity_pref: AnyLevel
      risk_pref: AnyLevel
      work_type: WorkType
      min_profitability_pct: number | null
      preferred_timeline_months: number | null
      min_score_for_notification: number
    }
    setCities(e.cities ?? [])
    setProjectTypes((e.project_types ?? []) as ProjectType[])
    setComplexity(e.complexity_pref ?? 'any')
    setRisk(e.risk_pref ?? 'any')
    setWorkType(e.work_type ?? 'any')
    setMinProfit(e.min_profitability_pct != null ? String(e.min_profitability_pct) : '')
    setTimelineMonths(e.preferred_timeline_months != null ? String(e.preferred_timeline_months) : '')
    setMinScore(e.min_score_for_notification ?? 70)
  }, [existing])

  const addCity = (c: string) => {
    if (c && !cities.includes(c)) setCities([...cities, c])
  }

  const togglePt = (pt: ProjectType) => {
    setProjectTypes(p => p.includes(pt) ? p.filter(x => x !== pt) : [...p, pt])
  }

  const handleSave = async () => {
    setOk(false)
    await save.mutateAsync({
      cities,
      projectTypes,
      complexityPref: complexity,
      riskPref: risk,
      workType,
      minProfitabilityPct: minProfit ? +minProfit : null,
      preferredTimelineMonths: timelineMonths ? +timelineMonths : null,
      minScoreForNotification: minScore,
    })
    setOk(true)
    refetch()
  }

  return (
    <PageLayout>
      <div dir="rtl" className="max-w-2xl mx-auto p-4 pb-12">
        <button onClick={() => navigate(-1)} className="text-[#5a5a6e] text-sm mb-3">← חזרה</button>
        <h1 className="sc-section-title text-xl mb-1">העדפות התאמה</h1>
        <p className="text-sm text-[#5a5a6e] mb-6">מנוע ההתאמה ישתמש בהעדפות אלה כדי לחשב ציון 0–100 לכל פרויקט פתוח</p>

        <div className="space-y-4">
          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">ערים פעילות</h3>
            <CityAutocomplete
              value=""
              onChange={addCity}
              clearOnPick
              placeholder="הקלד שם עיר ובחר מהרשימה כדי להוסיף"
            />
            {cities.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {cities.map(c => (
                  <span key={c} className="bg-[#ebf1f7] text-[#3b6b9c] px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {c}
                    <button onClick={() => setCities(cities.filter(x => x !== c))} className="text-[#3b6b9c] hover:text-red-500">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">סוגי פרויקטים</h3>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_TYPES.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => togglePt(pt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors
                    ${projectTypes.includes(pt.value) ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">רמה רצויה</h3>
            <LevelPicker label="מורכבות" value={complexity} onChange={setComplexity} />
            <LevelPicker label="סיכון" value={risk} onChange={setRisk} />
          </div>

          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">סוג עבודה</h3>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'full_accompaniment', label: 'ליווי מלא' },
                { value: 'spot_consulting', label: 'ייעוץ נקודתי' },
                { value: 'specific_phase', label: 'שלב מסוים' },
                { value: 'any', label: 'הכל' },
              ].map(o => (
                <button
                  key={o.value}
                  onClick={() => setWorkType(o.value as WorkType)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors
                    ${workType === o.value ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">רווחיות וזמן</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#5a5a6e] mb-1">רווחיות מינימלית (%)</label>
                <input type="number" value={minProfit} onChange={e => setMinProfit(e.target.value)} className="sc-input" />
              </div>
              <div>
                <label className="block text-xs text-[#5a5a6e] mb-1">משך פרויקט מועדף (חודשים)</label>
                <input type="number" value={timelineMonths} onChange={e => setTimelineMonths(e.target.value)} className="sc-input" />
              </div>
            </div>
          </div>

          <div className="sc-card p-4 space-y-3">
            <h3 className="font-bold text-[#1e3a5f]">התראות</h3>
            <label className="block text-xs text-[#5a5a6e]">ציון מינימלי להתראה אוטומטית: {minScore}</label>
            <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-full" />
            <p className="text-xs text-[#5a5a6e]">תקבל התראה כאשר פרויקט חדש מקבל ציון מעל סף זה</p>
          </div>

          {ok && <p className="text-[#4a8c5c] text-sm text-center">✅ העדפות נשמרו</p>}

          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="w-full py-4 rounded-2xl bg-[#1e3a5f] text-white font-bold text-lg disabled:opacity-60"
          >
            {save.isPending ? 'שומר...' : 'שמור העדפות'}
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

function LevelPicker({ label, value, onChange }: { label: string; value: AnyLevel; onChange: (v: AnyLevel) => void }) {
  const options: { v: AnyLevel; l: string }[] = [
    { v: 'low', l: 'נמוכה' },
    { v: 'medium', l: 'בינונית' },
    { v: 'high', l: 'גבוהה' },
    { v: 'any', l: 'הכל' },
  ]
  return (
    <div>
      <label className="block text-xs text-[#5a5a6e] mb-1">{label}</label>
      <div className="flex gap-2">
        {options.map(o => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors
              ${value === o.v ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#eeeeee] text-[#5a5a6e]'}`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}
