import { useState } from 'react'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import BuildingLoader from '../components/BuildingLoader'

export default function ManagerDashboard() {
  const { data: projects, isLoading, refetch } = trpc.organizer.getProjects.useQuery()
  const createProject = trpc.organizer.createProject.useMutation({ onSuccess: () => { refetch(); setShowModal(false); setNewName(''); setAddress({ city: '', street: '', buildingNumber: '' }) } })
  const inviteByEmail = trpc.organizer.inviteByEmail.useMutation({ onSuccess: () => setInviteEmail('') })

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [renewalType, setRenewalType] = useState<'pinuy_binuy' | 'tama_38_b' | 'halufat_shaked' | 'binuy_pinuy'>('pinuy_binuy')
  const [address, setAddress] = useState({ city: '', street: '', buildingNumber: '' })
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  const { data: tenants } = trpc.organizer.getProjectTenants.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  )

  const selectedProject = projects?.find((p: any) => p.id === selectedProjectId)

  const managerSidebar = [
    { to: '/manager', icon: '🏠', label: 'ראשי' },
    { to: '/manager', icon: '📊', label: 'פרויקטים' },
    { to: '/manager', icon: '👥', label: 'דיירים' },
    { to: '/tenders', icon: '📋', label: 'מכרזים' },
    { to: '/profile', icon: '👤', label: 'פרופיל' },
  ]

  if (isLoading) return (<PageLayout sidebarItems={managerSidebar}><div className="flex justify-center items-center h-64"><BuildingLoader size="lg" /></div></PageLayout>)

  return (
    <PageLayout sidebarItems={managerSidebar}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <PageTitle>לוח הבקרה — מארגן דיירים</PageTitle>
            <p className="text-[#5a5a6e] text-[13px] mt-1">{projects?.length ?? 0} פרויקטים פעילים</p>
          </div>
          <button onClick={() => setShowModal(true)} className="sc-btn-gold">
            + פרויקט חדש
          </button>
        </div>

        <div className="flex gap-6">
          {/* Projects list */}
          <div className="flex-1">
            {!projects || projects.length === 0 ? (
              <div className="sc-card p-12 text-center text-[#5a5a6e]">
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
                    className={`sc-card p-6 cursor-pointer transition-all ${
                      selectedProjectId === project.id ? 'border-[#3b6b9c] ring-2 ring-sc-light-blue' : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-[#212121] text-lg">{project.name}</h3>
                        {project.address && <p className="text-[#5a5a6e] text-sm mt-0.5">{project.address}</p>}
                      </div>
                      <span className="text-xs text-[#5a5a6e]">
                        {(project.project_tenants as any)?.[0]?.count ?? 0} דיירים
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[#5a5a6e]">קוד הצטרפות:</span>
                      <span className="sc-badge bg-[#ebf1f7] text-[#3b6b9c] font-mono font-bold">{project.invite_code}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(project.invite_code) }}
                        className="text-xs text-[#5a5a6e] hover:text-[#212121] transition-colors"
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
            <div className="w-80 sc-card p-6 self-start">
              <h2 className="font-bold text-[#212121] text-lg mb-4">{selectedProject.name}</h2>

              {/* Invite by email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#212121] mb-2">הזמן דייר במייל</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="sc-input flex-1"
                    dir="ltr"
                  />
                  <button
                    onClick={() => inviteByEmail.mutate({ projectId: selectedProject.id, email: inviteEmail })}
                    disabled={!inviteEmail || inviteByEmail.isPending}
                    className="sc-btn-primary px-3 py-2 text-sm disabled:opacity-50"
                  >
                    שלח
                  </button>
                </div>
                {inviteByEmail.isSuccess && <p className="text-[#4a8c5c] text-xs mt-1">ההזמנה נשלחה ✓</p>}
              </div>

              {/* Tenants list */}
              <div>
                <h3 className="text-sm font-medium text-[#212121] mb-3">דיירים ({tenants?.length ?? 0})</h3>
                {!tenants || tenants.length === 0 ? (
                  <p className="text-[#5a5a6e] text-sm">אין דיירים עדיין</p>
                ) : (
                  <div className="space-y-2">
                    {tenants.map((t: any) => (
                      <div key={t.tenant_id} className="flex items-center gap-3 p-2 bg-[#f8f9fa] rounded-lg">
                        <div className="w-8 h-8 bg-[#ebf1f7] rounded-full flex items-center justify-center text-[#3b6b9c] font-medium text-sm">
                          {t.profiles?.full_name?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#212121] truncate">{t.profiles?.full_name ?? 'ללא שם'}</p>
                          <p className="text-xs text-[#5a5a6e] truncate">{t.profiles?.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowModal(false); setAddress({ city: '', street: '', buildingNumber: '' }) }}>
          <div className="bg-white rounded-[14px] shadow-card p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-bold text-[#212121] mb-4">פרויקט חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="sc-label">שם הפרויקט *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="לדוגמה: בניין רחוב הרצל 5"
                  className="sc-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-1">סוג התחדשות</label>
                <select
                  value={renewalType}
                  onChange={(e) => setRenewalType(e.target.value as any)}
                  className="sc-input"
                >
                  <option value="pinuy_binuy">פינוי בינוי</option>
                  <option value="tama_38_b">תמ״א 38/ב</option>
                  <option value="halufat_shaked">חלופת שקד</option>
                  <option value="binuy_pinuy">בינוי פינוי</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-1">כתובת</label>
                <AddressPicker value={address} onChange={setAddress} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => createProject.mutate({ name: newName, renewalType, address: address.city && address.street ? `${address.street} ${address.buildingNumber}, ${address.city}` : undefined })}
                disabled={!newName.trim() || createProject.isPending}
                className="sc-btn-primary flex-1 disabled:opacity-50"
              >
                {createProject.isPending ? 'יוצר...' : 'צור פרויקט'}
              </button>
              <button
                onClick={() => { setShowModal(false); setAddress({ city: '', street: '', buildingNumber: '' }) }}
                className="sc-btn-secondary flex-1"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
