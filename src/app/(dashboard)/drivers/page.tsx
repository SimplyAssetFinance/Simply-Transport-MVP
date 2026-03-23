import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Driver, DriverComplianceItem } from '@/lib/types'
import { driverComplianceStatus } from '@/lib/types'

function DriverStatusBadge({ status }: { status: 'ok' | 'due_this_month' | 'overdue' }) {
  if (status === 'overdue')
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">🔴 Overdue</span>
  if (status === 'due_this_month')
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">🟡 Due This Month</span>
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20">🟢 OK</span>
}

export default async function DriversPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: drivers }, { data: complianceItems }] = await Promise.all([
    supabase.from('drivers').select('*').eq('user_id', user!.id).order('last_name', { ascending: true }),
    supabase.from('driver_compliance_items').select('*').eq('user_id', user!.id),
  ])

  const list = (drivers as Driver[]) || []
  const items = (complianceItems as DriverComplianceItem[]) || []

  const active   = list.filter(d => d.status === 'active')
  const inactive = list.filter(d => d.status === 'inactive')

  function getStatus(driver: Driver) {
    const driverItems = items.filter(i => i.driver_id === driver.id)
    return driverComplianceStatus(driverItems)
  }

  function renderList(drivers: Driver[]) {
    return (
      <div className="grid gap-3">
        {drivers.map(d => {
          const status = getStatus(d)
          const driverItems = items.filter(i => i.driver_id === d.id)
          const license = driverItems.find(i => i.item_type === "Driver's License")
          return (
            <Link key={d.id} href={`/drivers/${d.id}`}>
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {d.first_name[0]}{d.last_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{d.first_name} {d.last_name}</p>
                          {d.employee_id && (
                            <span className="text-xs text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">{d.employee_id}</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-0.5">{d.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {license?.expiry_date && (
                        <div className="text-right hidden sm:block">
                          <p className="text-slate-500 text-xs">License expiry</p>
                          <p className="text-slate-300 text-sm">{format(parseISO(license.expiry_date), 'd MMM yyyy')}</p>
                        </div>
                      )}
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500 text-xs">{driverItems.length} item{driverItems.length !== 1 ? 's' : ''}</p>
                      </div>
                      <DriverStatusBadge status={status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    )
  }

  const overdue      = active.filter(d => getStatus(d) === 'overdue').length
  const dueThisMonth = active.filter(d => getStatus(d) === 'due_this_month').length
  const ok           = active.filter(d => getStatus(d) === 'ok').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-slate-400 mt-1">{active.length} active driver{active.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/drivers/new">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus size={16} /> Add Driver
          </Button>
        </Link>
      </div>

      {/* Summary */}
      {active.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Overdue',        count: overdue,      color: 'text-red-400' },
            { label: 'Due This Month', count: dueThisMonth, color: 'text-yellow-400' },
            { label: 'Compliant',      count: ok,           color: 'text-green-400' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{count}</p>
                <p className="text-slate-400 text-xs mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <Users size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium text-lg mb-2">No drivers yet</p>
            <p className="text-slate-400 text-sm mb-6">Add your first driver to start tracking compliance</p>
            <Link href="/drivers/new">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus size={16} />Add Driver</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && renderList(active)}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Inactive</p>
              {renderList(inactive)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
