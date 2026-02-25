import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useUser, ROLE_LABELS } from '../hooks/useUser'
import { trpc } from '../lib/trpc'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, loading } = useUser()
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saved, setSaved] = useState(false)

  const updateProfile = trpc.tenant.updateProfile.useMutation({
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  useEffect(() => {
    if (!loading && !localStorage.getItem('sb-token')) navigate('/')
  }, [loading, navigate])

  useEffect(() => {
    if (profile) setForm({ fullName: profile.fullName || '', phone: profile.phone || '' })
  }, [profile])

  const roleInfo = profile?.role ? ROLE_LABELS[profile.role] : null

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">הפרופיל שלי</h1>

        {loading ? (
          <div className="text-center text-gray-400 py-12">טוען...</div>
        ) : (
          <div className="space-y-4">

            {/* Role badge */}
            {roleInfo && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <span className="text-2xl">{roleInfo.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">תפקיד במערכת</p>
                  <p className="font-semibold text-gray-900">{roleInfo.label}</p>
                </div>
              </div>
            )}

            {/* Editable fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Readonly fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <div>
                <p className="text-xs text-gray-500">אימייל</p>
                <p className="text-gray-900 font-medium">{profile?.email}</p>
              </div>
              {profile?.idNumber && (
                <div>
                  <p className="text-xs text-gray-500">תעודת זהות</p>
                  <p className="text-gray-900 font-medium">{profile.idNumber}</p>
                </div>
              )}
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium text-center">
                ✅ הפרופיל עודכן בהצלחה
              </div>
            )}
            {updateProfile.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                שגיאה: {updateProfile.error.message}
              </div>
            )}

            <button
              onClick={() => updateProfile.mutate({ fullName: form.fullName, phone: form.phone })}
              disabled={updateProfile.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateProfile.isPending ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
