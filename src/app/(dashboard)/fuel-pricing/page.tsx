'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, parseISO, addDays } from 'date-fns'
import { MapPin, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import type { TGPPrice } from '@/lib/types'

// react-leaflet must be client-only (no SSR)
const FuelMap = dynamic(() => import('./fuel-map'), {
  ssr:     false,
  loading: () => (
    <div className="h-[620px] bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-sm animate-pulse">
      Loading map…
    </div>
  ),
})

const TERMINALS = [
  'Sydney (Silverwater)',
  'Melbourne (Newport)',
  'Brisbane (Pinkenba)',
  'Adelaide (Birkenhead)',
  'Perth (Kwinana)',
]

function displayTerminal(t: string) {
  return t.replace(/\s*\(.*\)/, '')
}

const COLORS = { 'Shell Viva': '#f97316', BP: '#3b82f6', Ampol: '#22c55e' }

type Tab = 'live' | 'tgp'

export default function FuelPricingPage() {
  const [tab,              setTab]             = useState<Tab>('live')
  const [discountCpl,      setDiscountCpl]     = useState<number | null>(null)
  const [prices,           setPrices]          = useState<TGPPrice[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState(TERMINALS[0])
  const [period,           setPeriod]          = useState('30')
  const [loading,          setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const sb = createClient()

      const [{ data: tgp }, { data: { user } }] = await Promise.all([
        sb.from('tgp_prices').select('*').order('date', { ascending: false }).limit(61 * 5),
        sb.auth.getUser(),
      ])

      setPrices((tgp as TGPPrice[]) || [])

      if (user) {
        const { data: fuelSettings } = await sb
          .from('user_fuel_settings')
          .select('fuel_discount_cpl')
          .eq('user_id', user.id)
          .maybeSingle()
        setDiscountCpl(fuelSettings?.fuel_discount_cpl ?? null)
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── TGP tab data ──────────────────────────────────────────────────────────
  const latestByTerminal = TERMINALS.map(terminal => ({
    terminal,
    row: prices.filter(p => p.terminal === terminal)[0],
  }))

  const latestDate = prices[0]?.date
  const asOfDate   = latestDate
    ? format(addDays(parseISO(latestDate), 1), 'd MMM yyyy')
    : null

  const days      = parseInt(period)
  const chartData = prices
    .filter(p => p.terminal === selectedTerminal)
    .slice(0, days)
    .reverse()
    .map(p => ({
      date:         format(parseISO(p.date), 'd MMM'),
      'Shell Viva': p.shell_viva,
      BP:           p.bp,
      Ampol:        p.ampol,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Fuel Pricing</h1>
          <p className="text-slate-400 mt-1">Live board prices & terminal gate prices</p>
        </div>
        {discountCpl !== null && (
          <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
            Your discount: −{discountCpl}¢/L &nbsp;·&nbsp;{' '}
            <Link href="/settings" className="underline hover:text-green-300">Edit in Settings</Link>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'live'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin size={15} />
          Live Prices
        </button>
        <button
          onClick={() => setTab('tgp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'tgp'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 size={15} />
          TGP Prices
        </button>
      </div>

      {/* ── Live Prices tab ─────────────────────────────────────────────── */}
      {tab === 'live' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white">Live Board Prices</CardTitle>
              <span className="text-xs text-slate-500">
                Powered by Petrol Spy · Pan & zoom to explore
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <FuelMap discountCpl={discountCpl} />
          </CardContent>
        </Card>
      )}

      {/* ── TGP Prices tab ──────────────────────────────────────────────── */}
      {tab === 'tgp' && (
        <>
          {/* Terminal gate price table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white">Terminal Gate Prices — All Terminals</CardTitle>
                {asOfDate && (
                  <span className="text-sm text-slate-400">As of {asOfDate}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="text-left py-2 pr-4">Terminal</th>
                      <th className="text-right py-2 px-4 text-orange-400">Shell Viva</th>
                      <th className="text-right py-2 px-4 text-blue-400">BP</th>
                      <th className="text-right py-2 px-4 text-green-400">Ampol</th>
                      <th className="text-right py-2 px-4">Cheapest</th>
                      <th className="text-right py-2 pl-4">Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestByTerminal.map(({ terminal, row }) => (
                      <tr key={terminal} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pr-4 text-white font-medium">{displayTerminal(terminal)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{row?.shell_viva ?? '—'}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{row?.bp ?? '—'}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{row?.ampol ?? '—'}</td>
                        <td className="py-3 px-4 text-right">
                          {row && (
                            <span className="text-green-400 font-semibold">
                              {row.cheapest_provider} ({Math.min(row.shell_viva ?? 999, row.bp ?? 999, row.ampol ?? 999)}¢)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-4 text-right text-slate-400">{row?.spread ?? '—'}¢</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Historical chart */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-white">Price History</CardTitle>
                <div className="flex gap-3">
                  <Select value={selectedTerminal} onValueChange={v => v && setSelectedTerminal(v)}>
                    <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {TERMINALS.map(t => (
                        <SelectItem key={t} value={t} className="text-white">{displayTerminal(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={period} onValueChange={v => v && setPeriod(v)}>
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="7"  className="text-white">7 days</SelectItem>
                      <SelectItem value="30" className="text-white">30 days</SelectItem>
                      <SelectItem value="61" className="text-white">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={v => `${v}¢`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(v) => [`${v}¢/L`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    {Object.entries(COLORS).map(([key, color]) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
