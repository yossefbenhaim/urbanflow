import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import BuildingLoader from '../components/BuildingLoader'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'

const STAGES = ['סקר','ייצוג','מו"מ','הסכם','חתימות','תכנון','היתר','פינוי','בנייה','מסירה']

const STATUS_LABELS: Record<string, string> = {
  INITIAL: 'התחלה', SURVEY: 'סקר', REPRESENTATION: 'ייצוג',
  NEGOTIATION: 'מו"מ', AGREEMENT: 'הסכם', SIGNATURES: 'חתימות',
  PLANNING: 'תכנון', PERMIT: 'היתר', EVACUATION: 'פינוי',
  CONSTRUCTION: 'בנייה', DELIVERY: 'מסירה',
}

function StageIndex(status?: string) {
  const order = ['INITIAL','SURVEY','REPRESENTATION','NEGOTIATION','AGREEMENT',
    'SIGNATURES','PLANNING','PERMIT','EVACUATION','CONSTRUCTION','DELIVERY']
  return order.indexOf(status ?? '') ?? 0
}

// --- Silver Castle: Join Project Screen ---
function JoinProjectScreen({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('')
  const joinProject = trpc.tenant.joinProject.useMutation({
    onSuccess: () => onJoined(),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-sc-bg" dir="rtl">
      <div className="sc-card p-8 w-full max-w-sm mx-4 text-center">
        <div className="text-5xl mb-4">🏢</div>
        <h1 className="text-xl font-bold text-sc-dark mb-2">הצטרף לפרויקט</h1>
        <p className="text-sc-gray text-sm mb-6">הזן את קוד ההצטרפות שקיבלת ממארגן הדיירים</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="XXXXXX"
          maxLength={6}
          className="sc-input text-center text-2xl font-mono tracking-widest mb-4"
          dir="ltr"
        />
        {joinProject.isError && (
          <p className="text-sc-error text-sm mb-3">קוד לא תקין, נסה שנית</p>
        )}
        <button
          onClick={() => joinProject.mutate({ inviteCode: code })}
          disabled={code.length !== 6 || joinProject.isPending}
          className="sc-btn-primary w-full disabled:opacity-50"
        >
          {joinProject.isPending ? 'מצטרף...' : 'הצטרף'}
        </button>
      </div>
    </div>
  )
}

// --- Silver Castle: Apartment Profile Wizard ---
function ApartmentProfileWizard({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({
    floor: '',
    apartmentNumber: '',
    rooms: '',
    apartmentSizeSqm: '',
    ownershipType: 'owner' as 'owner' | 'renter',
  })
  const updateProfile = trpc.tenant.updateApartmentProfile.useMutation({
    onSuccess: () => onComplete(),
  })

  const handleSubmit = () => {
    updateProfile.mutate({
      floor: form.floor ? parseInt(form.floor) : undefined,
      apartmentNumber: form.apartmentNumber || undefined,
      rooms: form.rooms ? parseInt(form.rooms) : undefined,
      apartmentSizeSqm: form.apartmentSizeSqm ? parseFloat(form.apartmentSizeSqm) : undefined,
      ownershipType: form.ownershipType,
    })
  }

  return (
    <div className="min-h-screen bg-sc-bg flex items-center justify-center" dir="rtl">
      <div className="sc-card p-8 w-full max-w-sm mx-4">
        <div className="text-4xl text-center mb-4">🏠</div>
        <h1 className="text-xl font-bold text-sc-dark mb-1 text-center">פרטי הדירה</h1>
        <p className="text-sc-gray text-sm mb-6 text-center">נא למלא את פרטי הדירה שלך</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-sc-dark mb-1">קומה</label>
              <input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                className="sc-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-dark mb-1">מס' דירה</label>
              <input type="text" value={form.apartmentNumber} onChange={e => setForm(f => ({ ...f, apartmentNumber: e.target.value }))}
                className="sc-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-sc-dark mb-1">חדרים</label>
              <input type="number" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))}
                className="sc-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-dark mb-1">גודל (מ"ר)</label>
              <input type="number" value={form.apartmentSizeSqm} onChange={e => setForm(f => ({ ...f, apartmentSizeSqm: e.target.value }))}
                className="sc-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-dark mb-2">סוג החזקה</label>
            <div className="flex gap-3">
              {(['owner', 'renter'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, ownershipType: type }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.ownershipType === type
                      ? 'bg-sc-blue text-white border-sc-blue'
                      : 'bg-white text-sc-dark border-sc-gray-light hover:bg-sc-bg'
                  }`}
                >
                  {type === 'owner' ? '🔑 בעלים' : '🏠 שוכר'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={updateProfile.isPending}
          className="sc-btn-primary w-full mt-6 disabled:opacity-50"
        >
          {updateProfile.isPending ? 'שומר...' : 'המשך'}
        </button>
      </div>
    </div>
  )
}

// --- Main Dashboard ---
function JoinProjectInline({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('')
  const join = trpc.tenant.joinProject.useMutation({ onSuccess: onJoined })
  return (
    <div className="flex gap-2 items-center">
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="קוד 6 ספרות"
        maxLength={6}
        className="sc-input w-[120px] text-center tracking-wider font-semibold text-[13px]"
      />
      <button
        onClick={() => join.mutate({ inviteCode: code })}
        disabled={code.length !== 6 || join.isPending}
        className="sc-btn-primary px-4 py-1.5 text-[13px] disabled:opacity-50"
      >
        {join.isPending ? '...' : 'הצטרף'}
      </button>
      {join.isError && <span className="text-sc-error text-xs">קוד לא תקין</span>}
    </div>
  )
}

function TaskItem({ task }: { task: { icon: string; text: string; link: string; info: string } }) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className="relative">
      <a href={task.link} className="flex items-center gap-3 p-3 bg-white rounded-[10px] border border-sc-gray-light no-underline hover:bg-sc-blue-pale transition-colors">
        <span className="text-lg">{task.icon}</span>
        <span className="text-sm text-sc-dark font-medium flex-1">{task.text}</span>
        <button
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setShowInfo(v => !v) }}
          className={`w-[22px] h-[22px] rounded-full border-none text-xs cursor-pointer flex-shrink-0 flex items-center justify-center font-bold ${
            showInfo ? 'bg-sc-blue-deep text-white' : 'bg-sc-gray-light text-sc-gray'
          }`}>
          ?
        </button>
        <span className="text-sc-blue text-base">←</span>
      </a>
      {showInfo && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-sc-blue-deep text-sc-blue-pale text-[13px] leading-relaxed rounded-xl p-3 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <span>{task.info}</span>
            <button onPointerDown={() => setShowInfo(false)} className="bg-transparent border-none text-sc-blue-light cursor-pointer text-base flex-shrink-0">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: myStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.tenant.getMyStatus.useQuery()
  const { data: myRole } = trpc.tenant.getMyRole.useQuery()
  const { data: buildingGroup } = trpc.tenant.getMyBuildingGroup.useQuery()


  const { data: project, isLoading, isFetched } = trpc.tenant.getMyProject.useQuery(undefined, { retry: false })
  const { data: docs } = trpc.tenant.getDocuments.useQuery()
  const { data: leadership } = trpc.tenant.getLeadership.useQuery()
  const signDoc = trpc.tenant.signDocument.useMutation()

  // Silent load — LoadingScreen already covers initial wait
  if (statusLoading || (isLoading && !isFetched)) return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
    </div>
  )

  // Full dashboard
  const currentStage = StageIndex(project?.status)
  const signed = project?.signatures?.length ?? 0
  const total = project?.milestones?.length ?? 0
  const pct = total ? Math.round((signed / total) * 100) : 0

  return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      {/* Banner: no project */}
      {myStatus && !myStatus.hasProject && (
        <div className="bg-sc-warning/10 border-b border-sc-warning/30 px-6 py-3 flex items-center justify-between gap-4">
          <span className="text-sc-warning text-sm font-medium">
            ⚠️ טרם הצטרפת לפרויקט — הכנס קוד הצטרפות שקיבלת מהמארגן שלך
          </span>
          <JoinProjectInline onJoined={() => refetchStatus()} />
        </div>
      )}
      <Navbar />
      {(myRole as any)?.isRepresentative && (
        <div className="bg-sc-blue-deep px-6 py-3 flex items-center gap-3">
          <span className="text-xl">🏛️</span>
          <span className="text-white font-bold text-[15px]">נציג ועד הבניין</span>
          <span className="mr-auto bg-white/15 text-sc-blue-pale text-xs px-3 py-1 rounded-full">הרשאות מורחבות פעילות</span>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Onboarding Tasks Card */}
        {myStatus && !myStatus.isOnboarded && (
          <div className="sc-card p-6 border-t-4 border-t-sc-blue">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-sc-blue flex items-center justify-center text-[22px]">📋</div>
              <div>
                <h3 className="text-[17px] font-bold text-sc-dark m-0">השלם את הפרופיל שלך</h3>
                <p className="text-[13px] text-sc-gray mt-0.5">מלא את הפרטים כדי להשתמש בכל הפיצ׳רים</p>
              </div>
              <a href="/onboarding" className="sc-btn-primary mr-auto px-5 py-2.5 text-sm no-underline whitespace-nowrap">
                מלא פרטים ←
              </a>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { icon: '👤', text: 'תעודת זהות ומספר טלפון', done: !!myStatus.steps?.personal },
                { icon: '🏠', text: 'כתובת הדירה (עיר, רחוב, מספר)', done: !!myStatus.steps?.address },
                { icon: '📐', text: 'פרטי הדירה (קומה, גודל, שנת כניסה)', done: !!myStatus.steps?.apartment },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-[10px] border border-sc-gray-light">
                  <span className="text-lg">{step.icon}</span>
                  <span className={`text-sm flex-1 ${step.done ? 'text-sc-success line-through' : 'text-sc-dark'}`}>{step.text}</span>
                  {step.done
                    ? <span className="w-5 h-5 rounded-full bg-sc-success inline-flex items-center justify-center text-white text-xs font-bold">✓</span>
                    : <span className="w-5 h-5 rounded-full border-2 border-sc-gray-light inline-block" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Building Group Card */}
        {buildingGroup && (
          <a
            href={'/building-chat/' + (buildingGroup as any).id}
            className="no-underline block"
          >
            <div className="bg-sc-blue-deep rounded-[20px] p-5 shadow-lg cursor-pointer transition-transform hover:scale-[1.01]">
              <div className="flex items-center gap-3.5">
                <div className="w-[50px] h-[50px] rounded-[14px] bg-white/20 flex items-center justify-center text-[26px] flex-shrink-0">💬</div>
                <div className="flex-1">
                  <h3 className="m-0 text-[17px] font-extrabold text-white">קבוצת הבניין שלי</h3>
                  <p className="mt-1 text-[13px] text-white/80">לחץ לכניסה לצ׳אט עם הדיירים, סקרים ועוד</p>
                </div>
                <span className="text-white/90 text-2xl">←</span>
              </div>
            </div>
          </a>
        )}

        {/* Representative Tasks */}
        {(myRole as any)?.isRepresentative && (
          <div className="sc-card p-6 border-t-4 border-t-sc-blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-sc-blue flex items-center justify-center text-[22px]">🏛️</div>
              <div className="flex-1">
                <h3 className="m-0 text-[17px] font-bold text-sc-dark">משימות הועד</h3>
                <p className="mt-0.5 text-[13px] text-sc-gray">פעולות נדרשות בשם הבניין</p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new Event('open-faqbot-committee'))}
                className="sc-btn-primary px-3.5 py-2 text-[13px] flex items-center gap-1.5 flex-shrink-0"
              >
                📖 מדריך
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '📋', text: 'בחר ספק לפרויקט', link: '/directory',
                  info: 'בחר ספק מקצועי (עורך דין, שמאי, אדריכל) שילווה את הפרויקט. בחירה נכונה תאיץ את קידום הפינוי-בינוי ותגן על זכויות הדיירים.' },
                { icon: '📊', text: 'מעקב הצבעות דיירים', link: '/votes-tracker',
                  info: 'עקוב מי הצביע ומי לא בסקרים הפתוחים. שלח תזכורות לדיירים שלא הצביעו כדי להגיע ל-60% הנדרשים לקבלת החלטה.' },
                { icon: '🏛️', text: 'פעולות ועד', link: '/committee-actions',
                  info: 'יצירת סקרים, שליחת הודעות לדיירים, קביעת ישיבות, העלאת מסמכים וניהול חתימות — כל הכלים לניהול פרויקט בינוי.' },
                { icon: '📝', text: 'מסמכים וחתימות', link: '/documents',
                  info: 'נהל חוזים, פרוטוקולים ומסמכים חשובים. איסוף חתימות דיגיטלי מהדיירים מאיץ תהליכים ומונע עיכובים בפרויקט.' },
              ].map((task, i) => (
                <TaskItem key={i} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Project Status Card */}
        {project ? (
          <div className="sc-card p-6 border-t-4 border-t-sc-blue">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sc-dark text-lg">{project.name}</h3>
                <span className="sc-badge mt-1 bg-sc-blue-pale text-sc-blue">
                  {project.type?.replace('_', ' ')}
                </span>
              </div>
              <span className="sc-badge bg-sc-warning/15 text-sc-warning">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-sc-gray mb-2">
                  <span>חתימות שנאספו</span>
                  <span className="font-medium">{signed} / {total} ({pct}%)</span>
                </div>
                <div className="w-full bg-sc-gray-light rounded-full h-2">
                  <div className="bg-sc-blue h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {STAGES.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                  i < currentStage ? 'bg-sc-success/15 text-sc-success' :
                  i === currentStage ? 'bg-sc-blue text-white font-medium' :
                  'bg-sc-gray-light text-sc-gray'
                }`}>{s}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="sc-card p-6 text-center text-sc-gray">
            <div className="text-4xl mb-2">🏗️</div>
            <p>טרם שויכת לפרויקט. פנה למארגן הדיירים.</p>
          </div>
        )}

        {/* Leadership */}
        {leadership && (
          <div className="sc-card p-6">
            <h3 className="sc-section-title text-base mb-4">מי מוביל</h3>
            <div className="space-y-3">
              {[
                { label: 'מארגן דיירים', name: leadership.manager?.full_name, phone: leadership.manager?.phone, icon: '🏢' },
              ].filter(p => p.name).map((p) => (
                <div key={p.label} className="flex items-center gap-3 p-3 bg-sc-bg rounded-xl">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-xs text-sc-gray">{p.label}</p>
                    <p className="text-sm font-medium text-sc-dark">{p.name}</p>
                    {p.phone && <p className="text-xs text-sc-blue">{p.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {docs && docs.length > 0 && (
          <div className="sc-card p-6">
            <h3 className="sc-section-title text-base mb-4">מסמכים לחתימה</h3>
            <div className="space-y-3">
              {docs.map((doc: any) => {
                const isSigned = doc.signatures?.length > 0
                return (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isSigned ? 'border-sc-success/30 bg-sc-success/5' :
                    doc.type === 'SIGN_REQUIRED' ? 'border-sc-error/30 bg-sc-error/5' : 'border-sc-gray-light bg-sc-bg'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-sc-dark">{doc.title}</p>
                      {doc.due_date && <p className="text-xs text-sc-gray">עד {doc.due_date}</p>}
                    </div>
                    {isSigned ? (
                      <span className="text-sc-success text-sm font-medium">✅ חתום</span>
                    ) : doc.type === 'SIGN_REQUIRED' ? (
                      <button
                        onClick={() => signDoc.mutate({ docId: doc.id })}
                        disabled={signDoc.isPending}
                        className="sc-btn-primary text-xs px-3 py-1.5"
                      >
                        חתום עכשיו
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
