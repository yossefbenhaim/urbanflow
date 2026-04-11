import { useParams, useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import PageLayout from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { trpc } from '../lib/trpc'
import { useUser } from '../hooks/useUser'
import { getAgreementTemplate } from '../data/agreementTemplates'
import GenerateDocPDF from '../components/GenerateDocPDF'
import TemplateRenderer from '../components/TemplateRenderer'
import { buildVariablesFromProfile } from '../utils/templateRenderer'

export default function DocumentViewPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const { profile } = useUser()

  const { data: doc, isLoading, refetch } = trpc.tenant.getDocumentContent.useQuery(
    { docId: docId! },
    { enabled: !!docId }
  )

  const { data: tenantProfile } = trpc.tenant.getMyProfile.useQuery()
  const { data: projectData } = trpc.tenant.getMyProject.useQuery()

  // Check if user has uploaded a signed document for this docId
  const { data: uploadedFile } = trpc.tenant.getUploadedFile.useQuery(
    { docId: docId! },
    { enabled: !!docId, staleTime: 0 }
  )

  const signMutation = trpc.tenant.signDocumentWithSignature.useMutation({
    onSuccess: () => {
      refetch()
      toast.success('המסמך נחתם בהצלחה!')
    },
    onError: () => {
      toast.error('שגיאה בחתימת המסמך, נסה שוב')
    },
  })

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [signed, setSigned] = useState(false)

  // Get template content
  const contentKey = (doc as { content_key?: string })?.content_key
  const template = contentKey ? getAgreementTemplate(contentKey) : null

  // Build auto-filled variables from profile + tenant profile + project data
  const profileData = useMemo(
    () => buildVariablesFromProfile(profile as Record<string, unknown> | null | undefined, tenantProfile as Record<string, unknown> | null | undefined, projectData as Record<string, unknown> | null | undefined),
    [profile, tenantProfile, projectData],
  )

  // State for manually filled template fields (only for missing data)
  const [manualFields, setManualFields] = useState<Record<string, string>>({})

  // Merged variables for PDF generation
  const allVariables = useMemo(
    () => ({ ...profileData, ...manualFields }),
    [profileData, manualFields],
  )

  // Convenience aliases for signing flow
  const fullName = allVariables.fullName
  const idNumber = allVariables.idNumber
  const today = allVariables.date

  // Is already signed
  const alreadySigned = !!(doc as { mySig?: { signature_image?: string } })?.mySig

  useEffect(() => {
    if (alreadySigned) setSigned(true)
  }, [alreadySigned])

  // Canvas drawing
  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
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

  const handleFieldChange = useCallback((field: string, value: string) => {
    setManualFields(prev => ({ ...prev, [field]: value }))
  }, [])

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="sc-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
          <div className="sc-card p-5 space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-full" />
          </div>
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
              <h1 className="text-xl font-bold text-[#1e3a5f]">{template?.title || (doc as { title?: string }).title}</h1>
              <p className="text-xs text-[#5a5a6e]">תאריך: {today}</p>
            </div>
          </div>

          {/* Auto-filled data is now rendered inline via TemplateRenderer */}
        </div>

        {/* Show uploaded file if exists, otherwise show template */}
        {uploadedFile ? (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#4a8c5c]/30 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#4a8c5c]">
                <span className="text-xl">✅</span>
                <h2 className="text-base font-bold">מסמך חתום הועלה</h2>
              </div>
              <p className="text-sm text-[#64748b]">שם קובץ: {uploadedFile.file_name}</p>
              {(() => {
                const storagePath = uploadedFile.file_url.replace(/.*\/object\/public\/documents\//, '')
                const token = localStorage.getItem('sb-token')
                const downloadUrl = `/api/download?path=${encodeURIComponent(storagePath)}`
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(uploadedFile.file_name)
                const isPdf = /\.pdf$/i.test(uploadedFile.file_name)
                return (
                  <div className="space-y-3">
                    {isImage && (
                      <img
                        src={`${downloadUrl}&token=${encodeURIComponent(token || '')}`}
                        alt={uploadedFile.file_name}
                        className="max-w-full rounded-lg border border-[#e2e8f0]"
                      />
                    )}
                    {isPdf && (
                      <iframe
                        src={`${downloadUrl}&token=${encodeURIComponent(token || '')}`}
                        className="w-full h-[500px] rounded-lg border border-[#e2e8f0]"
                        title={uploadedFile.file_name}
                      />
                    )}
                    <a
                      href={`${downloadUrl}&token=${encodeURIComponent(token || '')}&download=true`}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#1e3a5f] hover:bg-[#1a3350] transition-colors no-underline"
                    >
                      ⬇️ הורד מסמך
                    </a>
                  </div>
                )
              })()}
            </div>
          </div>
        ) : template ? (
          <div className="bg-white rounded-[14px] shadow-sm border border-[#eeeeee] overflow-hidden">
            <div className="p-5 space-y-5">
              {template.sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-base font-bold text-[#1e3a5f] mb-2">{section.heading}</h2>
                  <div className="text-sm text-[#333] leading-relaxed">
                    <TemplateRenderer
                      content={section.content}
                      profileData={profileData}
                      manualFields={manualFields}
                      onFieldChange={handleFieldChange}
                    />
                  </div>
                  {i < template.sections.length - 1 && <hr className="mt-4 border-[#eeeeee]" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#fffbe6] rounded-[14px] p-4 border border-[#f5c518] text-sm text-[#5a5a6e]">
            תוכן המסמך אינו זמין להצגה — ניתן עדיין לחתום.
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

            {/* PDF download — passes merged auto+manual variables */}
            <GenerateDocPDF
              template={template}
              variables={allVariables}
              signatureImage={(doc as { mySig?: { signature_image?: string } })?.mySig?.signature_image || canvasRef.current?.toDataURL('image/png')}
              docTitle={(doc as { title?: string }).title ?? ''}
            />
          </div>
        )}
      </div>
    </PageLayout>
  )
}
