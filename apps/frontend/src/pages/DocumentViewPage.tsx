import { useParams, useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import { getAgreementTemplate } from '../data/agreementTemplates'

export default function DocumentViewPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const { profile } = useUser()

  const { data: doc, isLoading, refetch } = trpc.tenant.getDocumentContent.useQuery(
    { docId: docId! },
    { enabled: !!docId }
  )

  const { data: tenantProfile } = trpc.tenant.getMyProfile.useQuery()

  const signMutation = trpc.tenant.signDocumentWithSignature.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [signed, setSigned] = useState(false)

  // Get template content
  const contentKey = (doc as any)?.content_key
  const template = contentKey ? getAgreementTemplate(contentKey) : null

  // User info
  const fullName = profile?.fullName || ''
  const idNumber = profile?.idNumber || ''
  const address = (tenantProfile as any)?.address || ''
  const today = new Date().toLocaleDateString('he-IL')

  // Is already signed
  const alreadySigned = !!(doc as any)?.mySig

  useEffect(() => {
    if (alreadySigned) setSigned(true)
  }, [alreadySigned])

  // Canvas drawing
  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
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
  }, [isDrawing, getPos])

  const endDraw = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSign = async () => {
    if (!canvasRef.current || !docId) return
    const signatureImage = canvasRef.current.toDataURL('image/png')
    await signMutation.mutateAsync({
      docId,
      signatureImage,
      fullName,
      idNumber,
    })
    setSigned(true)
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-[#3b6b9c] border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    )
  }

  if (!doc) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto p-4 text-center">
          <p className="text-[#5a5a6e]">המסמך לא נמצא</p>
          <button onClick={() => navigate('/documents')} className="sc-btn-primary mt-4">חזרה למסמכים</button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Back button */}
        <button onClick={() => navigate('/documents')} className="text-[#3b6b9c] text-sm font-medium flex items-center gap-1">
          → חזרה למסמכים
        </button>

        {/* Document header */}
        <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#eeeeee]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-lg">
              📄
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">{template?.title || (doc as any).title}</h1>
              <p className="text-xs text-[#5a5a6e]">תאריך: {today}</p>
            </div>
          </div>

          {/* Auto fields */}
          <div className="grid grid-cols-2 gap-3 bg-[#f8f9fa] rounded-xl p-3 text-sm">
            <div><span className="text-[#5a5a6e]">שם הדייר:</span> <span className="font-medium text-[#212121]">{fullName || '—'}</span></div>
            <div><span className="text-[#5a5a6e]">ת.ז.:</span> <span className="font-medium text-[#212121]">{idNumber || '—'}</span></div>
            <div className="col-span-2"><span className="text-[#5a5a6e]">כתובת:</span> <span className="font-medium text-[#212121]">{address || '—'}</span></div>
          </div>
        </div>

        {/* Agreement sections */}
        {template && (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden">
            <div className="p-5 space-y-5">
              {template.sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-base font-bold text-[#1e3a5f] mb-2">{section.heading}</h2>
                  <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{section.content}</div>
                  {i < template.sections.length - 1 && <hr className="mt-4 border-[#eeeeee]" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature area */}
        {!signed ? (
          <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#eeeeee] space-y-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">חתימה דיגיטלית ✍️</h2>

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
                onChange={e => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-[#3b6b9c] accent-[#3b6b9c]"
              />
              <span className="text-sm text-[#333]">אני מאשר/ת שקראתי את המסמך במלואו ואני מסכים/ה לתוכנו</span>
            </label>

            <button
              onClick={handleSign}
              disabled={!hasDrawn || !confirmed || signMutation.isPending}
              className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{ backgroundColor: hasDrawn && confirmed ? '#1e3a5f' : '#9ca3af' }}
            >
              {signMutation.isPending ? 'חותם...' : 'חתום ✍️'}
            </button>

            {signMutation.isError && (
              <p className="text-red-500 text-sm text-center">{signMutation.error.message}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[14px] shadow-sm p-5 border border-[#4a8c5c]/30 space-y-4">
            <div className="flex items-center gap-2 text-[#4a8c5c]">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-bold">המסמך נחתם בהצלחה!</h2>
            </div>
            <p className="text-sm text-[#5a5a6e]">
              נחתם על ידי {fullName} • ת.ז. {idNumber} • {today}
            </p>

            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-xl font-bold text-white transition"
              style={{ backgroundColor: '#8b6f47' }}
            >
              הדפס מסמך 🖨️
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
