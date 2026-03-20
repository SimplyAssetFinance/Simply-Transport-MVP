import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// FuelWatch WA proxy — public RSS feed, no auth required
// Prices are fixed daily by WA law — cached for 1 hour
// ---------------------------------------------------------------------------

const WA_RSS = 'https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS'

const FUEL_PRODUCT: Record<string, string> = {
  diesel: '4',
  ulp:    '1',
}

export interface FuelStation {
  id:      string
  name:    string
  brand:   string
  address: string
  lat:     number
  lng:     number
  price:   number | null
  updated: string | null
}

// Extract value from an XML tag, handles namespaced tags (e.g. fuelwatch:price)
function getTag(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'i')
  )
  if (!m) return ''
  // Strip CDATA wrapper if present
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const neLat    = parseFloat(searchParams.get('neLat') || '')
  const neLng    = parseFloat(searchParams.get('neLng') || '')
  const swLat    = parseFloat(searchParams.get('swLat') || '')
  const swLng    = parseFloat(searchParams.get('swLng') || '')
  const fuelType = (searchParams.get('fuelType') || 'diesel') as 'diesel' | 'ulp'
  const product  = FUEL_PRODUCT[fuelType] ?? '4'

  if (isNaN(neLat) || isNaN(neLng) || isNaN(swLat) || isNaN(swLng)) {
    return NextResponse.json({ error: 'Missing bounds parameters' }, { status: 400 })
  }

  try {
    const res = await fetch(`${WA_RSS}?Product=${product}`, {
      headers: { 'User-Agent': 'SimplyTransport/1.0' },
      next: { revalidate: 3600 }, // WA prices change once daily
    })

    if (!res.ok) throw new Error(`FuelWatch WA ${res.status}: ${await res.text()}`)

    const xml = await res.text()

    // Split on <item> boundaries
    const itemBlocks = xml.split(/<item>/i).slice(1)

    const stations: FuelStation[] = []

    for (let i = 0; i < itemBlocks.length; i++) {
      const block = itemBlocks[i]

      const lat = parseFloat(getTag(block, 'latitude'))
      const lng = parseFloat(getTag(block, 'longitude'))
      if (isNaN(lat) || isNaN(lng)) continue

      // Viewport filter
      if (lat < swLat || lat > neLat || lng < swLng || lng > neLng) continue

      const priceRaw = getTag(block, 'price')
      const address  = getTag(block, 'address')
      const suburb   = getTag(block, 'location')

      stations.push({
        id:      `wa-${i}`,
        name:    getTag(block, 'trading_name'),
        brand:   getTag(block, 'brand'),
        address: [address, suburb].filter(Boolean).join(', '),
        lat,
        lng,
        price:   priceRaw ? parseFloat(priceRaw) : null,
        updated: null, // WA prices are set daily — no per-station timestamp
      })
    }

    return NextResponse.json({ stations, mock: false, total: stations.length })

  } catch (err: any) {
    console.error('FuelWatch WA error:', err.message)
    return NextResponse.json({ stations: [], error: err.message }, { status: 502 })
  }
}
