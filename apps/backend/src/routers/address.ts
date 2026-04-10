import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../middleware/auth'

const CITIES_RESOURCE = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba'
const STREETS_RESOURCE = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b'

interface GovRecord {
  [key: string]: string | number | undefined
}

async function govFetch(resource: string, params: Record<string, string>, retries = 2): Promise<GovRecord[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL('https://data.gov.il/api/3/action/datastore_search')
      url.searchParams.set('resource_id', resource)
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url.toString(), { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { result?: { records?: GovRecord[] } }
      return json?.result?.records ?? []
    } catch (e) {
      if (attempt === retries) return []
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  return []
}

export const addressRouter = router({
  searchCities: publicProcedure
    .input(z.object({ query: z.string().min(2) }))
    .query(async ({ input }) => {
      const q = input.query.trim()
      const records = await govFetch(CITIES_RESOURCE, {
        q,
        limit: '30',
        fields: 'שם_ישוב,סמל_ישוב',
      })
      return records
        .map((r: GovRecord) => ({ name: String(r['שם_ישוב'] ?? '').trim(), code: r['סמל_ישוב'] }))
        .filter((r) => r.name && r.name.includes(q))
        .slice(0, 12)
    }),

  searchStreets: publicProcedure
    .input(z.object({ cityName: z.string().min(1), query: z.string().default('') }))
    .query(async ({ input }) => {
      const q = input.query.trim()

      // Resolve city code
      const cityRecords = await govFetch(CITIES_RESOURCE, {
        q: input.cityName.trim(),
        limit: '10',
        fields: 'שם_ישוב,סמל_ישוב',
      })
      const city = cityRecords.find(
        (r: GovRecord) => String(r['שם_ישוב'] ?? '').trim() === input.cityName.trim()
      )
      if (!city) return []

      const params: Record<string, string> = {
        filters: JSON.stringify({ 'סמל_ישוב': String(city['סמל_ישוב']) }),
        limit: '100',
        fields: 'שם_רחוב,סמל_רחוב',
      }
      if (q.length >= 1) params.q = q

      const records = await govFetch(STREETS_RESOURCE, params)
      return records
        .map((r: GovRecord) => ({ name: String(r['שם_רחוב'] ?? '').trim(), code: r['סמל_רחוב'] }))
        .filter((r) => r.name && (q === '' || r.name.includes(q)))
        .slice(0, 30)
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
