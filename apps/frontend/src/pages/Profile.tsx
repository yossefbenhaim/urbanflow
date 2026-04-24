import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import PageLayout from '../components/PageLayout'
import { useUser, ROLE_LABELS, clearTokens } from '../hooks/useUser'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import LoadingScreen from '../components/LoadingScreen'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

const SPECIAL_REQUESTS_OPTIONS = [
  { key: 'balcony', label: '🌿 מרפסת' },
  { key: 'sukkah_balcony', label: '🕍 מרפסת סוכה' },
  { key: 'two_sides', label: '🌬️ שני כיווני אוויר' },
  { key: 'parking', label: '🚗 חניה' },
  { key: 'storage', label: '📦 מחסן' },
  { key: 'specific_floor', label: '🏢 קומה מסוימת' },
  { key: 'near_elevator', label: '🛗 קרבה למעלית' },
  { key: 'large_balcony', label: '🌞 מרפסת גדולה' },
  { key: 'corner_apt', label: '🔲 דירה פינתית' },
  { key: 'accessible', label: '♿ נגישות לנכים' },
  { key: 'other', label: '✏️ אחר' },
]

const BUILDING_STAGE_OPTIONS = [
  { key: 'just_starting', label: '🏁 רק עכשיו מתחילים' },
  { key: 'chose_representatives', label: '👥 כבר בחרנו נציגות' },
  { key: 'signed_lawyer', label: '⚖️ כבר חתמנו עם עו"ד / גורם מלווה' },
  { key: 'signed_developer', label: '🏗️ כבר חתמנו עם יזם' },
]

const APARTMENT_EXTRAS_OPTIONS = [
  { key: 'closed_balcony', label: '🪟 סגירת מרפסת' },
  { key: 'expansion', label: '📐 הרחבת דירה' },
  { key: 'roof_use', label: '🏠 שימוש בגג' },
  { key: 'yard_attachment', label: '🌳 הצמדת חצר' },
  { key: 'extra_storage', label: '📦 מחסן נוסף' },
  { key: 'room_expansion', label: '🔧 הרחבת חדר' },
  { key: 'shared_garden', label: '🌺 שימוש בגינה משותפת' },
  { key: 'extra_parking', label: '🚗 שימוש בחניה נוספת' },
  { key: 'sukkah_balcony', label: '🕍 מרפסת סוכה' },
  { key: 'large_balcony', label: '🌞 מרפסת גדולה מהרגיל' },
  { key: 'private_space', label: '🔒 שטח נוסף בשימוש פרטי' },
  { key: 'other', label: '✏️ אחר' },
]

const PROPERTY_RELATION_OPTIONS = [
  { key: 'owner', label: '🏠 בעלים', desc: 'הנכס רשום על שמך' },
  { key: 'renter', label: '🔑 שוכר', desc: 'שוכר את הנכס' },
  { key: 'heir', label: '📋 יורש', desc: 'ירשת את הנכס' },
  { key: 'power_of_attorney', label: '⚖️ מיופה כוח', desc: 'פועל בשם הבעלים' },
] as const

const OWNERSHIP_DOC_TYPES = [
  { key: 'tabu_extract', label: '📜 נסח טאבו', desc: 'נסח רשם המקרקעין' },
  { key: 'purchase_contract', label: '📝 חוזה רכישה / מכר', desc: 'חוזה קניית הדירה' },
  { key: 'ownership_certificate', label: '🏛️ אישור בעלות', desc: 'אישור מרשם המקרקעין' },
  { key: 'inheritance_docs', label: '📋 מסמכי ירושה', desc: 'צו ירושה או צוואה' },
  { key: 'power_of_attorney_doc', label: '⚖️ מסמכי ייפוי כוח', desc: 'ייפוי כוח נוטריוני' },
  { key: 'other', label: '📎 מסמך אחר', desc: 'כל מסמך רלוונטי לנכס' },
]

const DECLARATIONS = [
  'אני מצהיר שכל הפרטים שהוזנו נכונים ומדויקים',
  'אני מבין שהמערכת אינה מבצעת בדיקה משפטית לבעלות',
  'האחריות על המידע חלה עליי בלבד',
  'אני מאשר את תנאי השימוש במערכת',
]

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sc-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 border-b border-[#eeeeee] bg-[#f8f9fa] flex items-center justify-between cursor-pointer hover:bg-[#f0f1f3] transition-colors"
      >
        <h3 className="m-0 text-sm font-bold text-[#212121]">{title}</h3>
        <span className={`text-[#5a5a6e] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="p-5 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5a5a6e] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }: {
  options: { key: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => toggle(opt.key)}
          className={`p-2.5 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-1.5 ${
            selected.includes(opt.key)
              ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c] font-semibold'
              : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
          }`}
        >
          <span className={`w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center text-[11px] ${
            selected.includes(opt.key)
              ? 'border-[#3b6b9c] bg-[#3b6b9c] text-white'
              : 'border-[#eeeeee] bg-white'
          }`}>
            {selected.includes(opt.key) ? '✓' : ''}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

type FormData = {
  fullName: string
  phone: string
  idNumber: string
  floor: string
  apartmentNumber: string
  apartmentSqm: string
  moveInYear: string
  isOwner: boolean
  ownershipType: 'sole' | 'partial' | 'renter'
  ownershipPercentage: string
  apartmentsInBuilding: string
  tenantsInBuilding: string
  isResiding: boolean | null
  residingStatus: 'renter' | 'family_member' | 'empty' | ''
  propertyRelation: 'owner' | 'renter' | 'heir' | 'power_of_attorney' | ''
  coOwnersCount: string
  partners: Array<{ fullName: string; phone: string }>
  specialRequests: string[]
  specialRequestsNotes: string
  buildingStage: string
  apartmentExtras: string[]
  apartmentExtrasNotes: string
  hasSpecialAdvantage: boolean | null
  companionName: string
  companionPhone: string
  declarations: boolean[]
}

export default function Profile() {
  const navigate = useNavigate()
  const { profile, loading } = useUser()
  const { data: tenantProfile, refetch } = trpc.tenant.getMyProfile.useQuery(undefined, {
    enabled: profile?.role === 'tenant',
  })

  const [form, setForm] = useState<FormData>({
    fullName: '', phone: '', idNumber: '',
    floor: '', apartmentNumber: '', apartmentSqm: '',
    moveInYear: '',
    isOwner: true, ownershipType: 'sole', ownershipPercentage: '',
    apartmentsInBuilding: '', tenantsInBuilding: '',
    isResiding: null, residingStatus: '',
    propertyRelation: '',
    coOwnersCount: '', partners: [],
    specialRequests: [], specialRequestsNotes: '', buildingStage: '',
    apartmentExtras: [], apartmentExtrasNotes: '', hasSpecialAdvantage: null,
    companionName: '', companionPhone: '',
    declarations: [false, false, false, false],
  })
  const [address, setAddress] = useState({ city: '', street: '', buildingNumber: '' })
  const [saved, setSaved] = useState(false)

  // Document uploads
  const [tabuFile, setTabuFile] = useState<File | null>(null)
  const [tabuUploading, setTabuUploading] = useState(false)
  const [tabuUrl, setTabuUrl] = useState<string | null>(null)
  const [tabuError, setTabuError] = useState('')
  const [ownershipDocs, setOwnershipDocs] = useState<Array<{ file: File; type: string; name: string; url?: string } | { type: string; name: string; url: string; fromDb: true }>>([])

  const uploadTabu = trpc.tenant.uploadTabu.useMutation()

  // Load existing tabu status
  const { data: tabuStatus } = trpc.tenant.getTabuStatus.useQuery(undefined, {
    enabled: profile?.role === 'tenant',
  })
  // Load existing ownership documents
  const { data: existingDocs } = trpc.tenant.getTenantDocuments.useQuery({ category: 'ownership' }, {
    enabled: profile?.role === 'tenant',
  })

  // Set tabu from DB on load
  useEffect(() => {
    if (tabuStatus?.uploaded && tabuStatus.url && !tabuUrl) {
      setTabuUrl(tabuStatus.url)
    }
  }, [tabuStatus])

  // Set ownership docs from DB on load
  useEffect(() => {
    if (existingDocs && existingDocs.length > 0 && ownershipDocs.length === 0) {
      const dbDocs = existingDocs.map((doc: { category: string; file_name: string; file_url: string }) => ({
        type: doc.category,
        name: doc.file_name,
        url: doc.file_url,
        fromDb: true as const,
      }))
      setOwnershipDocs(dbDocs)
    }
  }, [existingDocs])

  const update = (field: keyof FormData, value: FormData[keyof FormData]) =>
    setForm(p => ({ ...p, [field]: value }))

  useEffect(() => {
    if (!loading && !localStorage.getItem('sb-token')) navigate('/')
  }, [loading, navigate])

  useEffect(() => {
    if (profile) {
      setForm(f => ({ ...f, fullName: profile.fullName || '', phone: profile.phone || '' }))
    }
  }, [profile])

  useEffect(() => {
    if (tenantProfile) {
      const tp = tenantProfile as Record<string, unknown>
      setForm(f => ({
        ...f,
        idNumber: (tp.id_number as string) || '',
        phone: (tp.phone as string) || f.phone,
        floor: tp.floor?.toString() || '',
        apartmentNumber: (tp.apartment_number as string) || '',
        apartmentSqm: tp.apartment_sqm?.toString() || '',
        isOwner: (tp.is_owner as boolean) ?? true,
        ownershipType: (tp.ownership_type as FormData['ownershipType']) || 'sole',
        ownershipPercentage: tp.ownership_percentage?.toString() || '',
        moveInYear: tp.move_in_year?.toString() || '',
        apartmentsInBuilding: tp.apartments_in_building?.toString() || '',
        tenantsInBuilding: tp.tenants_in_building?.toString() || '',
        isResiding: tp.is_residing != null ? (tp.is_residing as boolean) : null,
        residingStatus: (tp.residing_status as FormData['residingStatus']) || '',
        propertyRelation: (tp.property_relation as FormData['propertyRelation']) || '',
        coOwnersCount: tp.co_owners_count?.toString() || '',
        specialRequests: (tp.special_requests as string[]) || [],
        specialRequestsNotes: (tp.special_requests_notes as string) || '',
        buildingStage: (tp.building_stage as string) || '',
        apartmentExtras: (tp.apartment_extras as string[]) || [],
        apartmentExtrasNotes: (tp.apartment_extras_notes as string) || '',
        hasSpecialAdvantage: tp.has_special_advantage != null ? (tp.has_special_advantage as boolean) : null,
        companionName: (tp.companion_name as string) || '',
        companionPhone: (tp.companion_phone as string) || '',
        declarations: (tp.declarations_accepted as boolean) ? [true, true, true, true] : [false, false, false, false],
      }))
      if (tp.address) {
        const addrStr = tp.address as string
        const parts = addrStr.split(',')
        const city = parts[1]?.trim() || ''
        const streetParts = parts[0]?.trim().split(' ') || []
        const buildingNumber = streetParts.pop() || ''
        const street = streetParts.join(' ')
        setAddress({ city, street, buildingNumber })
      }
    }
  }, [tenantProfile])

  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    const token = localStorage.getItem('sb-token')
    if (!token) throw new Error('אינך מחובר')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
    const storagePath = `${folder}/${Date.now()}-${safeName}`
    const uploadRes = await fetch(`/api/upload?path=${encodeURIComponent(storagePath)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}))
      throw new Error(errJson.error || `שגיאה ${uploadRes.status}`)
    }
    return `https://supabase.byclick.co.il/storage/v1/object/public/documents/${storagePath}`
  }

  const handleTabuDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || file.type !== 'application/pdf') { setTabuError('יש להעלות קובץ PDF בלבד'); return }
    setTabuFile(file); setTabuUploading(true); setTabuError('')
    try {
      const url = await uploadFileToStorage(file, 'tabu')
      setTabuUrl(url)
      await uploadTabu.mutateAsync({ fileUrl: url })
    } catch (err) { setTabuError(err instanceof Error ? err.message : 'שגיאה בהעלאה'); setTabuFile(null) }
    finally { setTabuUploading(false) }
  }, [])

  const handleTabuSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') { setTabuError('יש להעלות קובץ PDF בלבד'); return }
    setTabuFile(file); setTabuUploading(true); setTabuError('')
    try {
      const url = await uploadFileToStorage(file, 'tabu')
      setTabuUrl(url)
      await uploadTabu.mutateAsync({ fileUrl: url })
    } catch (err) { setTabuError(err instanceof Error ? err.message : 'שגיאה בהעלאה'); setTabuFile(null) }
    finally { setTabuUploading(false) }
  }, [])

  const saveProfileMut = trpc.tenant.saveProfile.useMutation({
    onSuccess: () => { setSaved(true); refetch(); setTimeout(() => setSaved(false), 3000); toast.success('הפרופיל עודכן בהצלחה') },
    onError: () => { toast.error('שגיאה בשמירת הפרופיל') },
  })
  const updateBasic = trpc.tenant.updateProfile.useMutation({
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); toast.success('הפרופיל עודכן בהצלחה') },
    onError: () => { toast.error('שגיאה בשמירת הפרופיל') },
  })

  const [errors, setErrors] = useState<string[]>([])

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
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

  const validate = (): string[] => {
    const errs: string[] = []
    if (!form.fullName.trim()) errs.push('שם מלא חובה')
    if (isTenant) {
      if (!/^\d{9}$/.test(form.idNumber)) errs.push('תעודת זהות חייבת להכיל 9 ספרות')
      if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) errs.push('מספר טלפון לא תקין (05XXXXXXXX)')
      if (!address.city || !address.street || !address.buildingNumber) errs.push('כתובת מלאה נדרשת (עיר, רחוב, מספר בניין)')
      if (!form.apartmentsInBuilding || parseInt(form.apartmentsInBuilding) < 2) errs.push('מספר דירות בבניין נדרש (מינימום 2)')
      if (form.isResiding === null) errs.push('יש לבחור האם מתגורר בדירה')
      if (form.isResiding === false && !form.residingStatus) errs.push('יש לבחור מי מתגורר בדירה')
      if (!form.propertyRelation) errs.push('יש לבחור קשר לנכס')
      if (!form.floor) errs.push('קומה נדרשת')
      if (!form.apartmentNumber) errs.push('מספר דירה נדרש')
      if (!form.apartmentSqm) errs.push('גודל דירה נדרש')
      if (form.declarations.some(d => !d)) errs.push('יש לאשר את כל ההצהרות')
    }
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) {
      toast.error(`יש ${errs.length} שגיאות - תקן ונסה שוב`)
      return
    }

    if (isTenant) {
      saveProfileMut.mutate({
        idNumber: form.idNumber,
        phone: form.phone,
        city: address.city,
        street: address.street,
        buildingNumber: address.buildingNumber,
        floor: parseInt(form.floor) || 0,
        apartmentNumber: form.apartmentNumber,
        apartmentSqm: parseFloat(form.apartmentSqm) || 0,
        isOwner: form.isOwner,
        ownershipType: form.ownershipType,
        ownershipPercentage: form.ownershipType === 'partial' && form.ownershipPercentage ? parseInt(form.ownershipPercentage) : undefined,
        moveInYear: form.moveInYear ? parseInt(form.moveInYear) : undefined,
        apartmentsInBuilding: form.apartmentsInBuilding ? parseInt(form.apartmentsInBuilding) : undefined,
        tenantsInBuilding: form.tenantsInBuilding ? parseInt(form.tenantsInBuilding) : undefined,
        specialRequests: form.specialRequests,
        specialRequestsNotes: form.specialRequestsNotes || undefined,
        apartmentExtras: form.apartmentExtras,
        apartmentExtrasNotes: form.apartmentExtrasNotes || undefined,
        hasSpecialAdvantage: form.hasSpecialAdvantage ?? false,
        isResiding: form.isResiding ?? true,
        residingStatus: form.isResiding === false && form.residingStatus ? form.residingStatus as 'renter' | 'family_member' | 'empty' : undefined,
        propertyRelation: form.propertyRelation ? form.propertyRelation as 'owner' | 'renter' | 'heir' | 'power_of_attorney' : undefined,
        coOwnersCount: form.ownershipType === 'partial' && form.coOwnersCount ? parseInt(form.coOwnersCount) : undefined,
        declarationsAccepted: form.declarations.every(Boolean),
      })
    } else {
      updateBasic.mutate({ fullName: form.fullName, phone: form.phone })
    }
  }

  const roleInfo = profile?.role ? ROLE_LABELS[profile.role] : null
  const isTenant = profile?.role === 'tenant'

  return (
    <PageLayout>
      <div>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-[18px] font-bold">
            {(profile?.fullName || profile?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[18px] font-bold text-[#212121]">{profile?.fullName || 'משתמש'}</p>
            <p className="text-[13px] text-[#8e8e9e]">{profile?.email} · {roleInfo?.label}</p>
          </div>
        </div>

        {loading ? <LoadingScreen /> : (
          <div className="flex flex-col gap-4">

            {/* Role badge */}
            {roleInfo && (
              <div className="sc-card px-5 py-4 flex items-center gap-3">
                <span className="text-[28px]">{roleInfo.icon}</span>
                <div>
                  <p className="m-0 text-[11px] text-[#5a5a6e]">תפקיד במערכת</p>
                  <p className="m-0 font-bold text-[#212121]">{roleInfo.label}</p>
                </div>
                <div className="mr-auto text-xs text-[#5a5a6e]">{profile?.email}</div>
              </div>
            )}

            {/* ── Section 1: Personal Info ── */}
            <Section title="👤 פרטים אישיים">
              <Field label="שם מלא" required>
                <input className="sc-input" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="טלפון נייד" required>
                  <input className="sc-input" value={form.phone} onChange={e => update('phone', e.target.value)} dir="ltr" placeholder="05XXXXXXXX" />
                </Field>
                {isTenant && (
                  <Field label="תעודת זהות" required>
                    <input className="sc-input" value={form.idNumber} onChange={e => update('idNumber', e.target.value.replace(/\D/g, ''))} maxLength={9} placeholder="9 ספרות" />
                  </Field>
                )}
              </div>
            </Section>

            {/* ── Tenant-only sections ── */}
            {isTenant && (
              <>
                {/* ── Section 2: Address ── */}
                <Section title="🏠 כתובת הדירה">
                  <AddressPicker value={address} onChange={setAddress} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="מספר דירות בבניין" required>
                      <input className="sc-input" type="number" min="2" value={form.apartmentsInBuilding}
                        onChange={e => update('apartmentsInBuilding', e.target.value)} placeholder="לדוג׳ 24" />
                    </Field>
                    <Field label="מספר דיירים בבניין">
                      <input className="sc-input" type="number" min="1" value={form.tenantsInBuilding}
                        onChange={e => update('tenantsInBuilding', e.target.value)} placeholder="לדוג׳ 48" />
                    </Field>
                  </div>
                </Section>

                {/* ── Section 3: Living Status ── */}
                <Section title="🏘️ פרטי מגורים">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">האם אתה מתגורר בדירה כיום? <span className="text-red-500">*</span></label>
                    <div className="flex gap-2.5">
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => { update('isResiding', v); if (v) update('residingStatus', '') }}
                          className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[15px] cursor-pointer transition-colors ${
                            form.isResiding === v
                              ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                              : 'border-[#eeeeee] bg-white text-[#212121]'
                          }`}>
                          {v ? '✅ כן' : '❌ לא'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.isResiding === false && (
                    <div>
                      <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">מי מתגורר בדירה? <span className="text-red-500">*</span></label>
                      <div className="flex flex-col gap-2">
                        {([
                          { key: 'renter', label: '🔑 משכיר', desc: 'הדירה מושכרת לאדם אחר' },
                          { key: 'family_member', label: '👨‍👩‍👧 קרוב משפחה', desc: 'בן משפחה מתגורר בדירה' },
                          { key: 'empty', label: '🏚️ הדירה ריקה', desc: 'אף אחד לא מתגורר בדירה' },
                        ] as const).map(opt => (
                          <button key={opt.key} onClick={() => update('residingStatus', opt.key)}
                            className={`p-3 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-2 ${
                              form.residingStatus === opt.key
                                ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c] font-semibold'
                                : 'border-[#eeeeee] bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                            }`}>
                            <div>
                              <span className="block font-semibold">{opt.label}</span>
                              <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>

                {/* ── Section 4: Property Relation ── */}
                <Section title="🔑 תפקיד בנכס">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">מה הקשר שלך לנכס? <span className="text-red-500">*</span></label>
                    <p className="text-[11px] text-[#5a5a6e] mb-2">הבחירה תשפיע על הרשאות, זכויות הצבעה ודרישות מסמכים</p>
                    <div className="flex flex-col gap-2">
                      {PROPERTY_RELATION_OPTIONS.map(opt => (
                        <button key={opt.key} onClick={() => {
                          update('propertyRelation', opt.key)
                          update('isOwner', opt.key === 'owner' || opt.key === 'heir')
                          if (opt.key === 'renter') update('ownershipType', 'renter')
                          else if (opt.key === 'owner') update('ownershipType', 'sole')
                        }}
                          className={`p-3.5 rounded-xl border-2 text-right cursor-pointer transition-all ${
                            form.propertyRelation === opt.key
                              ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c]'
                              : 'border-[#eeeeee] bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                          }`}>
                          <span className="block font-semibold text-sm">{opt.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                {/* ── Section 5: Apartment Details ── */}
                <Section title="📋 פרטי הדירה">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="קומה" required>
                      <input className="sc-input" type="number" min="0" value={form.floor} onChange={e => update('floor', e.target.value)} placeholder="0 = קרקע" />
                    </Field>
                    <Field label="מספר דירה" required>
                      <input className="sc-input" value={form.apartmentNumber} onChange={e => update('apartmentNumber', e.target.value)} />
                    </Field>
                  </div>
                  <Field label='גודל דירה (מ"ר)' required>
                    <input className="sc-input" type="number" min="10" value={form.apartmentSqm} onChange={e => update('apartmentSqm', e.target.value)} placeholder="לדוג׳ 85" />
                  </Field>
                  <Field label="שנת כניסה לדירה">
                    <select className="sc-input" value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                      <option value="">בחר שנה</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>

                  {/* Ownership type */}
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">סוג בעלות <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {([
                        { key: 'sole', label: '🏠 בעלים יחידי', desc: 'הנכס רשום על שמך בלבד' },
                        { key: 'partial', label: '👥 בעלים חלקי', desc: 'הנכס רשום על מספר בעלים' },
                        { key: 'renter', label: '🔑 שוכר', desc: 'אתה שוכר את הנכס' },
                      ] as const).map(type => (
                        <button key={type.key} onClick={() => {
                          update('ownershipType', type.key)
                          update('isOwner', type.key !== 'renter')
                          if (type.key !== 'partial') update('ownershipPercentage', '')
                        }}
                          className={`flex-1 py-2.5 px-2 rounded-[10px] border-2 text-center cursor-pointer transition-colors ${
                            form.ownershipType === type.key
                              ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                              : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
                          }`}>
                          <span className="block font-semibold text-sm">{type.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-70">{type.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.ownershipType === 'partial' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="אחוז הבעלות שלך" required>
                          <div className="flex items-center gap-2">
                            <input className="sc-input flex-1" type="number" min="1" max="99" value={form.ownershipPercentage}
                              onChange={e => update('ownershipPercentage', e.target.value)} placeholder="לדוג׳ 50" />
                            <span className="text-lg font-bold text-[#5a5a6e]">%</span>
                          </div>
                        </Field>
                        <Field label="מספר בעלי זכויות" required>
                          <input className="sc-input" type="number" min="2" value={form.coOwnersCount}
                            onChange={e => update('coOwnersCount', e.target.value)} placeholder="לדוג׳ 2" />
                        </Field>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">שותפים נוספים</label>
                        {form.partners.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 mb-2">
                            <input className="sc-input flex-1" placeholder="שם מלא" value={p.fullName}
                              onChange={e => {
                                const updated = [...form.partners]; updated[i] = { ...updated[i], fullName: e.target.value }
                                update('partners', updated)
                              }} />
                            <input className="sc-input flex-1" placeholder="טלפון" dir="ltr" value={p.phone}
                              onChange={e => {
                                const updated = [...form.partners]; updated[i] = { ...updated[i], phone: e.target.value }
                                update('partners', updated)
                              }} />
                            <button onClick={() => update('partners', form.partners.filter((_, idx) => idx !== i))}
                              className="text-red-500 text-lg font-bold bg-transparent border-none cursor-pointer px-2">✕</button>
                          </div>
                        ))}
                        <button onClick={() => update('partners', [...form.partners, { fullName: '', phone: '' }])}
                          className="text-[13px] text-[#3b6b9c] font-semibold bg-transparent border-2 border-dashed border-[#3b6b9c]/30 rounded-xl py-2.5 w-full cursor-pointer hover:bg-[#ebf1f7]/30 transition-colors">
                          + הוסף שותף
                        </button>
                      </div>
                    </>
                  )}
                </Section>

                {/* ── Section 6: Documents ── */}
                <Section title="📄 מסמכי בעלות" defaultOpen={false}>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">📜 נסח טאבו (מומלץ)</label>
                    <div
                      onDrop={handleTabuDrop}
                      onDragOver={e => e.preventDefault()}
                      className="border-2 border-dashed border-[#eeeeee] rounded-xl p-6 text-center cursor-pointer hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 transition-colors"
                      onClick={() => document.getElementById('profile-tabu-input')?.click()}
                    >
                      <input id="profile-tabu-input" type="file" accept="application/pdf" onChange={handleTabuSelect} className="hidden" />
                      {tabuUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl animate-spin">⏳</span>
                          <p className="text-sm font-semibold text-[#3b6b9c]">מעלה קובץ...</p>
                        </div>
                      ) : tabuFile && tabuUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">✅</span>
                          <p className="text-sm font-semibold text-[#212121]">{tabuFile.name}</p>
                          <p className="text-xs text-[#5a5a6e]">{(tabuFile.size / 1024).toFixed(0)} KB</p>
                          <p className="text-xs text-[#4a8c5c] font-semibold">הועלה בהצלחה!</p>
                          <button onClick={e => { e.stopPropagation(); setTabuFile(null); setTabuUrl(null) }}
                            className="text-xs text-red-500 underline bg-transparent border-none cursor-pointer mt-1">החלף קובץ</button>
                        </div>
                      ) : !tabuFile && tabuUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">✅</span>
                          <p className="text-sm font-semibold text-[#212121]">נסח טאבו הועלה</p>
                          <p className="text-xs text-[#4a8c5c] font-semibold">הקובץ קיים במערכת</p>
                          <a href={tabuUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="text-xs text-[#3b6b9c] underline">צפה בקובץ</a>
                          <button onClick={e => { e.stopPropagation(); setTabuUrl(null) }}
                            className="text-xs text-red-500 underline bg-transparent border-none cursor-pointer mt-1">החלף קובץ</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">📄</span>
                          <p className="text-sm font-semibold text-[#212121]">גרור קובץ PDF לכאן</p>
                          <p className="text-xs text-[#5a5a6e]">או לחץ לבחירת קובץ</p>
                          {tabuError && <p className="text-xs text-red-500 font-semibold">{tabuError}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">📎 מסמכים נוספים</label>
                    <div className="grid grid-cols-2 gap-2">
                      {OWNERSHIP_DOC_TYPES.filter(d => d.key !== 'tabu_extract').map(docType => (
                        <button key={docType.key} type="button"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'; input.accept = 'application/pdf,image/*'
                            input.onchange = async () => {
                              const file = input.files?.[0]
                              if (file) {
                                const tempDoc = { file, type: docType.key, name: docType.label }
                                setOwnershipDocs(prev => [...prev, tempDoc])
                                try {
                                  const url = await uploadFileToStorage(file, 'ownership-docs')
                                  setOwnershipDocs(prev => prev.map(d => d === tempDoc ? { ...d, url } : d))
                                } catch {
                                  setOwnershipDocs(prev => prev.filter(d => d !== tempDoc))
                                  toast.error('שגיאה בהעלאת מסמך: ' + docType.label)
                                }
                              }
                            }
                            input.click()
                          }}
                          className="p-2.5 rounded-xl border-2 border-[#eeeeee] bg-white text-[13px] text-right cursor-pointer transition-all hover:border-[#3b6b9c] hover:bg-[#ebf1f7]/30 flex flex-col gap-0.5"
                        >
                          <span className="font-semibold text-[#212121]">{docType.label}</span>
                          <span className="text-[10px] text-[#5a5a6e]">{docType.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {ownershipDocs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {ownershipDocs.map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f9fa] border border-[#eeeeee]">
                          <span className="text-lg flex-shrink-0">✅</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#212121] truncate">{doc.name}</p>
                            <p className="text-[11px] text-[#5a5a6e]">
                              {'fromDb' in doc ? 'קיים במערכת' : `${doc.file.name} · ${(doc.file.size / 1024).toFixed(0)} KB`}
                            </p>
                          </div>
                          {'fromDb' in doc && doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-[#3b6b9c] underline flex-shrink-0">צפה</a>
                          )}
                          <button onClick={() => setOwnershipDocs(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 text-sm font-bold bg-transparent border-none cursor-pointer px-2">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* ── Section 7: Special Requests ── */}
                <Section title="✨ דרישות לדירה החדשה" defaultOpen={false}>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">באיזה שלב אתם בבניין?</label>
                    <div className="flex flex-col gap-2">
                      {BUILDING_STAGE_OPTIONS.map(opt => (
                        <button key={opt.key} type="button" onClick={() => update('buildingStage', opt.key)}
                          className={`p-3 rounded-xl border-2 text-[13px] cursor-pointer text-right transition-all flex items-center gap-2 ${
                            form.buildingStage === opt.key
                              ? 'border-[#3b6b9c] bg-[#3b6b9c]/10 text-[#3b6b9c] font-semibold'
                              : 'border-[#eeeeee] bg-white text-[#212121] hover:border-[#3b6b9c]/40'
                          }`}>
                          {form.buildingStage === opt.key && <span>✓</span>}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-[#eeeeee]" />
                  <label className="block text-xs font-semibold text-[#5a5a6e] mb-1">מה חשוב לך בדירה החדשה?</label>
                  <CheckboxGroup options={SPECIAL_REQUESTS_OPTIONS} selected={form.specialRequests} onChange={v => update('specialRequests', v)} />
                  <Field label="פירוט דרישות נוספות">
                    <textarea value={form.specialRequestsNotes} onChange={e => update('specialRequestsNotes', e.target.value)}
                      placeholder="לדוג׳ אני זקוק לקומה גבוהה בגלל בעיות ניידות..." rows={3} className="sc-input resize-y" />
                  </Field>
                </Section>

                {/* ── Section 8: Apartment Extras ── */}
                <Section title="📎 חריגות והצמדות" defaultOpen={false}>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a5a6e] mb-2">האם יש בדירה שלך יתרון מיוחד?</label>
                    <div className="flex gap-2.5">
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => update('hasSpecialAdvantage', v)}
                          className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[15px] cursor-pointer transition-colors ${
                            form.hasSpecialAdvantage === v
                              ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                              : 'border-[#eeeeee] bg-white text-[#212121]'
                          }`}>
                          {v ? '✅ כן' : '❌ לא'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.hasSpecialAdvantage === true && (
                    <>
                      <label className="block text-xs font-semibold text-[#5a5a6e] mb-1">סמן מה קיים בדירה:</label>
                      <CheckboxGroup options={APARTMENT_EXTRAS_OPTIONS} selected={form.apartmentExtras} onChange={v => update('apartmentExtras', v)} />
                      <Field label="תיאור התוספת">
                        <textarea value={form.apartmentExtrasNotes} onChange={e => update('apartmentExtrasNotes', e.target.value)}
                          placeholder="לדוג׳ יש לי מרפסת סוכה של 15 מ״ר שנסגרה ב-2008..." rows={3} className="sc-input resize-y" />
                      </Field>
                    </>
                  )}
                </Section>

                {/* ── Section 9: Companion ── */}
                <Section title="👨‍👩‍👦 בן משפחה / מלווה" defaultOpen={false}>
                  <p className="text-[11px] text-[#5a5a6e] mb-1">איש הקשר יקבל גישה לצפייה בלבד ועדכונים על הפרויקט</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="שם מלא">
                      <input className="sc-input" placeholder="שם מלא" value={form.companionName}
                        onChange={e => update('companionName', e.target.value)} />
                    </Field>
                    <Field label="מספר טלפון">
                      <input className="sc-input" placeholder="05XXXXXXXX" dir="ltr" value={form.companionPhone}
                        onChange={e => update('companionPhone', e.target.value)} />
                    </Field>
                  </div>
                  <div className="bg-[#ebf1f7] border border-[#3b6b9c]/30 rounded-xl p-3">
                    <p className="text-xs text-[#3b6b9c] m-0">
                      🔐 איש הקשר יקבל צפייה בלבד — ללא אפשרות הצבעה או חתימה
                    </p>
                  </div>
                </Section>

                {/* ── Section 10: Declarations ── */}
                <Section title="📝 הצהרות ואישורים">
                  <p className="text-[11px] text-[#5a5a6e] mb-1">יש לאשר את כל ההצהרות כדי לשמור</p>
                  <div className="flex flex-col gap-3">
                    {DECLARATIONS.map((text, i) => (
                      <button key={i} onClick={() => {
                        const updated = [...form.declarations]; updated[i] = !updated[i]
                        update('declarations', updated)
                      }}
                        className={`p-3.5 rounded-xl border-2 text-right cursor-pointer transition-all flex items-start gap-3 ${
                          form.declarations[i]
                            ? 'border-[#4a8c5c] bg-[#4a8c5c]/10'
                            : 'border-[#eeeeee] bg-white hover:border-[#3b6b9c]/40'
                        }`}>
                        <span className={`w-[22px] h-[22px] rounded-md border-2 flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 ${
                          form.declarations[i]
                            ? 'border-[#4a8c5c] bg-[#4a8c5c] text-white'
                            : 'border-[#eeeeee] bg-white'
                        }`}>
                          {form.declarations[i] ? '✓' : ''}
                        </span>
                        <span className={`text-[13px] leading-relaxed ${form.declarations[i] ? 'text-[#212121] font-medium' : 'text-[#5a5a6e]'}`}>
                          {text}
                        </span>
                      </button>
                    ))}
                  </div>
                  {form.declarations.every(Boolean) && (
                    <div className="bg-[#4a8c5c]/10 border-2 border-[#4a8c5c]/30 rounded-xl p-3">
                      <p className="text-xs text-[#4a8c5c] font-semibold m-0 text-center">✅ כל ההצהרות אושרו</p>
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm font-bold text-red-500 mb-2">שגיאות:</p>
                <ul className="list-disc pr-5 text-[13px] text-red-500 flex flex-col gap-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {saved && (
              <div className="bg-[#4a8c5c]/10 border border-[#4a8c5c]/30 text-[#4a8c5c] p-3 rounded-xl text-sm text-center font-semibold">
                ✅ הפרופיל עודכן בהצלחה
              </div>
            )}

            <button onClick={handleSave} disabled={saveProfileMut.isPending || updateBasic.isPending}
              className="sc-btn-primary w-full text-[15px] disabled:opacity-70 sticky bottom-4">
              {saveProfileMut.isPending || updateBasic.isPending ? 'שומר...' : 'שמור שינויים'}
            </button>

            {/* ── Danger Zone ── */}
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
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmEmail('') }}
                className="px-4 py-2 rounded-xl border-2 border-red-500 text-red-600 font-semibold text-sm bg-white hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              >
                מחק את החשבון שלי
              </button>
            </div>
          </div>
        )}

        {/* ── Delete Account Modal ── */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
            onClick={() => !deleteAccountMut.isPending && setShowDeleteModal(false)}
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
                להמשך, הקלד את האימייל שלך: <span className="font-mono text-[#212121]" dir="ltr">{profile?.email}</span>
              </label>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={e => setDeleteConfirmEmail(e.target.value)}
                placeholder={profile?.email || ''}
                className="sc-input w-full mb-4"
                dir="ltr"
                autoFocus
                disabled={deleteAccountMut.isPending}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteAccountMut.isPending}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[#eeeeee] bg-white text-[#212121] font-semibold text-sm cursor-pointer hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={() => deleteAccountMut.mutate({ confirmEmail: deleteConfirmEmail.trim() })}
                  disabled={
                    deleteAccountMut.isPending ||
                    deleteConfirmEmail.trim().toLowerCase() !== (profile?.email || '').toLowerCase()
                  }
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm cursor-pointer hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteAccountMut.isPending ? 'מוחק...' : 'מחק לצמיתות'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
