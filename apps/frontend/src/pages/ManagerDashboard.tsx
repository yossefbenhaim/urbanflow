import { useState } from 'react'
import Navbar from '../components/Navbar'
import { trpc } from '../lib/trpc'

export default function ManagerDashboard() {
  const { data: projects, isLoading, refetch } = trpc.organizer.getProjects.useQuery()
  const createProject = trpc.organizer.createProject.useMutation({ onSuccess: () => { refetch(); setShowModal(false); setNewName(''); setNewAddress('') } })
  const inviteByEmail = trpc.organizer.inviteByEmail.useMutation({ onSuccess: () => setInviteEmail('') })

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  const { data: tenants } = trpc.organizer.getProjectTenants.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  )

  const selectedProject = projects?.find((p: any) => p.id === selectedProjectId)

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">לוח הבקרה — מארגן דיירים</h1>
            <p className="text-gray-500 text-sm mt-1">{projects?.length ?? 0} פרויקטים פעילים</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + פרויקט חדש
          </button>
        </div>

        <div className="flex gap-6">
          {/* Projects list */}
          <div className="flex-1">
            {!projects || projects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                <div className="text-5xl mb-4">🏗️</div>
                <p className="text-lg font-medium">אין פרויקטים עדיין</p>
                <p className="text-sm mt-1">לחץ על "פרויקט חדש" כדי להתחיל</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {projects.map((project: any) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id === selectedProjectId ? null : project.id)}
                    className={`bg-white rounded-2xl border shadow-sm p-6 cursor-pointer transition-all ${
                      selectedProjectId === project.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                        {project.address && <p className="text-gray-500 text-sm mt-0.5">{project.address}</p>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {(project.project_tenants as any)?.[0]?.count ?? 0} דיירים
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">קוד הצטרפות:</span>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{project.invite_code}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(project.invite_code) }}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        title="העתק קוד"
                      >
                        📋 העתק
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project detail panel */}
          {selectedProject && (
            <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 self-start">
              <h2 className="font-bold text-gray-900 text-lg mb-4">{selectedProject.name}</h2>

              {/* Invite by email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">הזמן דייר במייל</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                  <button
                    onClick={() => inviteByEmail.mutate({ projectId: selectedProject.id, email: inviteEmail })}
                    disabled={!inviteEmail || inviteByEmail.isPending}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    שלח
                  </button>
                </div>
                {inviteByEmail.isSuccess && <p className="text-green-600 text-xs mt-1">ההזמנה נשלחה ✓</p>}
              </div>

              {/* Tenants list */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">דיירים ({tenants?.length ?? 0})</h3>
                {!tenants || tenants.length === 0 ? (
                  <p className="text-gray-400 text-sm">אין דיירים עדיין</p>
                ) : (
                  <div className="space-y-2">
                    {tenants.map((t: any) => (
                      <div key={t.tenant_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                          {t.profiles?.full_name?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.profiles?.full_name ?? 'ללא שם'}</p>
                          <p className="text-xs text-gray-400 truncate">{t.profiles?.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">פרויקט חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם הפרויקט *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="לדוגמה: בניין רחוב הרצל 5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="רחוב, עיר"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => createProject.mutate({ name: newName, address: newAddress || undefined })}
                disabled={!newName.trim() || createProject.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createProject.isPending ? 'יוצר...' : 'צור פרויקט'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
