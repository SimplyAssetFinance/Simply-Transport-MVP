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
      Authorization:    `Bearer ${token}`,
      apikey:           NSW_KEY,
      transactionID:    crypto.randomUUID(),
      requestTimeStamp: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      'Content-Type':   'application/json',
    }

    // Single call — the prices endpoint returns both stations (with coords) and prices
    const res = await fetch(`${NSW_BASE}/FuelPriceCheck/v2/fuel/prices`, {
      headers,
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`Prices API ${res.status}: ${msg}`)
    }

    const data = await res.json()

    // ── Build station location index keyed by code (string) ─────────────────
    type StationMeta = { lat: number; lng: number; name: string; brand: string }
    const stationIndex: Record<string, StationMeta> = {}

    const rawStations: any[] = Array.isArray(data.stations) ? data.stations : []
    for (const s of rawStations) {
      const code = s.code
      const lat  = s.location?.latitude
      const lng  = s.location?.longitude
      if (code && lat != null && lng != null) {
        stationIndex[String(code)] = {
          lat:   Number(lat),
          lng:   Number(lng),
          name:  s.name  ?? 'Unknown',
          brand: s.brand ?? 'Unknown',
        }
      }
    }

    // ── Filter prices by fuel type + viewport ───────────────────────────────
    const rawPrices: any[] = Array.isArray(data.prices) ? data.prices : []

    const stations: FuelStation[] = rawPrices
      .filter((p: any) => p.fueltype === fuelCode)
      .map((p: any): FuelStation | null => {
        const code    = String(p.stationcode)
        const station = stationIndex[code]
        if (!station) return null

        // Price is already in cents/L (e.g. 279.9)
        const price = p.price != null ? parseFloat(Number(p.price).toFixed(1)) : null

        return {
          id:      code,
          name:    station.name,
          brand:   station.brand,
          lat:     station.lat,
          lng:     station.lng,
          price,
          updated: p.lastupdated ?? null,
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
