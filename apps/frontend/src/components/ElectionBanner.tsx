import { useState } from 'react'
import { trpc } from '../lib/trpc'

const FORM_DOWNLOAD_URL = '/forms/representative-election-form.pdf'

export default function ElectionBanner({ buildingId, formType = 'representative' }: { buildingId: string; formType?: 'representative' | 'organizer' }) {
  const [uploading, setUploading] = useState(false)

  const electionFormType = formType === 'representative' ? 'representative_election_form' : 'organizer_election_form' as const

  const { data: status, refetch } = trpc.committee.getElectionStatus.useQuery(
    { buildingId },
    { enabled: !!buildingId }
  )

  const uploadForm = trpc.committee.uploadElectionForm.useMutation({
    onSuccess: () => { refetch(); setUploading(false) },
    onError: () => setUploading(false),
  })

  if (!status?.representative && formType === 'representative') return null

  const title = formType === 'representative'
    ? `${status?.representative?.name ?? 'הנציג'} נבחר/ה ברוב קולות כנציג/ת הדיירים!`
    : 'מארגן/מנהלת נבחר/ה ברוב קולות!'

  const formLabel = formType === 'representative'
    ? 'טופס בחירת נציגות'
    : 'טופס בחירת מארגן / מנהלת'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fakeUrl = `https://storage.example.com/election-forms/${buildingId}/${Date.now()}-${file.name}`
    uploadForm.mutate({
      buildingId,
      formType: electionFormType,
      fileUrl: fakeUrl,
      fileName: file.name,
    })
  }

  return (
    <div className="sc-card border-t-4 border-t-[#4a8c5c] p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">🎉</span>
        <div className="flex-1">
          <h3 className="text-[15px] font-bold text-[#212121] mb-1">{title}</h3>
          <p className="text-[13px] text-[#5a5a6e] mb-3">
            נשאר לכם רק לחתום על {formLabel} ולהעלות אותו חתום אלינו.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <a
              href={FORM_DOWNLOAD_URL}
              download
              className="sc-btn-primary text-sm inline-flex items-center gap-1.5"
            >
              📥 להורדת הטופס לחצו כאן
            </a>
          </div>

          {status?.myFormUploaded ? (
            <div className="bg-[#4a8c5c]/10 border border-[#4a8c5c]/30 rounded-xl p-3">
              <p className="text-xs text-[#4a8c5c] font-semibold m-0">
                ✅ הטופס החתום שלך הועלה בהצלחה!
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[13px] font-semibold text-[#212121] mb-2">
                📤 העלאת טופס חתום:
              </label>
              <div
                className="border-2 border-dashed border-[#eeeeee] rounded-xl p-4 text-center cursor-pointer hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 transition-colors"
                onClick={() => document.getElementById(`election-form-input-${formType}`)?.click()}
              >
                <input
                  id={`election-form-input-${formType}`}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploading ? (
                  <p className="text-sm text-[#3b6b9c]">מעלה...</p>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📄</span>
                    <p className="text-sm font-semibold text-[#212121]">לחץ להעלאת הטופס החתום</p>
                    <p className="text-xs text-[#5a5a6e]">PDF או תמונה</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#5a5a6e] mt-3">
            📊 {status?.totalFormsUploaded ?? 0} דיירים כבר העלו טופס חתום
          </p>
        </div>
      </div>
    </div>
  )
}
