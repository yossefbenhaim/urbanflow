import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { useUser, ROLE_LABELS } from '../hooks/useUser'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut, refetch } = useUser()

  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
      })
    }
  }, [profile])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [loading, user, navigate])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: form.fullName, phone: form.phone })
      .eq('id', user.id)

    if (err) {
      setError('שגיאה בשמירה: ' + err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (refetch) refetch()
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">טוען...</div>
      </div>
    )
  }

  const roleInfo = profile?.role ? ROLE_LABELS[profile.role] : null
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-lg mx-auto p-4 space-y-4 pt-6">

        {/* Avatar + Role Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-lg truncate">
                {profile?.full_name || 'שם לא הוגדר'}
              </p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              {roleInfo && (
                <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 text-base">עריכת פרטים</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="שם מלא"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="050-0000000"
              type="tel"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              value={user?.email || ''}
              readOnly
              className="w-full px-4 py-3 border border-gray-100 rounded-xl text-gray-400 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">לא ניתן לשינוי</p>
          </div>

          {profile?.id_number && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תעודת זהות</label>
              <input
                value={profile.id_number}
                readOnly
                className="w-full px-4 py-3 border border-gray-100 rounded-xl text-gray-400 bg-gray-50 cursor-not-allowed"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            }`}
          >
            {saving ? 'שומר...' : saved ? '✅ נשמר בהצלחה' : 'שמור שינויים'}
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 text-base">פרטי חשבון</h2>

          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-gray-400 text-sm">סוג משתמש</span>
            {roleInfo ? (
              <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${roleInfo.color}`}>
                {roleInfo.icon} {roleInfo.label}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">לא הוגדר</span>
            )}
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-gray-400 text-sm">מזהה משתמש</span>
            <span className="text-xs text-gray-400 font-mono">{user?.id?.slice(0, 8)}...</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400 text-sm">תאריך הצטרפות</span>
            <span className="text-sm text-gray-600">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('he-IL')
                : '—'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          התנתקות מהמערכת
        </button>

        <div className="h-6" />
      </div>
    </div>
  )
}
