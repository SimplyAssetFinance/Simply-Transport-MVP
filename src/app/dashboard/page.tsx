import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, ClipboardCheck, AlertTriangle, Fuel } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch fleet stats
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, nickname, registration_plate, rego_expiry, insurance_expiry, next_service_date, is_active')
    .eq('is_active', true)

  const today = new Date()
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in7Days  = new Date(today.getTime() + 7  * 24 * 60 * 60 * 1000)

  function isOverdue(date: string | null) {
    return date ? new Date(date) < today : false
  }
  function isDueSoon(date: string | null, threshold: Date) {
    return date ? new Date(date) <= threshold && new Date(date) >= today : false
  }

  const allDates = (vehicles || []).flatMap(v => [
    v.rego_expiry, v.insurance_expiry, v.next_service_date
  ])

  const overdue    = allDates.filter(isOverdue).length
  const dueThisWeek  = allDates.filter(d => isDueSoon(d, in7Days)).length
  const dueThisMonth = allDates.filter(d => isDueSoon(d, in30Days)).length

  // Latest TGP prices
  const { data: tgpPrices } = await supabase
    .from('tgp_prices')
    .select('*')
    .order('date', { ascending: false })
    .limit(10)

  const latestDate = tgpPrices?.[0]?.date
  const todayPrices = tgpPrices?.filter(p => p.date === latestDate) || []

  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'there'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {name} 👋</h1>
        <p className="text-gray-500 mt-1">Here&apos;s your fleet overview for today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Vehicles</CardTitle>
            <Truck className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{vehicles?.length ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active in fleet</p>
          </CardContent>
        </Card>

        <Card className={overdue > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Overdue</CardTitle>
            <AlertTriangle className={`w-4 h-4 ${overdue > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overdue > 0 ? 'text-red-600' : ''}`}>{overdue}</div>
            <p className="text-xs text-gray-500 mt-1">Compliance items</p>
          </CardContent>
        </Card>

        <Card className={dueThisWeek > 0 ? 'border-amber-300 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Due This Week</CardTitle>
            <ClipboardCheck className={`w-4 h-4 ${dueThisWeek > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${dueThisWeek > 0 ? 'text-amber-600' : ''}`}>{dueThisWeek}</div>
            <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Due This Month</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueThisMonth}</div>
            <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* TGP Prices + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's TGP */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Fuel className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base">Today&apos;s Fuel Prices</CardTitle>
            {latestDate && <Badge variant="outline" className="ml-auto text-xs">{latestDate}</Badge>}
          </CardHeader>
          <CardContent>
            {todayPrices.length === 0 ? (
              <p className="text-sm text-gray-400">No TGP data yet. Upload prices from the Fuel Pricing tab.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2">Terminal</th>
                      <th className="text-right py-2">Shell</th>
                      <th className="text-right py-2">BP</th>
                      <th className="text-right py-2">Ampol</th>
                      <th className="text-right py-2">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayPrices.map(p => (
                      <tr key={p.terminal} className="border-b last:border-0">
                        <td className="py-2 font-medium">{p.terminal}</td>
                        <td className="text-right py-2">{p.shell_viva ? `${p.shell_viva}¢` : '—'}</td>
                        <td className="text-right py-2">{p.bp ? `${p.bp}¢` : '—'}</td>
                        <td className="text-right py-2">{p.ampol ? `${p.ampol}¢` : '—'}</td>
                        <td className="text-right py-2">
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                            {p.cheapest_provider || '—'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Compliance */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base">Upcoming Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {(vehicles || []).length === 0 ? (
              <p className="text-sm text-gray-400">No vehicles yet. Add your first vehicle to start tracking compliance.</p>
            ) : (
              <div className="space-y-3">
                {(vehicles || [])
                  .flatMap(v => [
                    { vehicle: v.nickname || v.registration_plate, type: 'Rego',      date: v.rego_expiry },
                    { vehicle: v.nickname || v.registration_plate, type: 'Insurance', date: v.insurance_expiry },
                    { vehicle: v.nickname || v.registration_plate, type: 'Service',   date: v.next_service_date },
                  ])
                  .filter(i => i.date && new Date(i.date) <= in30Days)
                  .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
                  .slice(0, 6)
                  .map((item, i) => {
                    const daysLeft = Math.ceil((new Date(item.date!).getTime() - today.getTime()) / 86400000)
                    const isOD = daysLeft < 0
                    const urgent = daysLeft <= 7
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.vehicle}</span>
                          <span className="text-gray-400 ml-2">{item.type}</span>
                        </div>
                        <Badge className={
                          isOD ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                          urgent ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                          'bg-blue-100 text-blue-700 hover:bg-blue-100'
                        }>
                          {isOD ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
