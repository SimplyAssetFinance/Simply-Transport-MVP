import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Petrol Spy API proxy
// ---------------------------------------------------------------------------
// Docs / API key: https://petrolspy.com.au (register for API access ~$250/mo)
// Drop your key into .env.local:  PETROL_SPY_API_KEY=your_key_here
// ---------------------------------------------------------------------------

const PETROL_SPY_API_KEY = process.env.PETROL_SPY_API_KEY
const PETROL_SPY_BASE    = 'https://petrolspy.com.au/webservice-1'

// Petrol Spy fuel type codes — adjust if their docs differ
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const neLat    = searchParams.get('neLat')
  const neLng    = searchParams.get('neLng')
  const swLat    = searchParams.get('swLat')
  const swLng    = searchParams.get('swLng')
  const fuelType = (searchParams.get('fuelType') || 'diesel') as 'diesel' | 'ulp'

  if (!neLat || !neLng || !swLat || !swLng) {
    return NextResponse.json({ error: 'Missing bounds parameters' }, { status: 400 })
  }

  // No API key → tell the client so it can show a placeholder
  if (!PETROL_SPY_API_KEY) {
    return NextResponse.json({ stations: [], apiKeyMissing: true })
  }

  try {
    const fuelCode = FUEL_TYPE_CODES[fuelType] ?? 'DL'

    // ---------------------------------------------------------------------------
    // Petrol Spy API call
    // NOTE: Adjust the URL / headers / query params once you have the API docs.
    //       The structure below is based on their documented webservice-1 endpoint.
    //       If they require the key as a query param instead of Bearer, swap the
    //       Authorization header for: &key=${PETROL_SPY_API_KEY}
    // ---------------------------------------------------------------------------
    const url = `${PETROL_SPY_BASE}/station/box?neLat=${neLat}&neLng=${neLng}&swLat=${swLat}&swLng=${swLng}&fuelType=${fuelCode}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PETROL_SPY_API_KEY}`,
        Accept:        'application/json',
      },
      next: { revalidate: 300 }, // Cache Petrol Spy response for 5 minutes
    })

    if (!res.ok) {
      console.error('Petrol Spy API error:', res.status, await res.text())
      return NextResponse.json({ stations: [], error: 'Upstream API error' }, { status: 502 })
    }

    const data = await res.json()

    // ---------------------------------------------------------------------------
    // Transform Petrol Spy response → our FuelStation shape.
    // NOTE: Adjust this mapping once you can see an actual API response.
    //       Common patterns are shown below; uncomment the one that matches.
    // ---------------------------------------------------------------------------
    const rawList: any[] = data?.data?.list ?? data?.stations ?? data?.results ?? []

    const stations: FuelStation[] = rawList
      .map((s: any) => {
        // Try multiple possible field names for robustness
        const lat   = s.lat    ?? s.latitude  ?? null
        const lng   = s.lng    ?? s.longitude ?? null
        const brand = s.brand  ?? s.tradingName ?? s.brandName ?? 'Unknown'

        // Price may be nested under lastKnownPrice, prices array, or flat
        const priceObj  = s.lastKnownPrice ?? s.prices?.find((p: any) => p.type === fuelCode || p.fuelType === fuelCode)
        const price     = priceObj?.price ?? s.price ?? null
        const updated   = priceObj?.modified ?? priceObj?.updated ?? s.updated ?? null

        if (!lat || !lng) return null

        return {
          id:      String(s.id ?? s.stationId ?? Math.random()),
          name:    s.name ?? s.stationName ?? 'Unknown Station',
          brand,
          lat:     Number(lat),
          lng:     Number(lng),
          price:   price !== null ? Number(price) : null,
          updated: updated ?? null,
        }
      })
      .filter(Boolean) as FuelStation[]

    return NextResponse.json({ stations })
  } catch (err) {
    console.error('fuel-stations route error:', err)
    return NextResponse.json({ stations: [], error: 'Internal error' }, { status: 500 })
  }
}
