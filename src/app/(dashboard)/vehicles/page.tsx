import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComplianceBadge } from '@/components/compliance-badge'
import { getComplianceItems, getComplianceStatus } from '@/lib/utils/compliance'
import { differenceInDays, parseISO } from 'date-fns'
import Link from 'next/link'
import { Plus, Truck } from 'lucide-react'
import type { Vehicle } from '@/lib/types'

const VEHICLE_ICONS: Record<string, string> = {
  truck: '🚛', trailer: '🚚', ute: '🛻', van: '🚐', other: '🚗'
}

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const list = (vehicles as Vehicle[]) || []

  function worstStatus(v: Vehicle) {
    const today = new Date(); today.setHours(0,0,0,0)
    const dates = [v.rego_expiry, v.insurance_expiry, v.next_service_date].filter(Boolean) as string[]
    if (dates.length === 0) return 'ok' as const
    const statuses = dates.map(d => getComplianceStatus(differenceInDays(parseISO(d), today)))
    if (statuses.includes('overdue'))    return 'overdue' as const
    if (statuses.includes('due-week'))   return 'due-week' as const
    if (statuses.includes('due-month'))  return 'due-month' as const
    return 'ok' as const
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehicles</h1>
          <p className="text-slate-400 mt-1">{list.length} vehicle{list.length !== 1 ? 's' : ''} in your fleet</p>
        </div>
        <Link href="/vehicles/new">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus size={16} /> Add Vehicle
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <Truck size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium text-lg mb-2">No vehicles yet</p>
            <p className="text-slate-400 text-sm mb-6">Add your first vehicle to start tracking compliance</p>
            <Link href="/vehicles/new">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus size={16} />Add Vehicle</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map(v => {
            const status = worstStatus(v)
            const icon = VEHICLE_ICONS[v.vehicle_type ?? 'other'] ?? '🚗'
            return (
              <Link key={v.id} href={`/vehicles/${v.id}`}>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold">{v.nickname || v.registration_plate}</p>
                            <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                              {v.rego_state} {v.registration_plate}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm mt-0.5">
                            {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                          </p>
                        </div>
                      </div>
                      <ComplianceBadge status={status} />
                    </div>

                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      {v.rego_expiry && (
                        <span>Rego: <span className="text-slate-300">{v.rego_expiry}</span></span>
                      )}
                      {v.insurance_expiry && (
                        <span>Insurance: <span className="text-slate-300">{v.insurance_expiry}</span></span>
                      )}
                      {v.next_service_date && (
                        <span>Service: <span className="text-slate-300">{v.next_service_date}</span></span>
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
