import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// NSW FuelCheck API proxy
// Env vars (set in Vercel):
//   NSW_FUEL_CHECK_KEY    — Consumer Key
//   NSW_FUEL_CHECK_SECRET — Consumer Secret
// Falls back to mock data when keys are absent.
// ---------------------------------------------------------------------------

const NSW_KEY    = process.env.NSW_FUEL_CHECK_KEY
const NSW_SECRET = process.env.NSW_FUEL_CHECK_SECRET
const NSW_BASE   = 'https://api.onegov.nsw.gov.au'

const FUEL_TYPE_CODES: Record<string, string> = {
  diesel: 'DL',
  ulp:    'U91',
}

export interface FuelStation {
  id:      string
  name:    string
  brand:   string
  lat:     number
  lng:     number
  price:   number | null
  updated: string | null
}

// ---------------------------------------------------------------------------
// Mock fallback — used when no API key is set
// ---------------------------------------------------------------------------
const MOCK_DIESEL: FuelStation[] = [
  { id:'m1',  brand:'Shell Coles Express', name:'Shell Sydney CBD',        lat:-33.8651, lng:151.2093, price:164.9, updated:'2026-03-18T09:00:00' },
  { id:'m2',  brand:'BP',                  name:'BP Parramatta',            lat:-33.8153, lng:151.0017, price:163.7, updated:'2026-03-18T08:45:00' },
  { id:'m3',  brand:'Caltex Woolworths',   name:'Caltex Chatswood',         lat:-33.7975, lng:151.1808, price:165.2, updated:'2026-03-18T09:10:00' },
  { id:'m4',  brand:'United',              name:'United Bondi',              lat:-33.8914, lng:151.2767, price:166.5, updated:'2026-03-18T08:30:00' },
  { id:'m5',  brand:'BP',                  name:'BP Randwick',               lat:-33.9143, lng:151.2388, price:165.9, updated:'2026-03-18T09:05:00' },
  { id:'m6',  brand:'Shell',               name:'Shell Hurstville',          lat:-33.9633, lng:151.1024, price:164.3, updated:'2026-03-18T08:50:00' },
  { id:'m7',  brand:'Caltex',              name:'Caltex Liverpool',          lat:-33.9200, lng:150.9229, price:162.8, updated:'2026-03-18T09:15:00' },
  { id:'m8',  brand:'BP',                  name:'BP Penrith',                lat:-33.7499, lng:150.6942, price:163.1, updated:'2026-03-18T08:40:00' },
  { id:'m9',  brand:'Caltex Woolworths',   name:'Caltex Blacktown',          lat:-33.7712, lng:150.9166, price:163.5, updated:'2026-03-18T09:20:00' },
  { id:'m10', brand:'Shell Coles Express', name:'Shell Hornsby',             lat:-33.7044, lng:151.0985, price:164.6, updated:'2026-03-18T09:00:00' },
  { id:'m11', brand:'United',              name:'United Manly',              lat:-33.7969, lng:151.2855, price:168.4, updated:'2026-03-18T08:55:00' },
  { id:'m12', brand:'BP',                  name:'BP Campbelltown',           lat:-34.0644, lng:150.8148, price:163.0, updated:'2026-03-18T09:10:00' },
  { id:'m13', brand:'Caltex',              name:'Caltex Bankstown',          lat:-33.9194, lng:151.0352, price:164.1, updated:'2026-03-18T08:45:00' },
  { id:'m14', brand:'Shell',               name:'Shell Auburn',              lat:-33.8498, lng:151.0332, price:164.7, updated:'2026-03-18T09:05:00' },
  { id:'m15', brand:'BP',                  name:'BP Ryde',                   lat:-33.8147, lng:151.1032, price:165.4, updated:'2026-03-18T09:00:00' },
  { id:'m16', brand:'Caltex',              name:'Caltex Miranda',            lat:-34.0393, lng:151.1003, price:165.1, updated:'2026-03-18T08:35:00' },
  { id:'m17', brand:'Shell Coles Express', name:'Shell Sutherland',          lat:-34.0329, lng:151.0566, price:165.6, updated:'2026-03-18T09:15:00' },
  { id:'m18', brand:'United',              name:'United Castle Hill',        lat:-33.7303, lng:151.0040, price:163.8, updated:'2026-03-18T08:50:00' },
  { id:'m19', brand:'BP',                  name:'BP Gordon',                 lat:-33.7576, lng:151.1519, price:165.3, updated:'2026-03-18T09:00:00' },
  { id:'m20', brand:'Caltex',              name:'Caltex Seven Hills',        lat:-33.7712, lng:150.9366, price:162.9, updated:'2026-03-18T08:40:00' },
  { id:'m21', brand:'BP',                  name:'BP Leichhardt',             lat:-33.8834, lng:151.1568, price:165.1, updated:'2026-03-18T09:05:00' },
  { id:'m22', brand:'Shell Coles Express', name:'Shell Dee Why',             lat:-33.7501, lng:151.2858, price:167.2, updated:'2026-03-18T08:55:00' },
  { id:'m23', brand:'Caltex Woolworths',   name:'Caltex Wetherill Park',     lat:-33.8476, lng:150.9010, price:162.5, updated:'2026-03-18T09:10:00' },
  { id:'m24', brand:'United',              name:'United Ingleburn',          lat:-33.9990, lng:150.8630, price:162.7, updated:'2026-03-18T08:30:00' },
  { id:'m25', brand:'BP',                  name:'BP Newtown',                lat:-33.8958, lng:151.1787, price:166.3, updated:'2026-03-18T09:00:00' },
]
const MOCK_ULP: FuelStation[] = MOCK_DIESEL.map(s => ({
  ...s, id: s.id + '_u', price: s.price !== null ? parseFloat((s.price + 8.3).toFixed(1)) : null,
}))

// ---------------------------------------------------------------------------
// Get an OAuth access token
// ---------------------------------------------------------------------------
async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${NSW_BASE}/oauth/client_credential/accesstoken?grant_type=client_credentials`,
    {
      method:  'GET',
      headers: { Authorization: `Basic ${Buffer.from(`${NSW_KEY}:${NSW_SECRET}`).toString('base64')}` },
    }
  )
  if (!res.ok) throw new Error(`OAuth failed: ${res.status}`)
  const { access_token } = await res.json()
  if (!access_token) throw new Error('No access_token in OAuth response')
  return access_token
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const neLat    = parseFloat(searchParams.get('neLat') || '')
  const neLng    = parseFloat(searchParams.get('neLng') || '')
  const swLat    = parseFloat(searchParams.get('swLat') || '')
  const swLng    = parseFloat(searchParams.get('swLng') || '')
  const fuelType = (searchParams.get('fuelType') || 'diesel') as 'diesel' | 'ulp'

  if (isNaN(neLat) || isNaN(neLng) || isNaN(swLat) || isNaN(swLng)) {
    return NextResponse.json({ error: 'Missing bounds parameters' }, { status: 400 })
  }

  // ── Live NSW FuelCheck data ────────────────────────────────────────────────
  if (NSW_KEY && NSW_SECRET) {
    try {
      const fuelCode    = FUEL_TYPE_CODES[fuelType] ?? 'DL'
      const token       = await getAccessToken()
      const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      // Fetch all station reference data + all current prices in parallel
      const [refRes, pricesRes] = await Promise.all([
        fetch(`${NSW_BASE}/FuelCheckRefData/v2/fuel/lovs`, {
          headers: authHeaders,
          next: { revalidate: 3600 }, // station list changes rarely — cache 1 hr
        }),
        fetch(`${NSW_BASE}/FuelPriceCheck/v2/fuel/prices`, {
          headers: authHeaders,
          next: { revalidate: 300 }, // prices refresh every 5 min
        }),
      ])

      if (!refRes.ok)    throw new Error(`Ref data error: ${refRes.status} ${await refRes.text()}`)
      if (!pricesRes.ok) throw new Error(`Prices error: ${pricesRes.status} ${await pricesRes.text()}`)

      const refData    = await refRes.json()
      const pricesData = await pricesRes.json()

      // Build station location map: stationcode → { lat, lng, name, brand }
      const stationMap: Record<string, { lat: number; lng: number; name: string; brand: string }> = {}
      const rawStations: any[] = refData.stations ?? refData.Stations ?? []
      rawStations.forEach((s: any) => {
        const code = s.code ?? s.Code
        const lat  = s.location?.latitude  ?? s.Latitude  ?? s.lat
        const lng  = s.location?.longitude ?? s.Longitude ?? s.lng
        if (code && lat && lng) {
          stationMap[code] = {
            lat:   Number(lat),
            lng:   Number(lng),
            name:  s.name  ?? s.Name  ?? 'Unknown Station',
            brand: s.brand ?? s.Brand ?? 'Unknown',
          }
        }
      })

      // Build price list filtered to requested fuel type and viewport
      const rawPrices: any[] = pricesData.prices ?? pricesData.Prices ?? []
      const stations: FuelStation[] = rawPrices
        .filter((p: any) => {
          const ft = p.fueltype ?? p.FuelType ?? p.fuelType ?? ''
          return ft === fuelCode
        })
        .map((p: any) => {
          const code    = p.stationcode ?? p.StationCode ?? p.stationCode ?? ''
          const station = stationMap[code]
          if (!station) return null

          // Price may be in tenths of a cent (e.g. 1649 = 164.9) or direct c/L
          const rawPrice = p.price ?? p.Price ?? null
          const price    = rawPrice !== null
            ? (rawPrice > 1000 ? rawPrice / 10 : rawPrice)
            : null

          return {
            id:      code,
            name:    station.name,
            brand:   station.brand,
            lat:     station.lat,
            lng:     station.lng,
            price,
            updated: p.lastupdated ?? p.LastUpdated ?? p.lastUpdated ?? null,
          }
        })
        .filter((s): s is FuelStation =>
          s !== null &&
          s.lat >= swLat && s.lat <= neLat &&
          s.lng >= swLng && s.lng <= neLng
        )

      return NextResponse.json({ stations, mock: false, total: stations.length })
    } catch (err) {
      console.error('NSW FuelCheck error, falling back to mock:', err)
    }
  }

  // ── Mock fallback ──────────────────────────────────────────────────────────
  const pool     = fuelType === 'ulp' ? MOCK_ULP : MOCK_DIESEL
  const stations = pool.filter(
    s => s.lat >= swLat && s.lat <= neLat && s.lng >= swLng && s.lng <= neLng
  )
  return NextResponse.json({ stations, mock: true })
}
