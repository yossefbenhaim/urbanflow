import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import { trpc } from '../lib/trpc'
import { useNavigate } from 'react-router-dom'

export default function JoinProjectPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'code' | 'details' | 'done'>('code')
  const [form, setForm] = useState({
    floor: '',
    apartmentNumber: '',
    rooms: '',
    apartmentSizeSqm: '',
    ownershipType: 'owner' as 'owner' | 'renter',
  })

  const joinProject = trpc.tenant.joinProject.useMutation({
    onSuccess: () => setStep('details'),
    onError: () => {},
  })

  const updateProfile = trpc.tenant.updateApartmentProfile.useMutation({
    onSuccess: () => {
      setStep('done')
      setTimeout(() => navigate('/dashboard'), 2000)
    },
  })

  const handleJoin = () => {
    if (code.length === 6) joinProject.mutate({ inviteCode: code })
  }

  const handleDetails = () => {
    updateProfile.mutate({
      floor: form.floor ? parseInt(form.floor) : undefined,
      apartmentNumber: form.apartmentNumber || undefined,
      rooms: form.rooms ? parseInt(form.rooms) : undefined,
      apartmentSizeSqm: form.apartmentSizeSqm ? parseFloat(form.apartmentSizeSqm) : undefined,
      ownershipType: form.ownershipType,
    })
  }

  return (
    <PageLayout>
      <div className="max-w-md mx-auto">
        {step === 'code' && (
          <div className="sc-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#ebf1f7] flex items-center justify-center text-3xl mx-auto mb-5">🔗</div>
            <h1 className="text-xl font-bold text-[#212121] mb-2">שיוך לפרויקט</h1>
            <p className="text-[#5a5a6e] text-sm mb-6">הזן את קוד ההצטרפות שקיבלת ממארגן הדיירים</p>
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
              <p className="text-red-500 text-sm mb-3">קוד לא תקין, נסה שנית</p>
            )}
            <button
              onClick={handleJoin}
              disabled={code.length !== 6 || joinProject.isPending}
              className="sc-btn-primary w-full disabled:opacity-50"
            >
              {joinProject.isPending ? 'מצטרף...' : 'הצטרף לפרויקט'}
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="sc-card p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#4a8c5c]/10 flex items-center justify-center text-3xl mx-auto mb-4">🏠</div>
              <h1 className="text-xl font-bold text-[#212121] mb-1">פרטי הדירה</h1>
              <p className="text-[#5a5a6e] text-sm">נא למלא את פרטי הדירה שלך בפרויקט</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-1">קומה</label>
                  <input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                    className="sc-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-1">מס' דירה</label>
                  <input type="text" value={form.apartmentNumber} onChange={e => setForm(f => ({ ...f, apartmentNumber: e.target.value }))}
                    className="sc-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-1">חדרים</label>
                  <input type="number" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))}
                    className="sc-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-1">גודל (מ"ר)</label>
                  <input type="number" value={form.apartmentSizeSqm} onChange={e => setForm(f => ({ ...f, apartmentSizeSqm: e.target.value }))}
                    className="sc-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">סוג החזקה</label>
                <div className="flex gap-3">
                  {(['owner', 'renter'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, ownershipType: type }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.ownershipType === type
                          ? 'bg-[#3b6b9c] text-white border-[#3b6b9c]'
                          : 'bg-white text-[#212121] border-[#eeeeee] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      {type === 'owner' ? 'בעלים' : 'שוכר'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleDetails}
              disabled={updateProfile.isPending}
              className="sc-btn-primary w-full mt-6 disabled:opacity-50"
            >
              {updateProfile.isPending ? 'שומר...' : 'שמור והמשך'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="sc-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#4a8c5c]/10 flex items-center justify-center text-3xl mx-auto mb-5">✅</div>
            <h1 className="text-xl font-bold text-[#4a8c5c] mb-2">שויכת לפרויקט בהצלחה!</h1>
            <p className="text-[#5a5a6e] text-sm">מועבר לדשבורד...</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
