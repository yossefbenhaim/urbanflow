import { z } from 'zod'
import { router, publicProcedure } from '../middleware/auth'

const CITIES_RESOURCE = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba'
const STREETS_RESOURCE = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b'

interface GovRecord {
  [key: string]: string | number | undefined
}

type NamedEntry = { name: string; code: string }

async function govFetch(resource: string, params: Record<string, string>, retries = 2): Promise<GovRecord[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL('https://data.gov.il/api/3/action/datastore_search')
      url.searchParams.set('resource_id', resource)
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'User-Agent': 'urbanflow/1.0' } })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { result?: { records?: GovRecord[] } }
      return json?.result?.records ?? []
    } catch {
      if (attempt === retries) return []
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  return []
}

async function govFetchAll(
  resource: string,
  baseParams: Record<string, string>,
  nameField: string,
  codeField: string,
): Promise<NamedEntry[]> {
  const PAGE = 1000
  const all: NamedEntry[] = []
  for (let offset = 0; offset < 20000; offset += PAGE) {
    const records = await govFetch(resource, {
      ...baseParams,
      limit: String(PAGE),
      offset: String(offset),
    })
    for (const r of records) {
      const name = String(r[nameField] ?? '').trim()
      const code = String(r[codeField] ?? '').trim()
      if (name && name !== 'לא רלוונטי' && name !== 'ללא שם') all.push({ name, code })
    }
    if (records.length < PAGE) break
  }
  return all
}

const CACHE_TTL = 24 * 60 * 60 * 1000

let citiesCache: { data: NamedEntry[]; time: number } | null = null
let citiesInFlight: Promise<NamedEntry[]> | null = null

async function getAllCities(): Promise<NamedEntry[]> {
  if (citiesCache && Date.now() - citiesCache.time < CACHE_TTL) return citiesCache.data
  if (citiesInFlight) return citiesInFlight
  citiesInFlight = (async () => {
    const data = await govFetchAll(
      CITIES_RESOURCE,
      { fields: 'שם_ישוב,סמל_ישוב' },
      'שם_ישוב',
      'סמל_ישוב',
    )
    if (data.length > 0) citiesCache = { data, time: Date.now() }
    citiesInFlight = null
    return data
  })()
  return citiesInFlight
}

const streetsCache = new Map<string, { data: NamedEntry[]; time: number }>()
const streetsInFlight = new Map<string, Promise<NamedEntry[]>>()

async function getStreetsForCity(cityCode: string): Promise<NamedEntry[]> {
  const cached = streetsCache.get(cityCode)
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data
  const existing = streetsInFlight.get(cityCode)
  if (existing) return existing

  const p = (async () => {
    const data = await govFetchAll(
      STREETS_RESOURCE,
      {
        filters: JSON.stringify({ 'סמל_ישוב': cityCode }),
        fields: 'שם_רחוב,סמל_רחוב',
      },
      'שם_רחוב',
      'סמל_רחוב',
    )
    const dedup = Array.from(new Map(data.map(s => [s.name, s])).values())
    if (dedup.length > 0) streetsCache.set(cityCode, { data: dedup, time: Date.now() })
    streetsInFlight.delete(cityCode)
    return dedup
  })()
  streetsInFlight.set(cityCode, p)
  return p
}

function scoreAndRank(entries: NamedEntry[], query: string, max: number): NamedEntry[] {
  const q = query.trim()
  if (!q) return entries.slice(0, max)
  const tokens = q.split(/\s+/).filter(Boolean)
  const prefix: NamedEntry[] = []
  const wordStart: NamedEntry[] = []
  const contains: NamedEntry[] = []
  const multiToken: NamedEntry[] = []

  for (const e of entries) {
    const name = e.name
    if (name.startsWith(q)) prefix.push(e)
    else if (name.includes(' ' + q)) wordStart.push(e)
    else if (name.includes(q)) contains.push(e)
    else if (tokens.length >= 2 && tokens.every(t => name.includes(t))) multiToken.push(e)
  }
  return [...prefix, ...wordStart, ...contains, ...multiToken].slice(0, max)
}

export const addressRouter = router({
  searchCities: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const all = await getAllCities()
      return scoreAndRank(all, input.query, 12)
    }),

  searchStreets: publicProcedure
    .input(z.object({ cityName: z.string().min(1), query: z.string().default('') }))
    .query(async ({ input }) => {
      const cities = await getAllCities()
      const target = input.cityName.trim()
      const city = cities.find(c => c.name === target)
      if (!city) return []
      const streets = await getStreetsForCity(city.code)
      return scoreAndRank(streets, input.query, 30)
    }),

  validateBuilding: publicProcedure
    .input(z.object({ city: z.string(), street: z.string(), buildingNumber: z.string() }))
    .query(async ({ input }) => {
      try {
        const address = encodeURIComponent(`${input.street} ${input.buildingNumber}`)
        const city = encodeURIComponent(input.city)
        const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?Address=${address}&City=${city}&CountryCode=ISR&f=json&maxLocations=1&outFields=Addr_type`
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 6000)
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json() as { candidates?: { attributes?: { Addr_type?: string } }[] }
        const best = data?.candidates?.[0]
        if (!best) return { valid: null }
        const addrType: string = best.attributes?.Addr_type ?? ''
        return { valid: addrType === 'PointAddress' || addrType === 'Subaddress' }
      } catch {
        return { valid: null }
      }
    }),
})
