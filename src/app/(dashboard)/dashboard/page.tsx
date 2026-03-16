import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getComplianceItems } from '@/lib/utils/compliance'
import { ComplianceBadge } from '@/components/compliance-badge'
import { Truck, ShieldCheck, Fuel, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Vehicle, TGPPrice } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: vehicles }, { data: tgpToday }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('user_id', user!.id),
    supabase.from('tgp_prices').select('*').order('date', { ascending: false }).limit(5),
  ])

  const items = getComplianceItems((vehicles as Vehicle[]) || [])
  const overdue    = items.filter(i => i.status === 'overdue')
  const dueWeek    = items.filter(i => i.status === 'due-week')
  const dueMonth   = items.filter(i => i.status === 'due-month')
  const urgentItems = items.filter(i => i.status !== 'ok').slice(0, 5)

  const latestPrices = tgpToday as TGPPrice[] || []
  const cheapestOverall = latestPrices.reduce((best, row) => {
    const min = Math.min(row.shell_viva ?? 999, row.bp ?? 999, row.ampol ?? 999)
    return min < best.price ? { price: min, terminal: row.terminal, provider: row.cheapest_provider ?? '' } : best
  }, { price: 999, terminal: '', provider: '' })

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {name} 👋</h1>
        <p className="text-slate-400 mt-1">Here is your fleet summary</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Total Vehicles</CardTitle>
            <Truck size={18} className="text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{vehicles?.length ?? 0}</p>
            <p className="text-slate-500 text-xs mt-1">in your fleet</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle size={18} className="text-red-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${overdue.length > 0 ? 'text-red-400' : 'text-white'}`}>{overdue.length}</p>
            <p className="text-slate-500 text-xs mt-1">compliance items</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Due This Week</CardTitle>
            <ShieldCheck size={18} className="text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${dueWeek.length > 0 ? 'text-amber-400' : 'text-white'}`}>{dueWeek.length}</p>
            <p className="text-slate-500 text-xs mt-1">{dueMonth.length} more this month</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Cheapest Fuel</CardTitle>
            <Fuel size={18} className="text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {cheapestOverall.price < 999 ? `${cheapestOverall.price}¢` : '—'}
            </p>
            <p className="text-slate-500 text-xs mt-1 truncate">
              {cheapestOverall.provider} · {cheapestOverall.terminal.split(' ')[0]}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Alerts */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Compliance Alerts</CardTitle>
            <Link href="/compliance" className="text-blue-400 text-sm hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentItems.length === 0 ? (
              <div className="text-center py-6">
                <ShieldCheck size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">All compliance items are up to date</p>
              </div>
            ) : (
              urgentItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{item.vehicleName}</p>
                    <p className="text-slate-400 text-xs capitalize">{item.type} · {format(parseISO(item.dueDate), 'd MMM yyyy')}</p>
                  </div>
                  <ComplianceBadge status={item.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Fuel Prices */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Today's Fuel Prices</CardTitle>
            <Link href="/fuel-pricing" className="text-blue-400 text-sm hover:underline">Full view</Link>
          </CardHeader>
          <CardContent>
            {latestPrices.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No pricing data available</p>
            ) : (
              <div className="space-y-2">
                {latestPrices.slice(0, 4).map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">{row.terminal}</p>
                      <p className="text-slate-400 text-xs">Cheapest: {row.cheapest_provider}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-sm">
                        {Math.min(row.shell_viva ?? 999, row.bp ?? 999, row.ampol ?? 999)}¢
                      </p>
                      <p className="text-slate-500 text-xs">spread {row.spread}¢</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
