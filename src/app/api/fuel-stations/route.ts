import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// NSW FuelCheck API proxy
// ---------------------------------------------------------------------------
// Register free at https://api.nsw.gov.au → subscribe to "FuelCheck" API
// Create an app to get a Consumer Key + Consumer Secret, then add to Vercel:
//   NSW_FUEL_CHECK_KEY=your_consumer_key
//   NSW_FUEL_CHECK_SECRET=your_consumer_secret
//
// Without keys, falls back to mock Sydney station data for testing.
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
// Mock Sydney stations — used when no API key is configured
// Prices in cents/litre (realistic for March 2026)
// ---------------------------------------------------------------------------
const MOCK_STATIONS_DIESEL: FuelStation[] = [
  { id:'m1',  brand:'Shell Coles Express', name:'Shell Sydney CBD',       lat:-33.8651, lng:151.2093, price:164.9, updated:'2026-03-18T09:00:00' },
  { id:'m2',  brand:'BP',                  name:'BP Parramatta',           lat:-33.8153, lng:151.0017, price:163.7, updated:'2026-03-18T08:45:00' },
  { id:'m3',  brand:'Caltex Woolworths',   name:'Caltex Chatswood',        lat:-33.7975, lng:151.1808, price:165.2, updated:'2026-03-18T09:10:00' },
  { id:'m4',  brand:'United',              name:'United Bondi',             lat:-33.8914, lng:151.2767, price:166.5, updated:'2026-03-18T08:30:00' },
  { id:'m5',  brand:'BP',                  name:'BP Randwick',              lat:-33.9143, lng:151.2388, price:165.9, updated:'2026-03-18T09:05:00' },
  { id:'m6',  brand:'Shell',               name:'Shell Hurstville',         lat:-33.9633, lng:151.1024, price:164.3, updated:'2026-03-18T08:50:00' },
  { id:'m7',  brand:'Caltex',              name:'Caltex Liverpool',         lat:-33.9200, lng:150.9229, price:162.8, updated:'2026-03-18T09:15:00' },
  { id:'m8',  brand:'BP',                  name:'BP Penrith',               lat:-33.7499, lng:150.6942, price:163.1, updated:'2026-03-18T08:40:00' },
  { id:'m9',  brand:'Caltex Woolworths',   name:'Caltex Blacktown',         lat:-33.7712, lng:150.9166, price:163.5, updated:'2026-03-18T09:20:00' },
  { id:'m10', brand:'Shell Coles Express', name:'Shell Hornsby',            lat:-33.7044, lng:151.0985, price:164.6, updated:'2026-03-18T09:00:00' },
  { id:'m11', brand:'United',              name:'United Manly',             lat:-33.7969, lng:151.2855, price:168.4, updated:'2026-03-18T08:55:00' },
  { id:'m12', brand:'BP',                  name:'BP Campbelltown',          lat:-34.0644, lng:150.8148, price:163.0, updated:'2026-03-18T09:10:00' },
  { id:'m13', brand:'Caltex',              name:'Caltex Bankstown',         lat:-33.9194, lng:151.0352, price:164.1, updated:'2026-03-18T08:45:00' },
  { id:'m14', brand:'Shell',               name:'Shell Auburn',             lat:-33.8498, lng:151.0332, price:164.7, updated:'2026-03-18T09:05:00' },
  { id:'m15', brand:'BP',                  name:'BP Ryde',                  lat:-33.8147, lng:151.1032, price:165.4, updated:'2026-03-18T09:00:00' },
  { id:'m16', brand:'Caltex',              name:'Caltex Miranda',           lat:-34.0393, lng:151.1003, price:165.1, updated:'2026-03-18T08:35:00' },
  { id:'m17', brand:'Shell Coles Express', name:'Shell Sutherland',         lat:-34.0329, lng:151.0566, price:165.6, updated:'2026-03-18T09:15:00' },
  { id:'m18', brand:'United',              name:'United Castle Hill',       lat:-33.7303, lng:151.0040, price:163.8, updated:'2026-03-18T08:50:00' },
  { id:'m19', brand:'BP',                  name:'BP Gordon',                lat:-33.7576, lng:151.1519, price:165.3, updated:'2026-03-18T09:00:00' },
  { id:'m20', brand:'Caltex',              name:'Caltex Seven Hills',       lat:-33.7712, lng:150.9366, price:162.9, updated:'2026-03-18T08:40:00' },
  { id:'m21', brand:'BP',                  name:'BP Leichhardt',            lat:-33.8834, lng:151.1568, price:165.1, updated:'2026-03-18T09:05:00' },
  { id:'m22', brand:'Shell Coles Express', name:'Shell Dee Why',            lat:-33.7501, lng:151.2858, price:167.2, updated:'2026-03-18T08:55:00' },
  { id:'m23', brand:'Caltex Woolworths',   name:'Caltex Wetherill Park',    lat:-33.8476, lng:150.9010, price:162.5, updated:'2026-03-18T09:10:00' },
  { id:'m24', brand:'United',              name:'United Ingleburn',         lat:-33.9990, lng:150.8630, price:162.7, updated:'2026-03-18T08:30:00' },
  { id:'m25', brand:'BP',                  name:'BP Newtown',               lat:-33.8958, lng:151.1787, price:166.3, updated:'2026-03-18T09:00:00' },
]

const MOCK_STATIONS_ULP: FuelStation[] = MOCK_STATIONS_DIESEL.map(s => ({
  ...s,
  id: s.id + '_ulp',
  price: s.price !== null ? parseFloat((s.price + 8.3).toFixed(1)) : null,
}))

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

  // ── Try NSW FuelCheck API if keys are set ─────────────────────────────────
  if (NSW_KEY && NSW_SECRET) {
    try {
      const centreLat = (neLat + swLat) / 2
      const centreLng = (neLng + swLng) / 2
      const radiusKm  = Math.min(50, Math.max(5, Math.round(
        111 * Math.abs(neLat - swLat) / 2
      )))
      const fuelCode  = FUEL_TYPE_CODES[fuelType] ?? 'DL'

      // Step 1: Get access token via client credentials (Consumer Key:Secret)
      const tokenRes = await fetch(`${NSW_BASE}/oauth/client_credential/accesstoken?grant_type=client_credentials`, {
        method:  'GET',
        headers: { Authorization: `Basic ${Buffer.from(`${NSW_KEY}:${NSW_SECRET}`).toString('base64')}` },
      })
      const { access_token } = await tokenRes.json()

      // Step 2: Fetch stations nearby (POST /FuelPriceCheck/v2/fuel/prices/nearby)
      const stationsRes = await fetch(
        `${NSW_BASE}/FuelPriceCheck/v2/fuel/prices/nearby`,
        {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fueltype:  fuelCode,
            latitude:  centreLat,
            longitude: centreLng,
            radius:    radiusKm,
          }),
          next: { revalidate: 300 },
        }
      )

      if (!stationsRes.ok) {
        console.error('NSW FuelCheck error:', stationsRes.status, await stationsRes.text())
        throw new Error('Upstream API error')
      }

      const data = await stationsRes.json()

      // Build price lookup
      const priceMap: Record<string, { price: number; updated: string | null }> = {}
      ;(data.prices ?? []).forEach((p: any) => {
        priceMap[p.stationcode] = {
          price:   p.price / 100, // API returns price in tenths of a cent → convert to c/L
          updated: p.lastupdated ?? null,
        }
      })

      const stations: FuelStation[] = (data.stations ?? [])
        .filter((s: any) => s.location?.latitude && s.location?.longitude)
        .map((s: any) => ({
          id:      String(s.stationid),
          name:    s.name   ?? 'Unknown Station',
          brand:   s.brand  ?? 'Unknown',
          lat:     Number(s.location.latitude),
          lng:     Number(s.location.longitude),
          price:   priceMap[s.code]?.price   ?? null,
          updated: priceMap[s.code]?.updated ?? null,
        }))
        .filter((s: FuelStation) => s.lat >= swLat && s.lat <= neLat && s.lng >= swLng && s.lng <= neLng)

      return NextResponse.json({ stations, mock: false })
    } catch (err) {
      console.error('NSW FuelCheck API error, falling back to mock data:', err)
    }
  }

  // ── Mock data fallback (no API key or upstream error) ──────────────────────
  const pool = fuelType === 'ulp' ? MOCK_STATIONS_ULP : MOCK_STATIONS_DIESEL
  const stations = pool.filter(
    s => s.lat >= swLat && s.lat <= neLat && s.lng >= swLng && s.lng <= neLng
  )

  return NextResponse.json({ stations, mock: true })
}
