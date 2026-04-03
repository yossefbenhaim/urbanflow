import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import BuildingLoader from '../components/BuildingLoader'

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
    <div className="min-h-screen bg-sc-bg flex items-center justify-center" dir="rtl">
      <div className="sc-card p-10 text-center max-w-sm w-full">
        {status === 'checking' || status === 'joining' ? (
          <>
            <BuildingLoader size="lg" />
            <p className="text-sc-text-light">מצטרף לפרויקט...</p>
          </>
        ) : status === 'done' ? (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-sc-success font-semibold text-lg">{message}</p>
            <p className="text-sc-text-light text-sm mt-2">מועבר לדשבורד...</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-sc-error font-semibold">{message}</p>
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
