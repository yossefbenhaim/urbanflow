import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import LoadingScreen from '../components/LoadingScreen'

export default function JoinProject() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'joining' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('')

  const joinByCode = trpc.organizer.joinByCode.useMutation({
    onSuccess: (data) => {
      setStatus('done')
      setMessage(data.alreadyMember ? 'כבר חבר בפרויקט זה' : 'הצטרפת לפרויקט ✓')
      setTimeout(() => navigate('/dashboard'), 1500)
    },
    onError: (err) => {
      setStatus('error')
      setMessage(err.message || 'שגיאה בהצטרפות')
    },
  })

  useEffect(() => {
    if (!code) return
    const token = localStorage.getItem('sb-token')
    if (token) {
      setStatus('joining')
      joinByCode.mutate({ code })
    } else {
      localStorage.setItem('pending_join_code', code)
      window.location.href = `https://urbanflow.byclick.co.il/login?redirect=/join/${code}`
    }
  }, [code])

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-[20px] shadow-card p-10 text-center max-w-sm w-full border border-[#eeeeee]">
        {status === 'checking' || status === 'joining' ? (
          <>
            <div className="w-[50px] h-[50px] bg-[#ebf1f7] rounded-[24px] flex items-center justify-center text-2xl mx-auto mb-4">🏰</div>
            <LoadingScreen />
            <p className="text-[#5a5a6e] text-[13px]">מצטרף לפרויקט...</p>
          </>
        ) : status === 'done' ? (
          <>
            <div className="w-[50px] h-[50px] bg-[#ebf1f7] rounded-[24px] flex items-center justify-center text-2xl mx-auto mb-4">🏰</div>
            <div className="bg-[#edf5ef] text-[#4a8c5c] rounded-[14px] p-4 mb-3">
              <p className="font-semibold text-[16px]">{message}</p>
            </div>
            <p className="text-[#5a5a6e] text-[13px] mt-2">מועבר לדשבורד...</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-500 font-semibold">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="sc-btn-primary mt-4"
            >
              חזרה לדשבורד
            </button>
          </>
        )}
      </div>
    </div>
  )
}
