import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getComplianceItems } from '@/lib/utils/compliance'
import { ComplianceBadge } from '@/components/compliance-badge'
import { Truck, ShieldCheck, Wrench, DollarSign, FileWarning, Users } from 'lucide-react'
import { ComplianceHoverTile } from '@/components/compliance-hover-tile'
import { DriverComplianceHoverTile } from '@/components/driver-compliance-hover-tile'
import { FuelSpendTile } from '@/components/fuel-spend-tile'
import type { DriverHoverItem } from '@/components/driver-compliance-hover-tile'
import Link from 'next/link'
import { format, parseISO, addDays, differenceInDays } from 'date-fns'
import type { Vehicle, TGPPrice, Driver, DriverComplianceItem } from '@/lib/types'
import { driverComplianceStatus, itemComplianceStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const currentYear = today.getFullYear()
  const todayStr = today.toISOString().split('T')[0]
  const day30 = addDays(today, 30).toISOString().split('T')[0]
  const day60 = addDays(today, 60).toISOString().split('T')[0]
  const day90 = addDays(today, 90).toISOString().split('T')[0]

  const day28 = addDays(today, 28).toISOString().split('T')[0]

  const [
    { data: vehicles },
    { data: tgpToday },
    { data: scheduledMaint },
    { data: costCompleted },
    { data: costForecast },
    { data: dueDocs },
    { data: driversRaw },
    { data: driverItemsRaw },
  ] = await Promise.all([
    supabase.from('vehicles').select('*').eq('user_id', user!.id),
    supabase.from('tgp_prices').select('*').order('date', { ascending: false }).limit(5),
    supabase.from('maintenance_records')
      .select('id, description, date, type, vehicle_id, vehicles(nickname, registration_plate)')
      .eq('user_id', user!.id)
      .eq('status', 'scheduled')
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .limit(5),
    supabase.from('maintenance_records')
      .select('cost, date')
      .eq('user_id', user!.id)
      .eq('status', 'completed')
      .not('cost', 'is', null),
    supabase.from('maintenance_records')
      .select('cost, date')
      .eq('user_id', user!.id)
      .eq('status', 'scheduled')
      .gte('date', todayStr)
      .lte('date', day90)
      .not('cost', 'is', null),
    supabase.from('business_documents')
      .select('id, name, category, due_date, reminder_note')
      .eq('user_id', user!.id)
      .not('due_date', 'is', null)
      .lte('due_date', day28)
      .order('due_date', { ascending: true }),
    supabase.from('drivers').select('*').eq('user_id', user!.id),
    supabase.from('driver_compliance_items').select('*').eq('user_id', user!.id),
  ])

  // Operating cost calculations
  const completed = (costCompleted as { cost: number; date: string }[]) || []
  const forecast  = (costForecast  as { cost: number; date: string }[]) || []

  const ytdCost      = completed.filter(r => new Date(r.date).getFullYear() === currentYear).reduce((s, r) => s + r.cost, 0)
  const lifetimeCost = completed.reduce((s, r) => s + r.cost, 0)
  const next30Cost   = forecast.filter(r => r.date <= day30).reduce((s, r) => s + r.cost, 0)
  const next60Cost   = forecast.filter(r => r.date <= day60).reduce((s, r) => s + r.cost, 0)
  const next90Cost   = forecast.filter(r => r.date <= day90).reduce((s, r) => s + r.cost, 0)

  const fmt = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`

  const items = getComplianceItems((vehicles as Vehicle[]) || [])
  const overdue    = items.filter(i => i.status === 'overdue')
  const dueWeek    = items.filter(i => i.status === 'due-week')
  const dueMonth   = items.filter(i => i.status === 'due-month')
  const urgentItems = items.filter(i => i.status !== 'ok').slice(0, 5)

  const latestPrices = tgpToday as TGPPrice[] || []

  // Driver compliance summary
  const allDrivers      = (driversRaw      as Driver[])               || []
  const allDriverItems  = (driverItemsRaw  as DriverComplianceItem[]) || []
  const activeDrivers   = allDrivers.filter(d => d.status === 'active')
  const driverOverdue   = activeDrivers.filter(d => driverComplianceStatus(allDriverItems.filter(i => i.driver_id === d.id)) === 'overdue').length
  const driverDueMonth  = activeDrivers.filter(d => driverComplianceStatus(allDriverItems.filter(i => i.driver_id === d.id)) === 'due_this_month').length
  const driverOk        = activeDrivers.filter(d => driverComplianceStatus(allDriverItems.filter(i => i.driver_id === d.id)) === 'ok').length

  // Driver compliance hover data
  const overdueDriverItems:  DriverHoverItem[] = []
  const dueMonthDriverItems: DriverHoverItem[] = []
  for (const driver of activeDrivers) {
    for (const item of allDriverItems.filter(i => i.driver_id === driver.id)) {
      if (!item.expiry_date) continue
      const s = itemComplianceStatus(item.expiry_date)
      const name = `${driver.first_name} ${driver.last_name}`
      if (s === 'overdue')  overdueDriverItems.push({ driverId: driver.id, driverName: name, itemType: item.item_type, expiryDate: item.expiry_date })
      if (s === 'due_soon') dueMonthDriverItems.push({ driverId: driver.id, driverName: name, itemType: item.item_type, expiryDate: item.expiry_date })
    }
  }

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {name} 👋</h1>
        <p className="text-slate-400 mt-1">Here is your fleet summary</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <ComplianceHoverTile variant="overdue"   items={overdue}  />
        <ComplianceHoverTile variant="due-week" items={dueWeek} extraCount={dueMonth.length} />
      </div>

      {/* Driver Compliance Widget */}
      {activeDrivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <span className="text-white font-semibold">Driver Compliance</span>
            </div>
            <Link href="/drivers" className="text-blue-400 text-sm hover:underline">View all drivers</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <DriverComplianceHoverTile variant="active"         count={activeDrivers.length} />
            <DriverComplianceHoverTile variant="ok"             count={driverOk} />
            <DriverComplianceHoverTile variant="due_this_month" count={driverDueMonth} items={dueMonthDriverItems} />
            <DriverComplianceHoverTile variant="overdue"        count={driverOverdue}  items={overdueDriverItems} />
          </div>
        </div>
      )}

      {/* Upcoming Maintenance */}
      {scheduledMaint && scheduledMaint.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-amber-400" />
              <CardTitle className="text-white">Upcoming Maintenance</CardTitle>
            </div>
            <Link href="/vehicles" className="text-blue-400 text-sm hover:underline">View vehicles</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(scheduledMaint as any[]).map((r) => {
              const v = r.vehicles as { nickname?: string; registration_plate: string } | null
              const vName = v?.nickname || v?.registration_plate || 'Unknown'
              return (
                <div key={r.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{r.description}</p>
                    <p className="text-slate-400 text-xs">{vName} · {r.type}</p>
                  </div>
                  <span className="text-amber-400 text-sm font-medium shrink-0 ml-4">
                    {format(parseISO(r.date), 'd MMM yyyy')}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Document Alerts */}
      {dueDocs && dueDocs.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning size={18} className="text-amber-400" />
              <CardTitle className="text-white">Document Reminders</CardTitle>
            </div>
            <Link href="/documents" className="text-blue-400 text-sm hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(dueDocs as { id: string; name: string; category: string; due_date: string; reminder_note: string | null }[]).map((doc) => {
              const days = differenceInDays(parseISO(doc.due_date), today)
              const isOverdue = days < 0
              const isUrgent = days <= 7
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{doc.name}</p>
                    <p className="text-slate-400 text-xs">
                      {doc.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      {doc.reminder_note ? ` · ${doc.reminder_note}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-medium shrink-0 ml-4 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-amber-400'}`}>
                    {isOverdue ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `${days}d`}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Fuel Spend */}
      <FuelSpendTile />

      {/* Operating Costs */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-green-400" />
            <CardTitle className="text-white">Operating Costs</CardTitle>
          </div>
          <Link href="/vehicles" className="text-blue-400 text-sm hover:underline">View vehicles</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Actuals */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actuals</p>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Year to Date ({currentYear})</span>
                <span className="text-white font-bold">{fmt(ytdCost)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Lifetime Total</span>
                <span className="text-white font-bold">{fmt(lifetimeCost)}</span>
              </div>
            </div>
            {/* Forecast */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forecast (Scheduled)</p>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Next 30 days</span>
                <span className={`font-bold ${next30Cost > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{fmt(next30Cost)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Next 60 days</span>
                <span className={`font-bold ${next60Cost > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{fmt(next60Cost)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Next 90 days</span>
                <span className={`font-bold ${next90Cost > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{fmt(next90Cost)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      <p className="text-white text-sm font-medium">{row.terminal.replace(/\s*\(.*\)/, '')}</p>
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
