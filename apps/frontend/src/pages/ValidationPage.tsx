import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

const RESULT_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  possible: { icon: '✅', label: 'אפשרי', color: '#16a34a', bg: '#f0fdf4' },
  unlikely: { icon: '⚠️', label: 'לא סביר', color: '#ca8a04', bg: '#fefce8' },
  not_possible: { icon: '❌', label: 'לא אפשרי', color: '#dc2626', bg: '#fef2f2' },
  needs_review: { icon: '🔍', label: 'דורש בדיקה', color: '#2563eb', bg: '#eff6ff' },
}

const TYPE_LABELS: Record<string, string> = {
  floor: 'קומה',
  balcony: 'מרפסת',
  sukkah: 'מרפסת סוכה',
  parking: 'חניה',
  rooms: 'חדרים',
  sqm: 'שטח (מ"ר)',
  other: 'אחר',
}

export default function ValidationPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('sb-token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserId(payload.sub)
      } catch { /* ignore */ }
    }
  }, [])

  const validations = trpc.validation.getMyValidations.useQuery(undefined, {
    enabled: !!userId,
  })

  const validateMutation = trpc.validation.validateExpectations.useMutation({
    onSuccess: () => {
      setHasRun(true)
      validations.refetch()
    },
  })

  const handleValidate = () => {
    if (userId) {
      validateMutation.mutate({ userId })
    }
  }

  const latestValidations = validations.data?.slice(0, 10) ?? []

  return (
    <div className="min-h-screen bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-sc-text mb-2">🏗️ הערכת ציפיות</h1>
          <p className="text-sc-text-light text-sm">
            בדיקה אוטומטית של הציפיות שלך מול המתווה העירוני
          </p>
        </div>

        {/* Run Validation Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleValidate}
            disabled={validateMutation.isPending || !userId}
            className="sc-btn-primary px-8 py-3 text-base disabled:opacity-50"
          >
            {validateMutation.isPending ? '🔄 בודק...' : '🔍 בדוק את הציפיות שלי'}
          </button>
          {validateMutation.isError && (
            <p className="text-sc-error text-sm mt-2">
              {(validateMutation.error as any)?.message || 'שגיאה בבדיקה'}
            </p>
          )}
        </div>

        {/* Validation Results from mutation */}
        {validateMutation.data?.validations && validateMutation.data.validations.length > 0 && (
          <div className="sc-card p-6 mb-6">
            <h2 className="text-lg font-bold text-sc-text mb-1">
              תוצאות עבור {validateMutation.data.city}
            </h2>
            <p className="text-xs text-sc-text-light mb-4">
              לפי מתווה: עד {validateMutation.data.outline?.max_floors} קומות
              {validateMutation.data.outline?.sukkah_balcony_allowed ? ' | סוכה מותרת' : ''}
              {' | '}חניה: {validateMutation.data.outline?.parking_required_per_unit} ליח"ד
            </p>
            <div className="space-y-3">
              {validateMutation.data.validations.map((v: any, i: number) => {
                const config = RESULT_CONFIG[v.validation_result] || RESULT_CONFIG.needs_review
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: config.bg, borderColor: config.color + '30' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="font-semibold text-sm" style={{ color: config.color }}>
                          {TYPE_LABELS[v.request_type] || v.request_type}
                        </span>
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ backgroundColor: config.color + '15', color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sc-text-light text-sm mt-1">
                      <strong>ביקשת:</strong> {v.requested_value}
                    </p>
                    <p className="text-sc-text text-sm mt-1">{v.explanation}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(validateMutation.data as any)?.message && !validateMutation.data?.validations?.length && (
          <div className="sc-card p-6 text-center text-sc-text-light mb-6">
            <p>{(validateMutation.data as any).message}</p>
          </div>
        )}

        {/* History */}
        {latestValidations.length > 0 && !hasRun && (
          <div className="sc-card p-6">
            <h2 className="text-lg font-bold text-sc-text mb-4">📋 היסטוריית בדיקות</h2>
            <div className="space-y-3">
              {latestValidations.map((v: any) => {
                const config = RESULT_CONFIG[v.validation_result] || RESULT_CONFIG.needs_review
                return (
                  <div
                    key={v.id}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: config.bg, borderColor: config.color + '30' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{config.icon}</span>
                      <span className="font-semibold text-sm" style={{ color: config.color }}>
                        {TYPE_LABELS[v.request_type] || v.request_type}: {v.requested_value}
                      </span>
                    </div>
                    <p className="text-sc-text text-sm">{v.explanation}</p>
                    <p className="text-xs text-sc-text-light mt-1">
                      {new Date(v.validated_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!userId && (
          <div className="sc-card p-8 text-center">
            <p className="text-sc-text-light">יש להתחבר כדי לבדוק את הציפיות שלך.</p>
          </div>
        )}
      </div>
    </div>
  )
}
