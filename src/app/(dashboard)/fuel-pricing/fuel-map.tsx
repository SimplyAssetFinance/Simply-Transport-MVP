'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import type { Map as LeafletMap, LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { format, parseISO } from 'date-fns'
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

  // Trigger initial load + re-fetch when fuel type changes
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

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  discountCpl: number | null
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FuelMap({ discountCpl }: Props) {
  const [stations,  setStations]  = useState<FuelStation[]>([])
  const [loading,   setLoading]   = useState(false)
  const [isMock,    setIsMock]    = useState(false)
  const [fuelType,  setFuelType]  = useState<'diesel' | 'ulp'>('diesel')

  const fetchStations = useCallback(async (bounds: LatLngBounds) => {
    setLoading(true)
    try {
      const ne  = bounds.getNorthEast()
      const sw  = bounds.getSouthWest()
      const res = await fetch(
        `/api/fuel-stations?neLat=${ne.lat}&neLng=${ne.lng}&swLat=${sw.lat}&swLng=${sw.lng}&fuelType=${fuelType}`
      )
      const data = await res.json()
      setStations(data.stations ?? [])
      setIsMock(data.mock === true)
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
        {/* Status overlays */}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full shadow border border-slate-700">
            Loading stations…
          </div>
        )}
        {isMock && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs px-4 py-2 rounded-full shadow max-w-xs text-center">
            Demo data · Add NSW_FUEL_CHECK_API_KEY to Vercel for live prices
          </div>
        )}

        <MapContainer
          center={[-33.8688, 151.2093]}  // Default: Sydney
          zoom={13}
          style={{ height: '560px' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onBoundsChange={fetchStations} fuelType={fuelType} />

          {stations.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={11}
              pathOptions={{
                fillColor:   priceColor(s.price, allPrices),
                fillOpacity: 0.9,
                color:       '#fff',
                weight:      1.5,
              }}
            >
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
                        Updated {format(parseISO(s.updated), 'd MMM h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
          <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Price (relative)</p>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 shrink-0" /><span className="text-slate-300">Cheapest</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" /><span className="text-slate-300">Mid range</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shrink-0"   /><span className="text-slate-300">Most expensive</span></div>
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
