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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
        {status === 'checking' || status === 'joining' ? (
          <>
            <BuildingLoader size="lg" />
            <p className="text-gray-600">מצטרף לפרויקט...</p>
          </>
        ) : status === 'done' ? (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-green-700 font-semibold text-lg">{message}</p>
            <p className="text-gray-500 text-sm mt-2">מועבר לדשבורד...</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 font-semibold">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              חזרה לדשבורד
            </button>
          </>
        )}
      </div>
    </div>
  )
}
