import { useEffect, useRef, useState } from 'react'
import { trpc } from '../lib/trpc'

function useDebounce<T>(value: T, delay = 300): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

interface Props {
  label?: string
  value: string
  onChange: (city: string) => void
  placeholder?: string
  required?: boolean
}

/**
 * Single-city picker backed by the data.gov.il cities cache
 * (address.searchCities tRPC endpoint). Accepts only values selected
 * from the dropdown — typing alone does not commit a value.
 */
export default function CityAutocomplete({ label, value, onChange, placeholder, required }: Props) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)
  const ref = useRef<HTMLDivElement>(null)
  const debounced = useDebounce(query, 250)

  const { data: cities = [], isFetching } = trpc.address.searchCities.useQuery(
    { query: debounced },
    { enabled: debounced.length >= 1 && !confirmed, staleTime: 60_000 }
  )

  useEffect(() => {
    const h = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])

  const pick = (name: string) => {
    setQuery(name)
    onChange(name)
    setConfirmed(true)
    setOpen(false)
  }

  const border = confirmed ? '#22c55e' : open ? '#3b6b9c' : '#d1d5db'

  return (
    <div>
      {label && <label className="block text-xs text-[#5a5a6e] mb-1">{label}{required && ' *'}</label>}
      <div ref={ref} className="relative">
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setConfirmed(false)
            onChange('')
            setOpen(true)
          }}
          onFocus={() => { if (!confirmed) setOpen(true) }}
          placeholder={placeholder ?? 'התחל להקליד שם עיר...'}
          className="sc-input"
          style={{ borderColor: border }}
          autoComplete="off"
        />
        {confirmed && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#22c55e] text-lg">✓</span>
        )}

        {open && !confirmed && (
          <div
            className="absolute top-full right-0 left-0 mt-1 bg-white border border-[#eeeeee] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {debounced.length < 1 && (
              <div className="px-3 py-2 text-xs text-[#9ca3af]">הקלד לפחות אות אחת</div>
            )}
            {debounced.length >= 1 && isFetching && (
              <div className="px-3 py-2 text-xs text-[#9ca3af]">מחפש...</div>
            )}
            {debounced.length >= 1 && !isFetching && cities.length === 0 && (
              <div className="px-3 py-2 text-xs text-[#9ca3af]">לא נמצאו ערים</div>
            )}
            {cities.map(c => (
              <div
                key={c.name}
                onPointerDown={e => { e.preventDefault(); pick(c.name) }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-[#ebf1f7] border-b border-[#f3f4f6] last:border-b-0"
              >
                {c.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
