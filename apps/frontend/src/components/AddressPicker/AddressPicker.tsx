import { useState, useRef, useEffect } from 'react'
import { trpc } from '../../lib/trpc'

interface AddressValue {
  city: string
  street: string
  buildingNumber: string
}
interface Props {
  value: AddressValue
  onChange: (v: AddressValue) => void
}

// Spinner component
function Spinner() {
  return (
    <span style={{
      width: '14px', height: '14px', border: '2px solid #e2e8f0',
      borderTopColor: '#2563EB', borderRadius: '50%',
      display: 'inline-block', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function Dropdown({ query, setQuery, results, onSelect, placeholder, disabled, loading }: {
  query: string; setQuery: (v: string) => void
  results: { name: string }[]; onSelect: (name: string) => void
  placeholder: string; disabled?: boolean; loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', padding: '10px 36px 10px 12px', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
            background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#1e293b',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <Spinner />
          </span>
        )}
      </div>
      {open && results.length > 0 && !loading && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50,
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {results.map(r => (
            <div key={r.name} onMouseDown={() => { onSelect(r.name); setOpen(false) }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >{r.name}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddressPicker({ value, onChange }: Props) {
  const [cityQuery, setCityQuery] = useState(value.city)
  const [streetQuery, setStreetQuery] = useState(value.street)
  const [buildingTouched, setBuildingTouched] = useState(false)

  const { data: cities = [], isFetching: citiesLoading } = trpc.address.searchCities.useQuery(
    { query: cityQuery },
    { enabled: cityQuery.length >= 2, staleTime: 30000 }
  )
  const { data: streets = [], isFetching: streetsLoading } = trpc.address.searchStreets.useQuery(
    { cityName: value.city, query: streetQuery },
    { enabled: !!value.city, staleTime: 30000 }
  )
  const { data: buildingCheck, isFetching: buildingLoading } = trpc.address.validateBuilding.useQuery(
    { city: value.city, street: value.street, buildingNumber: value.buildingNumber },
    { enabled: !!value.city && !!value.street && value.buildingNumber.length >= 1 && buildingTouched, staleTime: 10000 }
  )

  const buildingStatus = !buildingTouched || !value.buildingNumber ? null
    : buildingLoading ? 'loading'
    : buildingCheck?.valid === true ? 'valid'
    : buildingCheck?.valid === false ? 'invalid'
    : 'unknown'

  const borderColor = (status: typeof buildingStatus) =>
    status === 'valid' ? '#22c55e' : status === 'invalid' ? '#ef4444' : '#e2e8f0'

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>עיר *</label>
          <Dropdown
            query={cityQuery}
            setQuery={q => { setCityQuery(q); onChange({ city: '', street: '', buildingNumber: value.buildingNumber }) }}
            results={cities}
            onSelect={name => { setCityQuery(name); setStreetQuery(''); onChange({ city: name, street: '', buildingNumber: '' }) }}
            placeholder="חפש עיר..."
            loading={citiesLoading}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>רחוב *</label>
          <Dropdown
            query={streetQuery}
            setQuery={q => { setStreetQuery(q); onChange({ ...value, street: '' }) }}
            results={streets}
            onSelect={name => { setStreetQuery(name); onChange({ ...value, street: name }) }}
            placeholder={value.city ? 'חפש רחוב...' : 'בחר עיר תחילה'}
            disabled={!value.city}
            loading={streetsLoading}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>מספר בניין *</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              value={value.buildingNumber}
              onChange={e => { onChange({ ...value, buildingNumber: e.target.value }); setBuildingTouched(true) }}
              onBlur={() => setBuildingTouched(true)}
              placeholder="מספר בניין"
              style={{
                width: '100%', padding: '10px 36px 10px 12px', borderRadius: '10px',
                border: `1.5px solid ${borderColor(buildingStatus)}`,
                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              {buildingStatus === 'loading' && <Spinner />}
              {buildingStatus === 'valid' && <span style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>}
              {buildingStatus === 'invalid' && <span style={{ color: '#ef4444', fontSize: '14px' }}>✗</span>}
            </span>
          </div>
          {buildingStatus === 'invalid' && (
            <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0' }}>אין מספר בניין כזה ברחוב זה</p>
          )}
          {buildingStatus === 'unknown' && (
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>לא ניתן לאמת — המשך בכל מקרה</p>
          )}
        </div>

        {value.city && value.street && value.buildingNumber && buildingStatus !== 'invalid' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#166534' }}>
            ✅ {value.street} {value.buildingNumber}, {value.city}
          </div>
        )}
      </div>
    </>
  )
}
