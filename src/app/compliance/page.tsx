import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck } from 'lucide-react'

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, nickname, registration_plate, rego_expiry, rego_state, insurance_expiry, insurance_provider, next_service_date')
    .eq('is_active', true)

  const today = new Date()

  type ComplianceItem = {
    vehicle: string
    plate: string
    type: string
    date: string
    daysLeft: number
    detail?: string
  }

  const items: ComplianceItem[] = (vehicles || []).flatMap(v => {
    const rows = []
    if (v.rego_expiry) rows.push({
      vehicle: v.nickname || v.registration_plate,
      plate: v.registration_plate,
      type: 'Registration',
      date: v.rego_expiry,
      daysLeft: Math.ceil((new Date(v.rego_expiry).getTime() - today.getTime()) / 86400000),
      detail: v.rego_state,
    })
    if (v.insurance_expiry) rows.push({
      vehicle: v.nickname || v.registration_plate,
      plate: v.registration_plate,
      type: 'Insurance',
      date: v.insurance_expiry,
      daysLeft: Math.ceil((new Date(v.insurance_expiry).getTime() - today.getTime()) / 86400000),
      detail: v.insurance_provider,
    })
    if (v.next_service_date) rows.push({
      vehicle: v.nickname || v.registration_plate,
      plate: v.registration_plate,
      type: 'Service',
      date: v.next_service_date,
      daysLeft: Math.ceil((new Date(v.next_service_date).getTime() - today.getTime()) / 86400000),
    })
    return rows
  }).sort((a, b) => a.daysLeft - b.daysLeft)

  const overdue = items.filter(i => i.daysLeft < 0)
  const upcoming = items.filter(i => i.daysLeft >= 0)

  function statusBadge(daysLeft: number) {
    if (daysLeft < 0)  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{Math.abs(daysLeft)}d overdue</Badge>
    if (daysLeft <= 7) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{daysLeft}d</Badge>
    if (daysLeft <= 30) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{daysLeft}d</Badge>
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{daysLeft}d</Badge>
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const TableRows = ({ rows }: { rows: ComplianceItem[] }) => (
    <>
      {rows.map((item, i) => (
        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
          <td className="py-3 px-4 font-medium">{item.vehicle}</td>
          <td className="py-3 px-4 text-gray-500 text-sm">{item.plate}</td>
          <td className="py-3 px-4">
            <Badge variant="outline" className="text-xs">{item.type}</Badge>
          </td>
          <td className="py-3 px-4 text-sm">{formatDate(item.date)}</td>
          <td className="py-3 px-4 text-sm text-gray-400">{item.detail || '—'}</td>
          <td className="py-3 px-4">{statusBadge(item.daysLeft)}</td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <ClipboardCheck className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-500 mt-0.5">Track rego, insurance and service dates across your fleet</p>
        </div>
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-300 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">⚠️ Overdue ({overdue.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-red-50 border-y border-red-200">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Vehicle</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Plate</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Due Date</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Detail</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody><TableRows rows={overdue} /></tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Compliance Items ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-8 text-center">
              No compliance items found. Add vehicles with compliance dates to start tracking.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Vehicle</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Plate</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Due Date</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Detail</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody><TableRows rows={upcoming} /></tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
