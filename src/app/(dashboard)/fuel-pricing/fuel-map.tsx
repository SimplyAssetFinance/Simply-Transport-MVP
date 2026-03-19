'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Map as LeafletMap, LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FuelStation } from '@/app/api/fuel-stations/route'

// ── Map event handler ────────────────────────────────────────────────────────
function MapEvents({
  onBoundsChange,
  fuelType,
}: {
  onBoundsChange: (b: LatLngBounds) => void
  fuelType: string
}) {
  const fetchRef = useRef(onBoundsChange)
  fetchRef.current = onBoundsChange

  const map = useMapEvents({
    moveend() {
      fetchRef.current(map.getBounds())
    },
  })

  useEffect(() => {
    fetchRef.current(map.getBounds())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelType])

  return null
}

// ── Colour by relative price ─────────────────────────────────────────────────
function priceColor(price: number | null, all: (number | null)[]): string {
  if (!price) return '#64748b'
  const valid = all.filter((p): p is number => p !== null).sort((a, b) => a - b)
  if (valid.length < 3) return '#3b82f6'
  const low  = valid[Math.floor(valid.length * 0.33)]
  const high = valid[Math.floor(valid.length * 0.67)]
  if (price <= low)  return '#22c55e'  // green  — cheapest third
  if (price >= high) return '#ef4444'  // red    — dearest third
  return '#f59e0b'                      // amber  — mid range
}

// ── Brand colour map ─────────────────────────────────────────────────────────
const BRAND_COLORS: Record<string, string> = {
  'bp':             '#00823e',
  'ampol':          '#e31837',
  'caltex':         '#e31837',
  'coles express':  '#cc0000',
  'shell':          '#fbce07',
  '7-eleven':       '#e31837',
  'united':         '#003087',
  'reddy':          '#d62d20',
  'woolworths':     '#00843d',
  'liberty':        '#f47920',
  'puma':           '#333333',
  'metro':          '#0047ab',
  'independent':    '#6366f1',
}

function brandColor(brand: string): string {
  return BRAND_COLORS[brand.toLowerCase()] ?? '#334155'
}

// ── DivIcon factory ───────────────────────────────────────────────────────────
function createFuelIcon(brand: string, price: number | null, color: string): L.DivIcon {
  const label     = brand.length > 12 ? brand.slice(0, 11) + '…' : brand
  const priceText = price !== null ? `${price}¢` : '—'
  const bg        = brandColor(brand)

  const html = `
    <div style="position:relative;display:inline-block;text-align:center;">
      <div style="
        border-radius:8px;
        overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,0.55);
        min-width:60px;
        white-space:nowrap;
      ">
        <div style="
          background:${bg};
          padding:3px 8px 2px;
          font:700 8px/1.4 Arial,sans-serif;
          color:#fff;
          letter-spacing:0.06em;
          text-transform:uppercase;
        ">${label}</div>
        <div style="
          background:#111827;
          padding:2px 8px 4px;
          font:800 13px/1.2 Arial,sans-serif;
          color:${color};
          border:2px solid ${color};
          border-top:none;
          border-radius:0 0 6px 6px;
        ">${priceText}</div>
      </div>
      <div style="
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:7px solid ${color};
        margin:0 auto;
      "></div>
    </div>
  `

  return L.divIcon({
    html,
    className:   '',
    iconSize:    [70, 50],
    iconAnchor:  [35, 50],
    popupAnchor: [0, -50],
  })
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  discountCpl: number | null
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FuelMap({ discountCpl }: Props) {
  const [stations, setStations] = useState<FuelStation[]>([])
  const [loading,  setLoading]  = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [fuelType, setFuelType] = useState<'diesel' | 'ulp'>('diesel')

  const fetchStations = useCallback(async (bounds: LatLngBounds) => {
    setLoading(true)
    try {
      const ne  = bounds.getNorthEast()
      const sw  = bounds.getSouthWest()
      const res = await fetch(
        `/api/fuel-stations?neLat=${ne.lat}&neLng=${ne.lng}&swLat=${sw.lat}&swLng=${sw.lng}&fuelType=${fuelType}`
      )
      const data = await res.json()
      if (data.error) {
        setApiError(data.error)
        setStations([])
      } else {
        setApiError(null)
        setStations(data.stations ?? [])
      }
    } catch {
      // network error — leave existing stations visible
    } finally {
      setLoading(false)
    }
  }, [fuelType])

  const allPrices = stations.map(s => s.price)

  return (
    <div className="space-y-3">
      {/* Fuel type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Fuel type:</span>
        {(['diesel', 'ulp'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFuelType(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              fuelType === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {f === 'diesel' ? 'Diesel' : 'ULP 91'}
          </button>
        ))}
        {discountCpl !== null && (
          <span className="ml-auto text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            Your discount: −{discountCpl}¢/L
          </span>
        )}
        {discountCpl === null && (
          <span className="ml-auto text-xs text-slate-500">
            Set your Cpl discount in Settings to see your price
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700">
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full shadow border border-slate-700">
            Loading stations…
          </div>
        )}
        {apiError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/20 border border-red-500/40 text-red-300 text-xs px-4 py-2 rounded-lg shadow max-w-sm text-center">
            API error: {apiError}
          </div>
        )}

        <MapContainer
          center={[-33.8688, 151.2093]}
          zoom={13}
          style={{ height: '560px' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onBoundsChange={fetchStations} fuelType={fuelType} />

          {stations.map((s) => {
            const color = priceColor(s.price, allPrices)
            const icon  = createFuelIcon(s.brand, s.price, color)
            return (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
                <Popup>
                  <div className="min-w-[180px] font-sans">
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{s.name}</p>
                    <p className="text-xs text-gray-400 mb-3">{s.brand}</p>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Board price</span>
                        <span className="font-bold text-gray-900">
                          {s.price !== null ? `${s.price}¢/L` : '—'}
                        </span>
                      </div>

                      {discountCpl !== null && s.price !== null && (
                        <div className="flex items-center justify-between text-green-700 bg-green-50 -mx-1 px-1 py-0.5 rounded">
                          <span>Your price (−{discountCpl}¢)</span>
                          <span className="font-bold">
                            {(s.price - discountCpl).toFixed(1)}¢/L
                          </span>
                        </div>
                      )}

                      {s.updated && (
                        <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                          Updated {s.updated}
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
          <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Price (relative)</p>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 shrink-0" /><span className="text-slate-300">Cheapest</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" /><span className="text-slate-300">Mid range</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500   shrink-0" /><span className="text-slate-300">Most expensive</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-500 shrink-0" /><span className="text-slate-300">No data</span></div>
        </div>

        {/* Station count */}
        {stations.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 shadow">
            {stations.length} station{stations.length !== 1 ? 's' : ''} in view
          </div>
        )}
      </div>
    </div>
  )
}
