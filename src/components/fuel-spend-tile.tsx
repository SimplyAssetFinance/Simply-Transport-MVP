'use client'
import { useEffect, useState } from 'react'
import { Fuel, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

type Period = 30 | 60 | 90

interface SpendData {
  total_spend_aud:   number
  total_litres:      number
  avg_price_cpl:     number
  transaction_count: number
  savings_aud:       number
  discount_label:    string
  chart_buckets:     { period: string; spend_aud: number }[]
  top_sites:         { site_name: string; total_spend: number; visit_count: number }[]
}

const fmt     = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtK    = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`
const fmtCpl  = (n: number) => `${n.toFixed(1)}¢`

export function FuelSpendTile() {
  const [period,  setPeriod]  = useState<Period>(90)
  const [data,    setData]    = useState<SpendData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fuel/spend?days=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  const periodButtons = (
    <div className="flex items-center gap-1">
      {([30, 60, 90] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {p}d
        </button>
      ))}
    </div>
  )

  if (loading && !data) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel size={18} className="text-green-400" />
            <CardTitle className="text-white">Fuel Spend</CardTitle>
          </div>
          {periodButtons}
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-slate-500 text-sm">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.transaction_count === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel size={18} className="text-green-400" />
            <CardTitle className="text-white">Fuel Spend</CardTitle>
          </div>
          {periodButtons}
        </CardHeader>
        <CardContent className="py-6 text-center space-y-1">
          <p className="text-slate-400 text-sm">No fuel transactions in this period.</p>
          <Link href="/settings" className="text-blue-400 text-xs hover:underline">
            Upload your fuel card CSV in Settings →
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel size={18} className="text-green-400" />
          <CardTitle className="text-white">Fuel Spend</CardTitle>
        </div>
        {periodButtons}
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs">Total Spend</p>
            <p className="text-white text-xl font-bold mt-1">{fmt(data.total_spend_aud)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Litres Purchased</p>
            <p className="text-white text-xl font-bold mt-1">
              {data.total_litres.toLocaleString('en-AU', { maximumFractionDigits: 0 })} L
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Avg Price/L</p>
            <p className="text-white text-xl font-bold mt-1">{fmtCpl(data.avg_price_cpl)}</p>
          </div>
        </div>

        {/* Savings badge */}
        {data.savings_aud > 0 && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <TrendingUp size={14} className="text-green-400 shrink-0" />
            <p className="text-green-400 text-sm">
              You saved {fmt(data.savings_aud)}
              <span className="text-green-600 text-xs ml-1">({data.discount_label})</span>
            </p>
          </div>
        )}

        {/* Spend chart */}
        {data.chart_buckets.length > 1 && (
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart_buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={v => {
                    try { return format(parseISO(v), 'd MMM') } catch { return v }
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={fmtK}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#94a3b8', marginBottom: 2 }}
                  formatter={(v) => [fmt(Number(v ?? 0)), 'Spend']}
                  labelFormatter={v => {
                    try { return format(parseISO(v as string), period <= 30 ? 'd MMM yyyy' : "'w/c' d MMM yyyy") }
                    catch { return v as string }
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="spend_aud"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 5 sites */}
        {data.top_sites.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Sites by Spend</p>
            <div className="space-y-0.5">
              {data.top_sites.map((site, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-600 text-xs w-4 shrink-0 text-right">{i + 1}.</span>
                    <p className="text-slate-300 text-sm truncate">{site.site_name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-slate-500 text-xs">{site.visit_count} visits</span>
                    <span className="text-white text-sm font-medium w-20 text-right">{fmt(site.total_spend)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
