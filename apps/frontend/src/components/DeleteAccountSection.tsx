import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import { clearTokens } from '../hooks/useUser'

export default function DeleteAccountSection({ email }: { email: string | undefined }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')

  const deleteAccountMut = trpc.auth.deleteMyAccount.useMutation({
    onSuccess: () => {
      toast.success('החשבון נמחק לצמיתות')
      clearTokens()
      navigate('/')
    },
    onError: (err) => {
      toast.error(err.message || 'שגיאה במחיקת החשבון')
    },
  })

  return (
    <>
      <div className="mt-8 border-2 border-red-500/30 rounded-xl p-5 bg-red-500/5">
        <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
          ⚠️ אזור מסוכן
        </h3>
        <p className="text-[12px] text-[#5a5a6e] mb-3 leading-relaxed">
          מחיקת חשבון היא פעולה בלתי-הפיכה. כל המידע שלך יימחק לצמיתות —
          פרופיל, מסמכים, הצעות, פגישות, חוות דעת וכל פעילות אחרת במערכת.
          תוכל להירשם מחדש עם אותו אימייל אחר-כך.
        </p>
        <button
          onClick={() => { setShowModal(true); setConfirmEmail('') }}
          className="px-4 py-2 rounded-xl border-2 border-red-500 text-red-600 font-semibold text-sm bg-white hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
        >
          מחק את החשבון שלי
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          onClick={() => !deleteAccountMut.isPending && setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              ⚠️ אישור מחיקת חשבון
            </h2>
            <p className="text-[13px] text-[#212121] mb-2 leading-relaxed">
              פעולה זו <strong>בלתי-הפיכה</strong>. כל המידע שלך יימחק לצמיתות:
            </p>
            <ul className="text-[12px] text-[#5a5a6e] list-disc pr-5 mb-4 space-y-0.5">
              <li>פרופיל ופרטים אישיים</li>
              <li>מסמכים שהעלית</li>
              <li>הצעות, מכרזים וחוזים שיצרת או הגשת</li>
              <li>פגישות, הצבעות ומשימות</li>
              <li>דירוגים וחוות דעת</li>
            </ul>
            <label className="block text-xs font-semibold text-[#5a5a6e] mb-1">
              להמשך, הקלד את האימייל שלך: <span className="font-mono text-[#212121]" dir="ltr">{email}</span>
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              placeholder={email || ''}
              className="sc-input w-full mb-4"
              dir="ltr"
              autoFocus
              disabled={deleteAccountMut.isPending}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleteAccountMut.isPending}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#eeeeee] bg-white text-[#212121] font-semibold text-sm cursor-pointer hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={() => deleteAccountMut.mutate({ confirmEmail: confirmEmail.trim() })}
                disabled={
                  deleteAccountMut.isPending ||
                  confirmEmail.trim().toLowerCase() !== (email || '').toLowerCase()
                }
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm cursor-pointer hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleteAccountMut.isPending ? 'מוחק...' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
