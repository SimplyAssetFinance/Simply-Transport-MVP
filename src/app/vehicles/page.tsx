import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Truck } from 'lucide-react'

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  const today = new Date()

  function complianceStatus(date: string | null) {
    if (!date) return 'unknown'
    const d = new Date(date)
    const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000)
    if (daysLeft < 0)  return 'overdue'
    if (daysLeft <= 7) return 'urgent'
    if (daysLeft <= 30) return 'soon'
    return 'ok'
  }

  function statusBadge(status: string, label: string, date: string | null) {
    const colors = {
      overdue: 'bg-red-100 text-red-700 hover:bg-red-100',
      urgent:  'bg-amber-100 text-amber-700 hover:bg-amber-100',
      soon:    'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
      ok:      'bg-green-100 text-green-700 hover:bg-green-100',
      unknown: 'bg-gray-100 text-gray-500 hover:bg-gray-100',
    }
    if (!date) return null
    const daysLeft = Math.ceil((new Date(date).getTime() - today.getTime()) / 86400000)
    const text = status === 'overdue' ? `${label} overdue` : `${label} ${daysLeft}d`
    return <Badge key={label} className={`text-xs ${colors[status as keyof typeof colors]}`}>{text}</Badge>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-500 mt-1">{vehicles?.length ?? 0} vehicles in your fleet</p>
        </div>
        <Link href="/vehicles/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {(!vehicles || vehicles.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No vehicles yet</h3>
            <p className="text-gray-400 mb-6">Add your first vehicle to start tracking compliance</p>
            <Link href="/vehicles/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add first vehicle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map(v => {
            const regoStatus  = complianceStatus(v.rego_expiry)
            const insStatus   = complianceStatus(v.insurance_expiry)
            const svcStatus   = complianceStatus(v.next_service_date)
            const worst = [regoStatus, insStatus, svcStatus].includes('overdue') ? 'overdue'
              : [regoStatus, insStatus, svcStatus].includes('urgent') ? 'urgent'
              : [regoStatus, insStatus, svcStatus].includes('soon') ? 'soon' : 'ok'

            return (
              <Link key={v.id} href={`/vehicles/${v.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
                  worst === 'overdue' ? 'border-red-200' :
                  worst === 'urgent'  ? 'border-amber-200' : ''
                }`}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {v.nickname || v.registration_plate}
                        </div>
                        <div className="text-sm text-gray-400">
                          {v.registration_plate}
                          {v.make && ` · ${v.make} ${v.model || ''}`}
                          {v.year && ` ${v.year}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {statusBadge(regoStatus, 'Rego', v.rego_expiry)}
                      {statusBadge(insStatus, 'Ins', v.insurance_expiry)}
                      {statusBadge(svcStatus, 'Svc', v.next_service_date)}
                      {!v.rego_expiry && !v.insurance_expiry && !v.next_service_date && (
                        <span className="text-xs text-gray-400">No dates set</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
