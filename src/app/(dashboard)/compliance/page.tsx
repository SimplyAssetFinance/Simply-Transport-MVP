import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getComplianceItems } from '@/lib/utils/compliance'
import { ComplianceBadge } from '@/components/compliance-badge'
import { ShieldCheck, Users } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import type { Vehicle, Driver, DriverComplianceItem } from '@/lib/types'
import Link from 'next/link'

const TYPE_LABELS = { rego: 'Registration', insurance: 'Insurance', service: 'Service' }

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: vehicles }, { data: driversRaw }, { data: driverItemsRaw }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('user_id', user!.id),
    supabase.from('drivers').select('*').eq('user_id', user!.id).eq('status', 'active'),
    supabase.from('driver_compliance_items').select('*').eq('user_id', user!.id),
  ])

  // Vehicle compliance
  const items    = getComplianceItems((vehicles as Vehicle[]) || [])
  const overdue  = items.filter(i => i.status === 'overdue')
  const dueWeek  = items.filter(i => i.status === 'due-week')
  const dueMonth = items.filter(i => i.status === 'due-month')
  const allClear = items.filter(i => i.status === 'ok')

  const vSections = [
    { title: 'Overdue',        items: overdue,  color: 'text-red-400' },
    { title: 'Due This Week',  items: dueWeek,  color: 'text-amber-400' },
    { title: 'Due This Month', items: dueMonth, color: 'text-yellow-400' },
    { title: 'All Clear',      items: allClear, color: 'text-green-400' },
  ]

  // Driver compliance — compute per-item status
  const today = new Date(); today.setHours(0,0,0,0)
  const allDrivers      = (driversRaw     as Driver[])               || []
  const allDriverItems  = (driverItemsRaw as DriverComplianceItem[]) || []

  type DriverItemRow = { driverName: string; driverId: string; item_type: string; expiry_date: string; daysUntil: number; status: 'overdue' | 'due_soon' | 'ok' }
  const driverRows: DriverItemRow[] = []
  for (const item of allDriverItems) {
    if (!item.expiry_date) continue
    const driver = allDrivers.find(d => d.id === item.driver_id)
    if (!driver) continue
    const days = differenceInDays(parseISO(item.expiry_date), today)
    const status: DriverItemRow['status'] = days < 0 ? 'overdue' : days <= 30 ? 'due_soon' : 'ok'
    driverRows.push({ driverName: `${driver.first_name} ${driver.last_name}`, driverId: driver.id, item_type: item.item_type, expiry_date: item.expiry_date, daysUntil: days, status })
  }
  const dOverdue  = driverRows.filter(r => r.status === 'overdue')
  const dDueSoon  = driverRows.filter(r => r.status === 'due_soon')
  const dOkCount  = allDrivers.filter(d => !driverRows.some(r => r.driverId === d.id && r.status !== 'ok')).length

  const dSections = [
    { title: 'Overdue',        rows: dOverdue, color: 'text-red-400',    badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    { title: 'Due This Month', rows: dDueSoon, color: 'text-yellow-400', badgeClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  ]

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance</h1>
        <p className="text-slate-400 mt-1">
          {overdue.length > 0
            ? `${overdue.length} overdue item${overdue.length !== 1 ? 's' : ''} need attention`
            : 'All compliance tracking in one place'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 items-start">

        {/* Left — Vehicle Compliance */}
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Vehicle Compliance</h2>

          {/* Vehicle summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Overdue',        count: overdue.length,  color: 'text-red-400' },
              { label: 'Due This Week',  count: dueWeek.length,  color: 'text-amber-400' },
              { label: 'Due This Month', count: dueMonth.length, color: 'text-yellow-400' },
              { label: 'All Clear',      count: allClear.length, color: 'text-green-400' },
            ].map(({ label, count, color }) => (
              <Card key={label} className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-slate-400 text-xs mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {vSections.filter(s => s.items.length > 0).map(({ title, items: sItems, color }) => (
            <Card key={title} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm ${color}`}>{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sItems.map((item, i) => (
                  <Link key={i} href={`/vehicles/${item.vehicleId}`}>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-white font-medium text-sm">{item.vehicleName}</p>
                          <p className="text-slate-400 text-xs">{item.plate}</p>
                        </div>
                        <div>
                          <p className="text-slate-300 text-sm">{TYPE_LABELS[item.type]}</p>
                          <p className="text-slate-500 text-xs">{format(parseISO(item.dueDate), 'd MMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">
                          {item.daysUntil < 0 ? `${Math.abs(item.daysUntil)}d overdue` : item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d`}
                        </span>
                        <ComplianceBadge status={item.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <ShieldCheck size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">No compliance data yet</p>
                <p className="text-slate-400 text-sm mt-1">Add vehicles with compliance dates to track them here</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — Driver Compliance */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Driver Compliance</h2>
            <Link href="/drivers" className="text-blue-400 text-xs hover:underline">View drivers</Link>
          </div>

          {/* Driver summary row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Overdue',        count: dOverdue.length, color: 'text-red-400' },
              { label: 'Due This Month', count: dDueSoon.length, color: 'text-yellow-400' },
              { label: 'Compliant',      count: dOkCount,        color: 'text-green-400' },
            ].map(({ label, count, color }) => (
              <Card key={label} className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-slate-400 text-xs mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {dSections.filter(s => s.rows.length > 0).map(({ title, rows, color, badgeClass }) => (
            <Card key={title} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm ${color}`}>{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((row, i) => (
                  <Link key={i} href={`/drivers/${row.driverId}`}>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                      <div>
                        <p className="text-white font-medium text-sm">{row.driverName}</p>
                        <p className="text-slate-400 text-xs">{row.item_type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">
                          {row.daysUntil < 0 ? `${Math.abs(row.daysUntil)}d overdue` : row.daysUntil === 0 ? 'Today' : `${row.daysUntil}d`}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {format(parseISO(row.expiry_date), 'd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}

          {allDrivers.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <Users size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">No active drivers</p>
                <p className="text-slate-400 text-sm mt-1">Add drivers to track their compliance here</p>
              </CardContent>
            </Card>
          )}

          {allDrivers.length > 0 && dOverdue.length === 0 && dDueSoon.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-12 text-center">
                <ShieldCheck size={40} className="text-green-500 mx-auto mb-3" />
                <p className="text-white font-medium">All drivers compliant</p>
                <p className="text-slate-400 text-sm mt-1">No overdue or expiring items this month</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}
