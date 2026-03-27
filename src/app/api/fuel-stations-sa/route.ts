import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// South Australia Fuel Pricing Information API proxy
// Env var: SA_FUEL_TOKEN  (the SubscriberToken GUID)
// Docs: https://fppdirectapi-prod.safuelpricinginformation.com.au
// ---------------------------------------------------------------------------

const SA_BASE       = 'https://fppdirectapi-prod.safuelpricinginformation.com.au'
const COUNTRY_ID    = 21
const GEO_LEVEL     = 3
const GEO_REGION_ID = 4   // South Australia

// FPD fuel type IDs (verified via /Subscriber/GetCountryFuelTypes)
const FUEL_TYPE_IDS: Record<string, number> = {
  diesel: 3,   // Diesel
  ulp:    2,   // Unleaded
}

function authHeader(): string {
  return `FPDAPI SubscriberToken=${process.env.SA_FUEL_TOKEN}`
}

interface FpdSite {
  S:   number   // SiteId
  N:   string   // Name
  B:   number   // BrandId (resolved via GetCountryBrands)
  A:   string   // Address
  Lat: number
  Lng: number
}

interface FpdPrice {
  SiteId:             number
  FuelId:             number
  Price:              number   // tenths of a cent — divide by 10 for ¢/L
  TransactionDateUtc: string
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const neLat    = parseFloat(searchParams.get('neLat') || '')
  const neLng    = parseFloat(searchParams.get('neLng') || '')
  const swLat    = parseFloat(searchParams.get('swLat') || '')
  const swLng    = parseFloat(searchParams.get('swLng') || '')
  const fuelType = (searchParams.get('fuelType') || 'diesel') as 'diesel' | 'ulp'
  const fuelId   = FUEL_TYPE_IDS[fuelType] ?? FUEL_TYPE_IDS.diesel

  if (isNaN(neLat) || isNaN(neLng) || isNaN(swLat) || isNaN(swLng)) {
    return NextResponse.json({ error: 'Missing bounds parameters' }, { status: 400 })
  }

  if (!process.env.SA_FUEL_TOKEN) {
    return NextResponse.json({ stations: [], error: 'SA_FUEL_TOKEN not configured' })
  }

  const headers = {
    Authorization:  authHeader(),
    'Content-Type': 'application/json',
  }

  const params = `countryId=${COUNTRY_ID}&geoRegionLevel=${GEO_LEVEL}&geoRegionId=${GEO_REGION_ID}`

  try {
    const [sitesRes, pricesRes, brandsRes] = await Promise.all([
      fetch(`${SA_BASE}/Subscriber/GetFullSiteDetails?${params}`,           { headers, next: { revalidate: 3600 } }),
      fetch(`${SA_BASE}/Price/GetSitesPrices?${params}`,                    { headers, next: { revalidate: 1800 } }),
      fetch(`${SA_BASE}/Subscriber/GetCountryBrands?countryId=${COUNTRY_ID}`, { headers, next: { revalidate: 86400 } }),
    ])

    if (!sitesRes.ok)  throw new Error(`Sites API ${sitesRes.status}: ${await sitesRes.text()}`)
    if (!pricesRes.ok) throw new Error(`Prices API ${pricesRes.status}: ${await pricesRes.text()}`)

    const sitesData  = await sitesRes.json()
    const pricesData = await pricesRes.json()

    // Build brand ID → name lookup
    const brandMap: Record<number, string> = {}
    if (brandsRes.ok) {
      const brandsData = await brandsRes.json()
      for (const b of (brandsData.Brands ?? [])) {
        brandMap[b.BrandId] = b.Name
      }
    }

    // Build site index keyed by SiteId
    const rawSites: FpdSite[] = sitesData.S ?? sitesData.Sites ?? []
    const siteIndex: Record<number, FpdSite> = {}
    for (const s of rawSites) {
      const id = s.S ?? (s as any).SiteId
      if (id != null) siteIndex[id] = s
    }

    // Filter prices to requested fuel type, join with site metadata, filter by viewport
    const rawPrices: FpdPrice[] = pricesData.SitePrices ?? []
    const stations: FuelStation[] = rawPrices
      .filter(p => p.FuelId === fuelId)
      .map((p): FuelStation | null => {
        const site = siteIndex[p.SiteId]
        if (!site) return null

        const lat = site.Lat ?? (site as any).Latitude
        const lng = site.Lng ?? (site as any).Longitude
        if (lat == null || lng == null) return null
        if (lat < swLat || lat > neLat || lng < swLng || lng > neLng) return null

        const brandId = site.B ?? (site as any).BrandId
        const brand   = brandMap[brandId] ?? (site as any).Brand ?? 'Unknown'

        return {
          id:      `sa-${p.SiteId}`,
          name:    site.N ?? (site as any).Name ?? 'Unknown',
          brand,
          address: site.A ?? (site as any).Address ?? '',
          lat:     Number(lat),
          lng:     Number(lng),
          price:   p.Price != null ? parseFloat((p.Price / 10).toFixed(1)) : null,
          updated: p.TransactionDateUtc ?? null,
        }
      })
      .filter((s): s is FuelStation => s !== null)

    return NextResponse.json({ stations, mock: false, total: stations.length })

  } catch (err: any) {
    console.error('SA Fuel API error:', err.message)
    return NextResponse.json({ stations: [], error: err.message }, { status: 502 })
  }
}
