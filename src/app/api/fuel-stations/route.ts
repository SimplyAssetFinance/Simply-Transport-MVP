import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// NSW FuelCheck API proxy
// Env vars: NSW_FUEL_CHECK_KEY, NSW_FUEL_CHECK_SECRET
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

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${NSW_BASE}/oauth/client_credential/accesstoken?grant_type=client_credentials`,
    {
      method:  'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${NSW_KEY}:${NSW_SECRET}`).toString('base64')}`,
      },
      cache: 'no-store',
    }
  )
  const body = await res.json()
  if (!res.ok || !body.access_token) {
    throw new Error(`OAuth failed ${res.status}: ${JSON.stringify(body)}`)
  }
  return body.access_token
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const neLat    = parseFloat(searchParams.get('neLat') || '')
  const neLng    = parseFloat(searchParams.get('neLng') || '')
  const swLat    = parseFloat(searchParams.get('swLat') || '')
  const swLng    = parseFloat(searchParams.get('swLng') || '')
  const fuelType = (searchParams.get('fuelType') || 'diesel') as 'diesel' | 'ulp'
  const fuelCode = FUEL_TYPE_CODES[fuelType] ?? 'DL'

  if (isNaN(neLat) || isNaN(neLng) || isNaN(swLat) || isNaN(swLng)) {
    return NextResponse.json({ error: 'Missing bounds parameters' }, { status: 400 })
  }

  if (!NSW_KEY || !NSW_SECRET) {
    return NextResponse.json({ stations: [], error: 'NSW_FUEL_CHECK_KEY / NSW_FUEL_CHECK_SECRET not configured' })
  }

  try {
    const token = await getAccessToken()
    const headers = {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    // Fetch all prices + all station reference data in parallel
    const [pricesRes, refRes] = await Promise.all([
      fetch(`${NSW_BASE}/FuelPriceCheck/v2/fuel/prices`, {
        headers,
        next: { revalidate: 300 },
      }),
      fetch(`${NSW_BASE}/FuelCheckRefData/v2/fuel/lovs`, {
        headers,
        next: { revalidate: 3600 },
      }),
    ])

    if (!pricesRes.ok) {
      const msg = await pricesRes.text()
      throw new Error(`Prices API ${pricesRes.status}: ${msg}`)
    }
    if (!refRes.ok) {
      const msg = await refRes.text()
      throw new Error(`RefData API ${refRes.status}: ${msg}`)
    }

    const pricesData = await pricesRes.json()
    const refData    = await refRes.json()

    // ── Build station location index ────────────────────────────────────────
    // GET /FuelPriceCheck/v2/fuel/prices returns { stations, prices }
    // GET /FuelCheckRefData/v2/fuel/lovs  returns { stations, fueltypes, brands }
    // Merge both sources so we have the best chance of finding coordinates
    type StationMeta = { lat: number; lng: number; name: string; brand: string }
    const stationIndex: Record<string, StationMeta> = {}

    function indexStations(list: any[]) {
      list.forEach((s: any) => {
        const code = s.code ?? s.stationcode ?? s.StationCode
        const lat  = s.location?.latitude  ?? s.Latitude  ?? s.lat  ?? s.latitude
        const lng  = s.location?.longitude ?? s.Longitude ?? s.lng  ?? s.longitude
        if (code && lat && lng) {
          stationIndex[code] = {
            lat:   Number(lat),
            lng:   Number(lng),
            name:  s.name  ?? s.Name  ?? s.stationName  ?? 'Unknown',
            brand: s.brand ?? s.Brand ?? s.brandName ?? 'Unknown',
          }
        }
      })
    }

    const pricesStations: any[] = pricesData.stations ?? pricesData.Stations ?? []
    const refStations:    any[] = refData.stations    ?? refData.Stations    ?? []
    indexStations(pricesStations)
    indexStations(refStations)

    // ── Build price list, filter by fuel type + viewport ───────────────────
    const allPrices: any[] = pricesData.prices ?? pricesData.Prices ?? []

    const stations: FuelStation[] = allPrices
      .filter((p: any) => {
        const ft = p.fueltype ?? p.FuelType ?? p.fuelType ?? ''
        return ft === fuelCode
      })
      .map((p: any): FuelStation | null => {
        const code    = p.stationcode ?? p.StationCode ?? p.stationCode ?? ''
        const station = stationIndex[code]
        if (!station) return null

        // Price: API returns tenths of a cent (e.g. 1649 → 164.9 c/L)
        const rawPrice = p.price ?? p.Price ?? null
        const price    = rawPrice !== null
          ? parseFloat((rawPrice > 1000 ? rawPrice / 10 : rawPrice).toFixed(1))
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

  } catch (err: any) {
    console.error('NSW FuelCheck error:', err.message)
    return NextResponse.json(
      { stations: [], error: err.message, mock: false },
      { status: 502 }
    )
  }
}
