import { useState } from 'react'
import { trpc } from '../lib/trpc'
import Navbar from '../components/Navbar'

interface RespondModalProps {
  quoteRequestId: string
  senderName: string
  onClose: () => void
  onSuccess: () => void
}

function RespondModal({ quoteRequestId, senderName, onClose, onSuccess }: RespondModalProps) {
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const respond = trpc.quotes.respond.useMutation({
    onSuccess: () => { onSuccess(); onClose() }
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">תגובה להצעת מחיר — {senderName}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">תוכן התגובה *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder="כתוב את תגובתך..."
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">הצעת מחיר</label>
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="לדוגמה: 650,000 ₪"
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => respond.mutate({ quoteRequestId, content, priceOffer: price || undefined })}
            disabled={content.length < 5 || respond.isPending}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {respond.isPending ? 'שולח...' : 'שלח תגובה'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuotesPage() {
  const [respondModal, setRespondModal] = useState<{ id: string; name: string } | null>(null)
  const { data: requests = [], refetch } = trpc.quotes.getMyRequests.useQuery()

  const statusLabel: Record<string, string> = {
    pending: '⏳ ממתין',
    responded: '✅ נענה',
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📋 הצעות מחיר שהתקבלו</h1>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">אין בקשות להצעות מחיר עדיין</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => {
              const responded = req.status === 'responded'
              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${responded ? 'border-green-200' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{req.sender?.full_name || 'משתמש'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${responded ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {statusLabel[req.status] || req.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 bg-gray-50 rounded-lg p-3">{req.project_description}</p>

                  <div className="flex gap-4 text-xs text-gray-500">
                    {req.budget_range && <span>💰 {req.budget_range}</span>}
                    {req.timeline && <span>📅 {req.timeline}</span>}
                  </div>

                  {req.quote_responses?.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">התגובות שלך:</p>
                      {req.quote_responses.map((r: any) => (
                        <div key={r.id} className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800 mb-1">
                          {r.content}{r.price_offer && ` — ${r.price_offer}`}
                        </div>
                      ))}
                    </div>
                  )}

                  {!responded && (
                    <button
                      onClick={() => setRespondModal({ id: req.id, name: req.sender?.full_name || 'משתמש' })}
                      className="mt-3 w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      הגב להצעה
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {respondModal && (
        <RespondModal
          quoteRequestId={respondModal.id}
          senderName={respondModal.name}
          onClose={() => setRespondModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}
