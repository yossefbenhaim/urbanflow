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

function Dropdown({ query, setQuery, results, onSelect, placeholder, disabled }: {
  query: string
  setQuery: (v: string) => void
  results: { name: string }[]
  onSelect: (name: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '10px',
          border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
          background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#1e293b',
          boxSizing: 'border-box',
        }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50,
          maxHeight: '200px', overflowY: 'auto',
        }}>
          {results.map(r => (
            <div
              key={r.name}
              onMouseDown={() => { onSelect(r.name); setOpen(false) }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                borderBottom: '1px solid #f1f5f9', color: '#1e293b',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddressPicker({ value, onChange }: Props) {
  const [cityQuery, setCityQuery] = useState(value.city)
  const [streetQuery, setStreetQuery] = useState(value.street)

  const { data: cities = [] } = trpc.address.searchCities.useQuery(
    { query: cityQuery },
    { enabled: cityQuery.length >= 2, staleTime: 30000 }
  )

  const { data: streets = [] } = trpc.address.searchStreets.useQuery(
    { cityName: value.city, query: streetQuery },
    { enabled: !!value.city && value.city.length >= 2, staleTime: 30000 }
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
      <div>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>עיר</label>
        <Dropdown
          query={cityQuery}
          setQuery={q => { setCityQuery(q); onChange({ city: '', street: '', buildingNumber: value.buildingNumber }) }}
          results={cities}
          onSelect={name => { setCityQuery(name); setStreetQuery(''); onChange({ city: name, street: '', buildingNumber: value.buildingNumber }) }}
          placeholder="חפש עיר..."
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>רחוב</label>
        <Dropdown
          query={streetQuery}
          setQuery={q => { setStreetQuery(q); onChange({ ...value, street: '' }) }}
          results={streets}
          onSelect={name => { setStreetQuery(name); onChange({ ...value, street: name }) }}
          placeholder={value.city ? 'חפש רחוב...' : 'בחר עיר תחילה'}
          disabled={!value.city}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>מספר בניין</label>
        <input
          value={value.buildingNumber}
          onChange={e => onChange({ ...value, buildingNumber: e.target.value })}
          placeholder="מספר בניין"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {value.city && value.street && value.buildingNumber && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#166534' }}>
          ✅ {value.street} {value.buildingNumber}, {value.city}
        </div>
      )}
    </div>
  )
}
