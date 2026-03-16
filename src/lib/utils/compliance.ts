import { differenceInDays, parseISO } from 'date-fns'
import type { Vehicle, ComplianceItem, ComplianceStatus } from '@/lib/types'

export function getComplianceStatus(daysUntil: number): ComplianceStatus {
  if (daysUntil < 0)  return 'overdue'
  if (daysUntil <= 7)  return 'due-week'
  if (daysUntil <= 30) return 'due-month'
  return 'ok'
}

export function getComplianceItems(vehicles: Vehicle[]): ComplianceItem[] {
  const items: ComplianceItem[] = []
  const today = new Date()
  today.setHours(0,0,0,0)

  for (const v of vehicles) {
    const name = v.nickname || v.registration_plate

    const checks: { type: ComplianceItem['type']; date: string | null }[] = [
      { type: 'rego',      date: v.rego_expiry },
      { type: 'insurance', date: v.insurance_expiry },
      { type: 'service',   date: v.next_service_date },
    ]

    for (const c of checks) {
      if (!c.date) continue
      const due = parseISO(c.date)
      const daysUntil = differenceInDays(due, today)
      items.push({
        vehicleId:   v.id,
        vehicleName: name,
        plate:       v.registration_plate,
        type:        c.type,
        dueDate:     c.date,
        daysUntil,
        status:      getComplianceStatus(daysUntil),
      })
    }
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil)
}
