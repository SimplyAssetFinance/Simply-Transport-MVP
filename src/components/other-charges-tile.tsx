'use client'
import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

type Period = 30 | 60 | 90

interface OtherChargesData {
  period_days:       number
  transaction_count: number
  total_aud:         number
  by_category:       { description: string; total_aud: number; count: number }[]
  recent:            { transaction_date: string; description: string; total_aud: number }[]
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function OtherChargesTile() {
  const [period,  setPeriod]  = useState<Period>(90)
  const [data,    setData]    = useState<OtherChargesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/other-charges?days=${period}`)
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
            <Receipt size={18} className="text-amber-400" />
            <CardTitle className="text-white">Other Card Charges</CardTitle>
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
            <Receipt size={18} className="text-amber-400" />
            <CardTitle className="text-white">Other Card Charges</CardTitle>
          </div>
          {periodButtons}
        </CardHeader>
        <CardContent className="py-6 text-center space-y-1">
          <p className="text-slate-400 text-sm">No other charges in this period.</p>
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
          <Receipt size={18} className="text-amber-400" />
          <CardTitle className="text-white">Other Card Charges</CardTitle>
        </div>
        {periodButtons}
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-xs">Total</p>
            <p className="text-white text-xl font-bold mt-1">{fmt(data.total_aud)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Transactions</p>
            <p className="text-white text-xl font-bold mt-1">{data.transaction_count}</p>
          </div>
        </div>

        {/* By category */}
        {data.by_category.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Type</p>
            <div className="space-y-0.5">
              {data.by_category.map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-300 text-sm truncate">{cat.description}</p>
                    <p className="text-slate-600 text-xs">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-white text-sm font-medium shrink-0 ml-3 w-20 text-right">
                    {fmt(cat.total_aud)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
