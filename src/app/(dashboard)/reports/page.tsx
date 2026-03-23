import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { getComplianceItems } from '@/lib/utils/compliance'
import { format, parseISO } from 'date-fns'
import { ReportsClient } from './reports-client'
import type { Vehicle, AuditLog } from '@/lib/types'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: vehicles }, { data: auditLogs }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('user_id', user!.id),
    supabase.from('audit_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const allVehicles = (vehicles as Vehicle[]) || []
  const allAuditLogs = (auditLogs as AuditLog[]) || []
  const items = getComplianceItems(allVehicles)

  const overdue   = items.filter(i => i.status === 'overdue')
  const dueWeek   = items.filter(i => i.status === 'due-week')
  const dueMonth  = items.filter(i => i.status === 'due-month')
  const allClear  = items.filter(i => i.status === 'ok')

  function actionLabel(action: string): string {
    const map: Record<string, string> = {
      vehicle_created:      'Vehicle added',
      vehicle_updated:      'Vehicle updated',
      vehicle_deleted:      'Vehicle deleted',
      km_logged:            'KM entry logged',
      checklist_submitted:  'Pre-start checklist submitted',
      document_uploaded:    'Document uploaded',
      maintenance_recorded: 'Maintenance recorded',
    }
    return map[action] || action.replace(/_/g, ' ')
  }

  function statusColor(status: string) {
    if (status === 'overdue')   return 'bg-red-500/20 text-red-400 border-red-500/30 border'
    if (status === 'due-week')  return 'bg-amber-500/20 text-amber-400 border-amber-500/30 border'
    if (status === 'due-month') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border'
    return 'bg-green-500/20 text-green-400 border-green-500/30 border'
  }

  function statusLabel(status: string) {
    if (status === 'overdue')   return 'Overdue'
    if (status === 'due-week')  return 'Due This Week'
    if (status === 'due-month') return 'Due This Month'
    return 'OK'
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 mt-1">Compliance overview and activity history</p>
        </div>
        <ReportsClient complianceItems={items} auditLogs={allAuditLogs} />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* Left — compliance summary + report */}
        <div className="space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl ring-1 ring-red-500/30 p-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-slate-400 text-sm">Overdue</p>
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <p className="text-3xl font-bold text-red-400">{overdue.length}</p>
            </div>
            <div className="bg-slate-900 rounded-xl ring-1 ring-amber-500/30 p-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-slate-400 text-sm">Due This Week</p>
                <Clock size={16} className="text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-400">{dueWeek.length}</p>
            </div>
            <div className="bg-slate-900 rounded-xl ring-1 ring-yellow-500/30 p-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-slate-400 text-sm">Due This Month</p>
                <Clock size={16} className="text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400">{dueMonth.length}</p>
            </div>
            <div className="bg-slate-900 rounded-xl ring-1 ring-green-500/30 p-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-slate-400 text-sm">All Clear</p>
                <CheckCircle2 size={16} className="text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400">{allClear.length}</p>
            </div>
          </div>

          {/* Full Compliance Report */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-400" />
                <CardTitle className="text-white">Compliance Report — All Vehicles</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No vehicles found. Add vehicles to see compliance data.</p>
              ) : (
                <div className="space-y-2">
                  {[...overdue, ...dueWeek, ...dueMonth, ...allClear].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{item.vehicleName}</p>
                        <p className="text-slate-400 text-xs capitalize">
                          {item.plate} · {item.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-slate-400 text-xs">{format(parseISO(item.dueDate), 'd MMM yyyy')}</p>
                        <Badge className={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — Activity Log */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              <CardTitle className="text-white">Activity Log</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {allAuditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {allAuditLogs.map(log => (
                  <div key={log.id} className="flex items-start justify-between p-3 bg-slate-800 rounded-lg gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{actionLabel(log.action)}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">
                          {Object.entries(log.details)
                            .filter(([k]) => !k.includes('id'))
                            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs shrink-0">
                      {format(parseISO(log.created_at), 'd MMM, h:mm a')}
                    </p>
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
