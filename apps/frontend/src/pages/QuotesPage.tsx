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
      <div className="sc-card p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-sc-text mb-4">תגובה להצעת מחיר — {senderName}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-sc-text">תוכן התגובה *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder="כתוב את תגובתך..."
              className="sc-input mt-1 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-sc-text">הצעת מחיר</label>
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="לדוגמה: 650,000 ₪"
              className="sc-input mt-1"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => respond.mutate({ quoteRequestId, content, priceOffer: price || undefined })}
            disabled={content.length < 5 || respond.isPending}
            className="sc-btn-primary flex-1 disabled:opacity-50"
          >
            {respond.isPending ? 'שולח...' : 'שלח תגובה'}
          </button>
          <button onClick={onClose} className="sc-btn-secondary flex-1">
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
    <div className="min-h-screen page-content bg-sc-bg" dir="rtl">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="sc-section-title text-2xl mb-6">📋 הצעות מחיר שהתקבלו</h1>

        {requests.length === 0 ? (
          <div className="sc-card p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sc-text-light">אין בקשות להצעות מחיר עדיין</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => {
              const responded = req.status === 'responded'
              return (
                <div
                  key={req.id}
                  className={`sc-card p-5 border-2 ${responded ? 'border-sc-success/30' : 'border-sc-border'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sc-text">{req.sender?.full_name || 'משתמש'}</p>
                        <span className={`sc-badge ${responded ? 'bg-sc-success/10 text-sc-success' : 'bg-sc-gold-dark/10 text-sc-gold-dark'}`}>
                          {statusLabel[req.status] || req.status}
                        </span>
                      </div>
                      <p className="text-xs text-sc-text-light mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-sc-text mb-3 bg-sc-bg rounded-lg p-3">{req.project_description}</p>

                  <div className="flex gap-4 text-xs text-sc-text-light">
                    {req.budget_range && <span>💰 {req.budget_range}</span>}
                    {req.timeline && <span>📅 {req.timeline}</span>}
                  </div>

                  {req.quote_responses?.length > 0 && (
                    <div className="mt-3 border-t border-sc-border pt-3">
                      <p className="text-xs font-medium text-sc-text-light mb-2">התגובות שלך:</p>
                      {req.quote_responses.map((r: any) => (
                        <div key={r.id} className="bg-sc-light-blue rounded-lg p-2 text-xs text-sc-primary mb-1">
                          {r.content}{r.price_offer && ` — ${r.price_offer}`}
                        </div>
                      ))}
                    </div>
                  )}

                  {!responded && (
                    <button
                      onClick={() => setRespondModal({ id: req.id, name: req.sender?.full_name || 'משתמש' })}
                      className="sc-btn-primary mt-3 w-full"
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
