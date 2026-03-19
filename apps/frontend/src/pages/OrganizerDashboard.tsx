import Navbar from '../components/Navbar'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import BuildingLoader from '../components/BuildingLoader'

type Tab = 'project' | 'tenants' | 'group' | 'contract'

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; expired: boolean; daysExpired: number }>({
    days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, daysExpired: 0,
  })

  useEffect(() => {
    const calc = () => {
      const end = new Date(endDate).getTime()
      const now = Date.now()
      const diff = end - now
      if (diff <= 0) {
        const daysExpired = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, daysExpired })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds, expired: false, daysExpired: 0 })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [endDate])

  if (timeLeft.expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <Navbar />
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-red-600 font-bold text-lg">תוקף החוזה פג לפני {timeLeft.daysExpired} ימים</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white text-center">
      <p className="text-blue-100 mb-4 text-sm font-medium">⏳ נותרו עד סיום החוזה</p>
      <div className="flex justify-center gap-4">
        {[{ v: timeLeft.days, l: 'ימים' }, { v: timeLeft.hours, l: 'שעות' }, { v: timeLeft.minutes, l: 'דקות' }, { v: timeLeft.seconds, l: 'שניות' }].map(({ v, l }) => (
          <div key={l} className="bg-white/20 rounded-xl px-4 py-3 min-w-[64px]">
            <div className="text-4xl font-bold tabular-nums">{String(v).padStart(2, '0')}</div>
            <div className="text-xs text-blue-100 mt-1">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupChat({ projectId, myId }: { projectId: string; myId: string }) {
  const [msgInput, setMsgInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const utils = trpc.useUtils()

  const groupQ = trpc.organizer.getProjectGroup.useQuery({ projectId })
  const createGroup = trpc.organizer.createProjectGroup.useMutation({
    onSuccess: () => utils.organizer.getProjectGroup.invalidate(),
  })
  const messagesQ = trpc.organizer.getGroupMessages.useQuery(
    { groupId: groupQ.data?.id ?? '' },
    { enabled: !!groupQ.data?.id, refetchInterval: 5000 }
  )
  const sendMsg = trpc.organizer.sendGroupMessage.useMutation({
    onSuccess: () => {
      setMsgInput('')
      utils.organizer.getGroupMessages.invalidate()
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQ.data])

  // loading handled by LoadingScreen

  if (!groupQ.data) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">💬</div>
        <p className="text-gray-500 mb-4">אין עדיין קבוצת בניין לפרויקט זה</p>
        <button
          onClick={() => createGroup.mutate({ projectId, name: 'קבוצת בניין' })}
          disabled={createGroup.isPending}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {createGroup.isPending ? 'יוצר...' : '+ צור קבוצת בניין'}
        </button>
      </div>
    )
  }

  const messages = messagesQ.data ?? []

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-xl">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm pt-8">אין הודעות עדיין</p>
        )}
        {messages.map((m: any) => {
          const isMe = m.sender_id === myId
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                {!isMe && <p className="text-xs text-gray-400 mb-1">{m.sender?.full_name}</p>}
                <p>{m.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3">
        <input
          value={msgInput}
          onChange={e => setMsgInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && msgInput.trim() && groupQ.data) sendMsg.mutate({ groupId: groupQ.data.id, content: msgInput }) }}
          placeholder="כתוב הודעה..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => { if (msgInput.trim() && groupQ.data) sendMsg.mutate({ groupId: groupQ.data.id, content: msgInput }) }}
          disabled={!msgInput.trim() || sendMsg.isPending}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          שלח
        </button>
      </div>
    </div>
  )
}

function ContractTab({ project, onSaved }: { project: any; onSaved: () => void }) {
  const [startDate, setStartDate] = useState(project.contract_start_date ?? '')
  const [endDate, setEndDate] = useState(project.contract_end_date ?? '')
  const [fileUrl, setFileUrl] = useState(project.contract_file_url ?? '')
  const [declared, setDeclared] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = trpc.organizer.saveContract.useMutation({
    onSuccess: () => { setSaved(true); onSaved() },
  })

  const hasContract = !!(project.contract_end_date || endDate)

  return (
    <div className="space-y-6">
      {hasContract && (project.contract_end_date || endDate) && (
        <CountdownTimer endDate={project.contract_end_date || endDate} />
      )}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">פרטי חוזה</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך תחילת חוזה</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום חוזה</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קישור לחוזה PDF (אופציונלי)</label>
          <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600" />
          <span className="text-sm text-gray-700">אני מצהיר שזהו החוזה החתום הרשמי</span>
        </label>
        {saved && <p className="text-green-600 text-sm">✓ החוזה נשמר בהצלחה</p>}
        <button
          onClick={() => save.mutate({ projectId: project.id, startDate, endDate, fileUrl: fileUrl || undefined })}
          disabled={!startDate || !endDate || !declared || save.isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {save.isPending ? 'שומר...' : 'שמור חוזה'}
        </button>
      </div>
    </div>
  )
}

function TenantsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const startConv = trpc.chat.startConversation.useMutation({
    onSuccess: (data) => navigate(`/chat/${data.conversationId}`),
  })

  const { data: tenants, isLoading } = trpc.organizer.getProjectTenants.useQuery({ projectId })

  // loading handled by LoadingScreen

  return (
    <div className="space-y-3">
      {(!tenants || tenants.length === 0) && (
        <p className="text-center text-gray-400 py-8">אין דיירים רשומים עדיין</p>
      )}
      {tenants?.map((t: any) => {
        const p = t.profiles
        if (!p) return null
        return (
          <div key={t.tenant_id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                {p.full_name?.charAt(0) ?? '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{p.full_name ?? 'לא ידוע'}</span>
                  {p.is_building_representative && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">🏛️ ועד</span>}
                </div>
                <div className="text-sm text-gray-500">{p.email}</div>
                {p.phone && <div className="text-xs text-gray-400">{p.phone}</div>}
              </div>
            </div>
            <button
              onClick={() => startConv.mutate({ recipientId: p.id })}
              className="text-sm px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              פתח שיחה
            </button>
          </div>
        )
      })}
    </div>
  )
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  PINUY_BINUY: 'פינוי בינוי',
  TAMA_38_1: 'תמ"א 38/1',
  TAMA_38_2: 'תמ"א 38/2',
}

export default function OrganizerDashboard() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('project')

  const { data: projects, isLoading, refetch } = trpc.organizer.getMyProjects.useQuery()
  const utils = trpc.useUtils()

  // Get current user id from token
  const meQ = trpc.auth.me.useQuery(undefined, { retry: false })
  const myId = (meQ.data as any)?.id ?? ''

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects])

  // Protect route
  useEffect(() => {
    const token = localStorage.getItem('sb-token')
    if (!token) { navigate('/login'); return }
  }, [])

  const selectedProject = projects?.find((p: any) => p.id === selectedProjectId)

  const copyInviteLink = (code: string) => {
    const url = `https://urbanflow.byclick.co.il/join/${code}`
    navigator.clipboard.writeText(url)
    alert('הקישור הועתק!')
  }

  const shareWhatsApp = (project: any) => {
    const url = `https://urbanflow.byclick.co.il/join/${project.invite_code}`
    const text = encodeURIComponent(`שלום! הוזמנת לפרויקט "${project.name}" בפלטפורמת Silver Castle. להצטרפות לחץ: ${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'project', label: 'פרויקט' },
    { key: 'tenants', label: 'דיירים' },
    { key: 'group', label: 'קבוצה' },
    { key: 'contract', label: 'חוזה' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Silver Castle" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-gray-800">מארגן דיירים</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-400 font-medium mb-2 px-2">הפרויקטים שלי</p>
          {isLoading && <div className="px-2"><BuildingLoader size="sm" /></div>}
          {projects?.map((p: any) => (
            <button
              key={p.id}
              onClick={() => { setSelectedProjectId(p.id); setActiveTab('project') }}
              className={`w-full text-right px-3 py-3 rounded-xl mb-1 transition-colors ${selectedProjectId === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{PROJECT_TYPE_LABELS[p.type] ?? p.type}</div>
            </button>
          ))}
          {(!projects || projects.length === 0) && !isLoading && (
            <p className="text-sm text-gray-400 px-2">אין פרויקטים עדיין</p>
          )}
        </div>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            ← חזרה לדשבורד
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">🏗️</div>
              <p>בחר פרויקט מהתפריט</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h1>
              <p className="text-gray-500 text-sm mt-1">{PROJECT_TYPE_LABELS[selectedProject.type] ?? selectedProject.type}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'project' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">שם פרויקט</label>
                    <p className="text-gray-800 font-medium mt-0.5">{selectedProject.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">סוג</label>
                    <p className="text-gray-800 mt-0.5">{PROJECT_TYPE_LABELS[selectedProject.type] ?? selectedProject.type}</p>
                  </div>
                  {selectedProject.address && (
                    <div>
                      <label className="text-xs text-gray-400 font-medium">כתובת</label>
                      <p className="text-gray-800 mt-0.5">{selectedProject.address}</p>
                    </div>
                  )}
                </div>

                {selectedProject.invite_code && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-3">קישור הצטרפות לדיירים</h3>
                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono mb-4 break-all">
                      https://urbanflow.byclick.co.il/join/{selectedProject.invite_code}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => copyInviteLink(selectedProject.invite_code)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        📋 העתק קישור
                      </button>
                      <button
                        onClick={() => shareWhatsApp(selectedProject)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl hover:bg-green-600 transition-colors text-sm font-medium"
                      >
                        📱 שתף ב-WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tenants' && <TenantsTab projectId={selectedProject.id} />}

            {activeTab === 'group' && (
              <GroupChat projectId={selectedProject.id} myId={myId} />
            )}

            {activeTab === 'contract' && (
              <ContractTab project={selectedProject} onSaved={() => utils.organizer.getMyProjects.invalidate()} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
