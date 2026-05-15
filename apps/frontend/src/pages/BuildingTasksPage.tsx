import { useState } from 'react'
import { toast } from 'sonner'
import { trpc } from '../lib/trpc'
import PageLayout, { PageTitle } from '../components/PageLayout'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  open: { text: 'פתוח', color: 'bg-[#fff4e0] text-[#8b6f47]' },
  in_progress: { text: 'בתהליך', color: 'bg-[#ebf1f7] text-[#3b6b9c]' },
  done: { text: '✅ הושלם', color: 'bg-[#dff2e1] text-[#4a8c5c]' },
  cancelled: { text: 'בוטל', color: 'bg-gray-100 text-gray-600' },
}

const KIND_LABEL: Record<string, string> = {
  upload_contract: '📄 העלאת חוזה',
}

export default function BuildingTasksPage() {
  const utils = trpc.useUtils()
  const { data: tasks = [], isLoading } = trpc.buildingTasks.listMine.useQuery()

  const updateStatus = trpc.buildingTasks.updateStatus.useMutation({
    onSuccess: () => { utils.buildingTasks.listMine.invalidate(); toast.success('סטטוס עודכן') },
    onError: (e) => toast.error(e.message),
  })

  const open = tasks.filter((t: any) => t.status === 'open' || t.status === 'in_progress')
  const done = tasks.filter((t: any) => t.status === 'done')

  return (
    <PageLayout>
      <PageTitle>📝 המשימות שלי</PageTitle>

      {isLoading && <p className="text-center text-[#5a5a6e] py-8 text-sm">טוען…</p>}

      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-[#5a5a6e] text-sm">אין משימות פתוחות.</p>
        </div>
      )}

      {open.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-[#212121] mb-2">פעילות ({open.length})</h3>
          <div className="space-y-2">
            {open.map((t: any) => (
              <TaskRow key={t.id} task={t} onUpload={() => {}}
                onProgress={() => updateStatus.mutate({ taskId: t.id, status: 'in_progress' })}
                onDone={() => updateStatus.mutate({ taskId: t.id, status: 'done' })} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-[#212121] mb-2">הושלמו ({done.length})</h3>
          <div className="space-y-2">
            {done.map((t: any) => <TaskRow key={t.id} task={t} readonly />)}
          </div>
        </section>
      )}
    </PageLayout>
  )
}

function TaskRow({ task, onProgress, onDone, readonly }: {
  task: any; onProgress?: () => void; onDone?: () => void; readonly?: boolean;
  onUpload?: () => void;
}) {
  const utils = trpc.useUtils()
  const [uploading, setUploading] = useState(false)
  const uploadFile = trpc.buildingTasks.uploadFile.useMutation({
    onSuccess: () => { utils.buildingTasks.listMine.invalidate(); toast.success('הקובץ הועלה') },
    onError: (e) => toast.error(e.message),
  })

  const status = STATUS_LABEL[task.status] ?? { text: task.status, color: 'bg-gray-100' }
  const kindLabel = KIND_LABEL[task.kind] ?? task.kind
  const building = task.building?.address || ''

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `negotiation_contracts/${task.id}-${Date.now()}.${ext}`
      const token = localStorage.getItem('sb-token') || ''
      const uploadRes = await fetch(`/api/upload?path=${encodeURIComponent(storagePath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({} as { error?: string }))
        throw new Error(errJson.error || `שגיאה ${uploadRes.status}`)
      }
      const fileUrl = `https://supabase.byclick.co.il/storage/v1/object/public/documents/${storagePath}`
      uploadFile.mutate({ taskId: task.id, fileUrl })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="sc-card p-4">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-[#212121] text-sm">{kindLabel} · {task.title}</p>
        <span className={`sc-badge ${status.color}`}>{status.text}</span>
      </div>
      {building && <p className="text-xs text-[#5a5a6e] mb-1">🏢 {building}</p>}
      {task.description && <p className="text-xs text-[#5a5a6e] mb-2 leading-relaxed">{task.description}</p>}

      {!readonly && (
        <div className="flex flex-wrap gap-2 mt-3">
          {task.kind === 'upload_contract' && (
            <label className="sc-btn-primary cursor-pointer">
              {uploading ? 'מעלה…' : '📎 העלה קובץ'}
              <input type="file" hidden onChange={handleFileChange} accept=".pdf,.doc,.docx,image/*"/>
            </label>
          )}
          {task.status === 'open' && onProgress && (
            <button onClick={onProgress} className="sc-btn-secondary">סמן בתהליך</button>
          )}
          {onDone && (
            <button onClick={onDone} className="sc-btn-secondary">סמן כהושלם</button>
          )}
        </div>
      )}

      {task.file_url && (
        <a href={task.file_url} target="_blank" rel="noreferrer"
          className="block mt-2 text-xs text-[#3b6b9c] underline">📄 צפה בקובץ</a>
      )}
    </div>
  )
}
