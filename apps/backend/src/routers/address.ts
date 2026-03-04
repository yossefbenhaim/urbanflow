import { z } from 'zod'
import { router, protectedProcedure } from '../middleware/auth'

const CITIES_RESOURCE = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba'
const STREETS_RESOURCE = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b'

async function govFetch(resource: string, params: Record<string, string>) {
  const url = new URL('https://data.gov.il/api/3/action/datastore_search')
  url.searchParams.set('resource_id', resource)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  const json = await res.json() as any
  return json?.result?.records ?? []
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export const addressRouter = router({
  searchCities: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const records = await govFetch(CITIES_RESOURCE, {
        q: input.query,
        limit: '10',
        fields: 'שם_ישוב,סמל_ישוב',
      })
      return records
        .map((r: any) => ({ name: r['שם_ישוב']?.trim(), code: r['סמל_ישוב'] }))
        .filter((r: any) => r.name?.includes(input.query) || true)
        .slice(0, 10)
    }),

  searchStreets: protectedProcedure
    .input(z.object({ cityName: z.string().min(1), query: z.string() }))
    .query(async ({ input }) => {
      // Get city code
      const cityRecords = await govFetch(CITIES_RESOURCE, {
        q: input.cityName,
        limit: '5',
        fields: 'שם_ישוב,סמל_ישוב',
      })
      const city = cityRecords.find((r: any) =>
        r['שם_ישוב']?.trim() === input.cityName.trim()
      )
      if (!city) return []

      const filters = JSON.stringify({ 'סמל_ישוב': city['סמל_ישוב'] })
      const params: Record<string, string> = {
        filters,
        limit: '50',
        fields: 'שם_רחוב,סמל_רחוב',
      }
      // Only add q if user typed something — filters by content
      if (input.query.trim().length >= 1) params.q = input.query.trim()

      const records = await govFetch(STREETS_RESOURCE, params)

      // Client-side filter: must START with query (more precise)
      const q = input.query.trim().toLowerCase()
      return records
        .map((r: any) => ({ name: r['שם_רחוב']?.trim(), code: r['סמל_רחוב'] }))
        .filter((r: any) => r.name && (q === '' || r.name.includes(input.query.trim())))
        .slice(0, 30)
    }),

  validateBuilding: protectedProcedure
    .input(z.object({ city: z.string(), street: z.string(), buildingNumber: z.string() }))
    .query(async ({ input }) => {
      try {
        const q = encodeURIComponent(`${input.street} ${input.buildingNumber} ${input.city}`)
        const url = `${NOMINATIM}?q=${q}&countrycodes=il&format=json&limit=3&addressdetails=1`
        const res = await fetch(url, { headers: { 'User-Agent': 'SilverCastle/1.0' } })
        const data = await res.json() as any[]
        if (!data?.length) return { valid: false, suggestion: null }

        // Check if any result has matching house number in the right city
        const match = data.find((r: any) => {
          const addr = r.address || {}
          const houseMatch = !input.buildingNumber || addr.house_number === input.buildingNumber || r.display_name.includes(input.buildingNumber)
          const cityMatch = r.display_name.includes(input.city)
          return houseMatch && cityMatch
        })

        return {
          valid: !!match,
          suggestion: data[0]?.display_name ?? null,
        }
      } catch {
        return { valid: null, suggestion: null } // null = unknown, don't block
      }
    }),
})
