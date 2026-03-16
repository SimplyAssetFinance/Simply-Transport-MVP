import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getComplianceItems } from '@/lib/utils/compliance'
import { ComplianceBadge } from '@/components/compliance-badge'
import { ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Vehicle } from '@/lib/types'

const TYPE_LABELS = { rego: 'Registration', insurance: 'Insurance', service: 'Service' }

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: vehicles } = await supabase.from('vehicles').select('*').eq('user_id', user!.id)

  const items = getComplianceItems((vehicles as Vehicle[]) || [])
  const overdue   = items.filter(i => i.status === 'overdue')
  const dueWeek   = items.filter(i => i.status === 'due-week')
  const dueMonth  = items.filter(i => i.status === 'due-month')
  const allClear  = items.filter(i => i.status === 'ok')

  const sections = [
    { title: 'Overdue',       items: overdue,  color: 'text-red-400' },
    { title: 'Due This Week', items: dueWeek,  color: 'text-amber-400' },
    { title: 'Due This Month',items: dueMonth, color: 'text-yellow-400' },
    { title: 'All Clear',     items: allClear, color: 'text-green-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance</h1>
        <p className="text-slate-400 mt-1">
          {overdue.length > 0
            ? `${overdue.length} overdue item${overdue.length !== 1 ? 's' : ''} need attention`
            : 'All compliance tracking in one place'}
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Overdue',        count: overdue.length,  color: 'text-red-400' },
          { label: 'Due This Week',  count: dueWeek.length,  color: 'text-amber-400' },
          { label: 'Due This Month', count: dueMonth.length, color: 'text-yellow-400' },
          { label: 'All Clear',      count: allClear.length, color: 'text-green-400' },
        ].map(({ label, count, color }) => (
          <Card key={label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{count}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {sections.filter(s => s.items.length > 0).map(({ title, items: sItems, color }) => (
        <Card key={title} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className={`text-base ${color}`}>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
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
                    {item.daysUntil < 0
                      ? `${Math.abs(item.daysUntil)} days overdue`
                      : item.daysUntil === 0 ? 'Today'
                      : `${item.daysUntil} days`}
                  </span>
                  <ComplianceBadge status={item.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <ShieldCheck size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium">No compliance data yet</p>
            <p className="text-slate-400 text-sm mt-1">Add vehicles with compliance dates to track them here</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
