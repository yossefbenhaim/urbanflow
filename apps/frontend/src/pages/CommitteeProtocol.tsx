import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import PageLayout from '../components/PageLayout'
import GenerateDocPDF from '../components/GenerateDocPDF'
import type { AgreementTemplate } from '../data/agreementTemplates'

const PROTOCOL_TEMPLATE: AgreementTemplate = {
  title: 'פרוטוקול מינוי נציגות הבניין',
  sections: [
    {
      heading: '1. פתיח',
      content:
        'אנו, הדיירים החתומים מטה, מאשרים בזאת כי התקיימה אסיפת דיירים בה נבחרו נציגי הבניין לצורך ייצוג הדיירים מול היזם, המנהל והרשויות בפרויקט פינוי-בינוי / התחדשות עירונית.',
    },
    {
      heading: '2. הנציגים שנבחרו',
      content: '(רשימת הנציגים תוצג אוטומטית למטה)',
    },
    {
      heading: '3. סמכויות הנציגות',
      content:
        'הנציגות מוסמכת לנהל משא ומתן מול היזם בשם הדיירים, לקבל מידע על התקדמות הפרויקט, לייצג את הדיירים בפגישות רשמיות, ולהציג עדכונים שוטפים לדיירי הבניין. הנציגות אינה מוסמכת לחתום על הסכם מחייב ללא אישור הדיירים.',
    },
    {
      heading: '4. תקופת הכהונה',
      content:
        'הנציגות תכהן למשך שנה אחת מיום החתימה על פרוטוקול זה, או עד בחירת נציגות חדשה — המוקדם מביניהם.',
    },
    {
      heading: '5. אישור',
      content:
        'בחתימתי על מסמך זה, אני מאשר/ת כי קראתי את תוכנו, כי אני מסכים/ה למינוי הנציגות הנ"ל, וכי החתימה נעשתה מרצוני החופשי.',
    },
  ],
}

export default function CommitteeProtocol() {
  const navigate = useNavigate()
  const { profile } = useUser()
  const { data: reps, isLoading } = trpc.tenant.getBuildingRepresentatives.useQuery()

  const fullName = profile?.fullName || ''
  const idNumber = profile?.idNumber || ''
  const today = new Date().toLocaleDateString('he-IL')

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [signed, setSigned] = useState(false)

  // Canvas drawing — same pattern as DocumentViewPage
  const getPos = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      }
    },
    []
  )

  const startDraw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault()
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      setIsDrawing(true)
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    },
    [getPos]
  )

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing) return
      e.preventDefault()
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const pos = getPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = '#1e3a5f'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.stroke()
      setHasDrawn(true)
    },
    [isDrawing, getPos]
  )

  const endDraw = useCallback(() => setIsDrawing(false), [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSign = () => {
    // In a real flow we'd persist the signature to supabase;
    // for now we just mark signed locally
    setSigned(true)
  }

  // Build enriched template with representative names
  const enrichedTemplate: AgreementTemplate = {
    ...PROTOCOL_TEMPLATE,
    sections: PROTOCOL_TEMPLATE.sections.map((s) => {
      if (s.heading === '2. הנציגים שנבחרו') {
        const repList =
          reps && reps.length > 0
            ? (reps as any[])
                .map(
                  (r, i) =>
                    `${i + 1}. ${r.profile?.full_name ?? 'נציג'}`
                )
                .join('\n')
            : 'טרם נבחרו נציגים'
        return { ...s, content: repList }
      }
      return s
    }),
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-12" dir="rtl">
        {/* Back */}
        <button
          onClick={() => navigate('/elect-representatives')}
          className="text-[#3b6b9c] text-sm font-medium flex items-center gap-1 mb-4"
        >
          → חזרה לבחירת נציגות
        </button>

        {/* Header */}
        <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#eeeeee] mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-lg">
              📜
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">
                {PROTOCOL_TEMPLATE.title}
              </h1>
              <p className="text-xs text-[#5a5a6e]">תאריך: {today}</p>
            </div>
          </div>

          {/* User info */}
          <div className="grid grid-cols-2 gap-3 bg-[#f8f9fa] rounded-xl p-3 text-sm">
            <div>
              <span className="text-[#5a5a6e]">שם:</span>{' '}
              <span className="font-medium text-[#212121]">
                {fullName || '—'}
              </span>
            </div>
            <div>
              <span className="text-[#5a5a6e]">ת.ז.:</span>{' '}
              <span className="font-medium text-[#212121]">
                {idNumber || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Protocol Content */}
        <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden mb-4">
          <div className="p-5 space-y-5">
            {enrichedTemplate.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-base font-bold text-[#1e3a5f] mb-2">
                  {section.heading}
                </h2>
                <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
                {i < enrichedTemplate.sections.length - 1 && (
                  <hr className="mt-4 border-[#eeeeee]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Representatives Badge Cards */}
        {reps && (reps as any[]).length > 0 && (
          <div className="sc-card p-5 mb-4">
            <h3 className="font-bold text-[#212121] text-sm mb-3">
              🏅 נציגים שנבחרו
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(reps as any[]).map((rep, i) => (
                <div
                  key={rep.id || i}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-l from-[#ebf1f7] to-white border border-[#3b6b9c]/20"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3b6b9c] flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#212121]">
                      {rep.profile?.full_name ?? 'נציג'}
                    </p>
                    <p className="text-[10px] text-[#5a5a6e]">נציג/ת</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Area */}
        {!signed ? (
          <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#eeeeee] space-y-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">
              חתימה דיגיטלית ✍️
            </h2>

            <div className="border-2 border-dashed border-[#3b6b9c]/30 rounded-xl overflow-hidden bg-[#f8f9fa]">
              <canvas
                ref={canvasRef}
                width={500}
                height={180}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={clearCanvas}
                className="px-4 py-2 rounded-lg border border-[#eeeeee] text-sm text-[#5a5a6e] hover:bg-[#f8f9fa] transition"
              >
                🗑️ נקה חתימה
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-[#3b6b9c] accent-[#3b6b9c]"
              />
              <span className="text-sm text-[#333]">
                אני מאשר/ת שקראתי את הפרוטוקול ומסכים/ה לתוכנו
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={!hasDrawn || !confirmed}
              className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{
                backgroundColor: hasDrawn && confirmed ? '#1e3a5f' : '#9ca3af',
              }}
            >
              חתום ואשר ✍️
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#4a8c5c]/30 space-y-4">
            <div className="flex items-center gap-2 text-[#4a8c5c]">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-bold">הפרוטוקול נחתם בהצלחה!</h2>
            </div>
            <p className="text-sm text-[#5a5a6e]">
              נחתם על ידי {fullName} • ת.ז. {idNumber} • {today}
            </p>

            {/* PDF download */}
            <GenerateDocPDF
              template={enrichedTemplate}
              fullName={fullName}
              idNumber={idNumber}
              address=""
              date={today}
              signatureImage={canvasRef.current?.toDataURL('image/png')}
              docTitle="פרוטוקול נציגות"
            />

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl font-bold text-[#3b6b9c] border-2 border-[#3b6b9c] bg-white transition hover:bg-[#ebf1f7]"
            >
              חזרה לדף הבית
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
