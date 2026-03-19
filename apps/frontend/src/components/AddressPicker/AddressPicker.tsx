import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '../../lib/trpc'

interface AddressValue {
  city: string; street: string; buildingNumber: string
}
interface Props {
  value: AddressValue
  onChange: (v: AddressValue) => void
}

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin350 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3" fill="none"/>
      <path d="M12 2 A10 10 0 0 1 22 12" stroke="#2563EB" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

interface DropProps {
  label: string; query: string; setQuery: (v: string) => void
  results: {name:string}[]; onSelect: (n:string) => void
  placeholder: string; disabled?: boolean
  isLoading: boolean; isPending: boolean // isPending = debounce not settled yet
  selected: boolean
}

function DropField({ label, query, setQuery, results, onSelect, placeholder, disabled, isLoading, isPending, selected }: DropProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: Event) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])

  const showLoading = (isLoading || isPending) && query.length >= 2
  const showEmpty = !showLoading && open && query.length >= 2 && results.length === 0 && !disabled
  const showResults = !showLoading && open && results.length > 0 && !disabled
  const showHint = !showLoading && open && query.length < 2 && !disabled

  const border = selected ? '#22c55e' : open && !disabled ? '#2563EB' : '#d1d5db'

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div ref={rootRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onTouchEnd={() => { if (!disabled) { setOpen(true); inputRef.current?.focus() } }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          inputMode="text"
          style={{
            width: '100%', padding: '14px 44px 14px 16px', borderRadius: 14,
            border: `2px solid ${border}`, fontSize: 16, outline: 'none',
            background: disabled ? '#f9fafb' : '#fff', color: disabled ? '#9ca3af' : '#111827',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}
        />
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          {showLoading ? <Spinner /> :
           selected ? <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 800 }}>✓</span> :
           <span style={{ color: '#9ca3af', fontSize: 13 }}>▾</span>}
        </span>

        {/* Dropdown */}
        {(showHint || showLoading || showEmpty || showResults) && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, left: 0,
            background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16,
            boxShadow: '0 16px 40px rgba(0,0,0,0.14)', zIndex: 9999,
            maxHeight: 260, overflowY: 'auto', overscrollBehavior: 'contain',
          }}>
            {showLoading && (
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 14 }}>
                <Spinner /> מחפש...
              </div>
            )}
            {showHint && (
              <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 14 }}>
                הקלד לפחות 2 תווים לחיפוש
              </div>
            )}
            {showEmpty && (
              <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🔍</div>
                לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;
              </div>
            )}
            {showResults && results.map(r => (
              <div
                key={r.name}
                onPointerDown={e => { e.preventDefault(); onSelect(r.name); setOpen(false) }}
                style={{
                  padding: '13px 16px', cursor: 'pointer', fontSize: 15,
                  borderBottom: '1px solid #f3f4f6', color: '#111827', userSelect: 'none',
                  transition: 'background 0.1s',
                }}
                onPointerEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                onPointerLeave={e => (e.currentTarget.style.background = '')}
              >
                {r.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AddressPicker({ value, onChange }: Props) {
  const [cityQuery, setCityQuery] = useState(value.city || '')
  const [streetQuery, setStreetQuery] = useState(value.street || '')
  const [buildingTouched, setBuildingTouched] = useState(false)

  const debouncedCity = useDebounce(cityQuery, 350)
  const debouncedStreet = useDebounce(streetQuery, 300)

  const cityPending = cityQuery !== debouncedCity && cityQuery.length >= 2
  const streetPending = streetQuery !== debouncedStreet

  const { data: cities = [], isFetching: citiesLoading } = trpc.address.searchCities.useQuery(
    { query: debouncedCity },
    { enabled: debouncedCity.length >= 2, staleTime: 60_000, retry: 1 }
  )
  const { data: streets = [], isFetching: streetsLoading } = trpc.address.searchStreets.useQuery(
    { cityName: value.city, query: debouncedStreet },
    { enabled: !!value.city, staleTime: 30_000, retry: 1 }
  )
  const { data: buildingCheck, isFetching: buildingLoading } = trpc.address.validateBuilding.useQuery(
    { city: value.city, street: value.street, buildingNumber: value.buildingNumber },
    { enabled: !!value.city && !!value.street && value.buildingNumber.length >= 1 && buildingTouched, staleTime: 10_000 }
  )

  const buildingStatus = !buildingTouched || !value.buildingNumber ? null
    : buildingLoading ? 'loading'
    : buildingCheck?.valid === true ? 'valid'
    : buildingCheck?.valid === false ? 'invalid'
    : 'unknown'

  const handleCitySelect = useCallback((name: string) => {
    setCityQuery(name)
    setStreetQuery('')
    onChange({ city: name, street: '', buildingNumber: '' })
  }, [onChange])

  const handleStreetSelect = useCallback((name: string) => {
    setStreetQuery(name)
    onChange({ ...value, street: name })
  }, [onChange, value])

  const bBorder = buildingStatus === 'valid' ? '#22c55e'
    : buildingStatus === 'invalid' ? '#ef4444'
    : buildingTouched && value.buildingNumber ? '#2563EB' : '#d1d5db'

  return (
    <>
      <style>{`
        @keyframes spin350 { to { transform: rotate(360deg); } }
        input:focus { border-color: #2563EB !important; }
      `}</style>
      <div dir="rtl">

        <DropField
          label="🏙️ עיר *"
          query={cityQuery}
          setQuery={q => { setCityQuery(q); if (q !== value.city) onChange({ city: '', street: '', buildingNumber: '' }) }}
          results={cities}
          onSelect={handleCitySelect}
          placeholder="הקלד שם עיר..."
          isLoading={citiesLoading}
          isPending={cityPending}
          selected={!!value.city && cityQuery === value.city}
        />

        <DropField
          label="🛣️ רחוב *"
          query={streetQuery}
          setQuery={q => { setStreetQuery(q); if (q !== value.street) onChange({ ...value, street: '' }) }}
          results={streets}
          onSelect={handleStreetSelect}
          placeholder={value.city ? 'הקלד שם רחוב...' : 'בחר עיר תחילה'}
          disabled={!value.city}
          isLoading={streetsLoading}
          isPending={streetPending && !!value.city}
          selected={!!value.street && streetQuery === value.street}
        />

        {/* Building number */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            🏠 מספר בניין *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={value.buildingNumber}
              onChange={e => { onChange({ ...value, buildingNumber: e.target.value }); setBuildingTouched(true) }}
              onBlur={() => setBuildingTouched(true)}
              placeholder={value.street ? 'מספר הבניין' : 'בחר רחוב תחילה'}
              disabled={!value.street}
              inputMode="numeric"
              style={{
                width: '100%', padding: '14px 44px 14px 16px', borderRadius: 14,
                border: `2px solid ${bBorder}`, fontSize: 16, outline: 'none',
                background: !value.street ? '#f9fafb' : '#fff',
                color: !value.street ? '#9ca3af' : '#111827',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              {buildingStatus === 'loading' && <Spinner />}
              {buildingStatus === 'valid' && <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 800 }}>✓</span>}
              {buildingStatus === 'invalid' && <span style={{ color: '#ef4444', fontSize: 18 }}>✗</span>}
            </span>
          </div>
          {buildingStatus === 'invalid' && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>
              מספר הבניין לא אומת — ניתן להמשיך בכל מקרה
            </p>
          )}
        </div>

        {/* Summary */}
        {value.city && value.street && value.buildingNumber && (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12,
            padding: '10px 14px', fontSize: 14, color: '#15803d',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <span style={{ fontWeight: 600 }}>{value.street} {value.buildingNumber}, {value.city}</span>
          </div>
        )}
      </div>
    </>
  )
}
