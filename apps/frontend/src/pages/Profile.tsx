import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useUser, ROLE_LABELS } from '../hooks/useUser'
import { trpc } from '../lib/trpc'
import AddressPicker from '../components/AddressPicker/AddressPicker'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '5px' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box' as const, color: '#1e293b', background: '#fff',
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }} dir="rtl">
      <Navbar />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 24px' }}>הפרופיל שלי</h1>

        {loading ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px' }}>טוען...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Role badge */}
            {roleInfo && (
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{roleInfo.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>תפקיד במערכת</p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{roleInfo.label}</p>
                </div>
                <div style={{ marginRight: 'auto', fontSize: '12px', color: '#9ca3af' }}>{profile?.email}</div>
              </div>
            )}

            {/* Personal info */}
            <Section title="👤 פרטים אישיים">
              <Field label="שם מלא">
                <input style={inputStyle} value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="טלפון נייד">
                  <input style={inputStyle} value={form.phone} onChange={e => update('phone', e.target.value)} dir="ltr" />
                </Field>
                {isTenant && (
                  <Field label="תעודת זהות">
                    <input style={inputStyle} value={form.idNumber} onChange={e => update('idNumber', e.target.value.replace(/\D/g,''))} maxLength={9} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Field label="קומה">
                      <input style={inputStyle} type="number" min="0" value={form.floor} onChange={e => update('floor', e.target.value)} />
                    </Field>
                    <Field label="מספר דירה">
                      <input style={inputStyle} value={form.apartmentNumber} onChange={e => update('apartmentNumber', e.target.value)} />
                    </Field>
                  </div>
                  <Field label={`גודל דירה (מ"ר)`}>
                    <input style={inputStyle} type="number" min="10" value={form.apartmentSqm} onChange={e => update('apartmentSqm', e.target.value)} />
                  </Field>
                  <Field label="שנת כניסה לדירה">
                    <select style={inputStyle} value={form.moveInYear} onChange={e => update('moveInYear', e.target.value)}>
                      <option value="">בחר שנה</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => update('isOwner', v)} style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid',
                        borderColor: form.isOwner === v ? '#2563EB' : '#e2e8f0',
                        background: form.isOwner === v ? '#eff6ff' : '#fff',
                        color: form.isOwner === v ? '#2563EB' : '#64748b',
                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      }}>
                        {v ? '🏠 בעל דירה' : '🔑 שוכר'}
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {saved && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>
                ✅ הפרופיל עודכן בהצלחה
              </div>
            )}

            <button onClick={handleSave} disabled={saveProfile.isPending || updateBasic.isPending}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', opacity: saveProfile.isPending ? 0.7 : 1 }}>
              {saveProfile.isPending || updateBasic.isPending ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
