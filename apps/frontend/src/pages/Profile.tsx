import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout, { PageTitle } from '../components/PageLayout'
import { useUser, ROLE_LABELS } from '../hooks/useUser'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'
import BuildingLoader from '../components/BuildingLoader'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sc-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#eeeeee] bg-[#f8f9fa]">
        <h3 className="m-0 text-sm font-bold text-[#212121]">{title}</h3>
      </div>
      <div className="p-5 flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5a5a6e] mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { profile, loading } = useUser()
  const { data: tenantProfile, refetch } = trpc.tenant.getMyProfile.useQuery(undefined, {
    enabled: profile?.role === 'tenant',
  })

  const [form, setForm] = useState({
    fullName: '', phone: '', idNumber: '',
    floor: '', apartmentNumber: '', apartmentSqm: '',
    isOwner: true, moveInYear: '',
  })
  const [address, setAddress] = useState({ city: '', street: '', buildingNumber: '' })
  const [saved, setSaved] = useState(false)

  const update = (field: string, value: string | boolean) => setForm(p => ({ ...p, [field]: value }))

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
      const tp = tenantProfile as any
      setForm(f => ({
        ...f,
        idNumber: tp.id_number || '',
        phone: tp.phone || f.phone,
        floor: tp.floor?.toString() || '',
        apartmentNumber: tp.apartment_number || '',
        apartmentSqm: tp.apartment_sqm?.toString() || '',
        isOwner: tp.is_owner ?? true,
        moveInYear: tp.move_in_year?.toString() || '',
      }))
      // Parse address from stored string or fields
      if (tp.address) {
        // address format: "street buildingNumber, city"
        const parts = tp.address.split(',')
        const city = parts[1]?.trim() || ''
        const streetParts = parts[0]?.trim().split(' ') || []
        const buildingNumber = streetParts.pop() || ''
        const street = streetParts.join(' ')
        setAddress({ city, street, buildingNumber })
      }
    }
  }, [tenantProfile])

  const saveProfile = trpc.tenant.saveProfile.useMutation({
    onSuccess: () => { setSaved(true); refetch(); setTimeout(() => setSaved(false), 3000) },
  })
  const updateBasic = trpc.tenant.updateProfile.useMutation({
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  const handleSave = () => {
    if (profile?.role === 'tenant') {
      saveProfile.mutate({
        idNumber: form.idNumber,
        phone: form.phone,
        city: address.city,
        street: address.street,
        buildingNumber: address.buildingNumber,
        floor: parseInt(form.floor) || 0,
        apartmentNumber: form.apartmentNumber,
        apartmentSqm: parseFloat(form.apartmentSqm) || 0,
        isOwner: form.isOwner,
        moveInYear: form.moveInYear ? parseInt(form.moveInYear) : undefined,
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

        {loading ? <div className="text-center py-12"><BuildingLoader size="lg" /></div> : (
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

            {/* Personal info */}
            <Section title="👤 פרטים אישיים">
              <Field label="שם מלא">
                <input className="sc-input" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="טלפון נייד">
                  <input className="sc-input" value={form.phone} onChange={e => update('phone', e.target.value)} dir="ltr" />
                </Field>
                {isTenant && (
                  <Field label="תעודת זהות">
                    <input className="sc-input" value={form.idNumber} onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} maxLength={9} />
                  </Field>
                )}
              </div>
            </Section>

            {/* Apartment info — tenants only */}
            {isTenant && (
              <>
                <Section title="🏠 כתובת הדירה">
                  <AddressPicker value={address} onChange={setAddress} />
                </Section>

                <Section title="📋 פרטי הדירה">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="קומה">
                      <input className="sc-input" type="number" min="0" value={form.floor} onChange={e => update('floor', e.target.value)} />
                    </Field>
                    <Field label="מספר דירה">
                      <input className="sc-input" value={form.apartmentNumber} onChange={e => update('apartmentNumber', e.target.value)} />
                    </Field>
                  </div>
                  <Field label={`גודל דירה (מ"ר)`}>
                    <input className="sc-input" type="number" min="10" value={form.apartmentSqm} onChange={e => update('apartmentSqm', e.target.value)} />
                  </Field>
                  <Field label="שנת כניסה לדירה">
                    <select className="sc-input" value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                      <option value="">בחר שנה</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <div className="flex gap-2.5">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => update('isOwner', v)}
                        className={`flex-1 py-2.5 rounded-[10px] border-2 font-semibold text-sm cursor-pointer transition-colors ${
                          form.isOwner === v
                            ? 'border-[#3b6b9c] bg-[#ebf1f7] text-[#3b6b9c]'
                            : 'border-[#eeeeee] bg-white text-[#5a5a6e]'
                        }`}>
                        {v ? '🏠 בעל דירה' : '🔑 שוכר'}
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {saved && (
              <div className="bg-[#4a8c5c]/10 border border-sc-success/30 text-[#4a8c5c] p-3 rounded-xl text-sm text-center font-semibold">
                ✅ הפרופיל עודכן בהצלחה
              </div>
            )}

            <button onClick={handleSave} disabled={saveProfile.isPending || updateBasic.isPending}
              className="sc-btn-primary w-full text-[15px] disabled:opacity-70">
              {saveProfile.isPending || updateBasic.isPending ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
