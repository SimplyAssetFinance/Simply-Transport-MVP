'use client'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { ComplianceItem, AuditLog } from '@/lib/types'

interface Props {
  complianceItems: ComplianceItem[]
  auditLogs: AuditLog[]
}

function toCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsClient({ complianceItems, auditLogs }: Props) {
  function exportCompliance() {
    const rows = [
      ['Vehicle', 'Plate', 'Type', 'Due Date', 'Days Until Due', 'Status'],
      ...complianceItems.map(i => [
        i.vehicleName,
        i.plate,
        i.type,
        i.dueDate,
        String(i.daysUntil),
        i.status,
      ]),
    ]
    downloadCSV(`compliance-report-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows))
  }

  function exportAudit() {
    const rows = [
      ['Date', 'Action', 'Entity Type', 'Details'],
      ...auditLogs.map(l => [
        l.created_at,
        l.action,
        l.entity_type ?? '',
        l.details ? JSON.stringify(l.details) : '',
      ]),
    ]
    downloadCSV(`audit-log-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows))
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={exportCompliance}
        className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs">
        <Download size={13} /> Compliance CSV
      </Button>
      <Button size="sm" variant="outline" onClick={exportAudit}
        className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs">
        <Download size={13} /> Audit CSV
      </Button>
    </div>
  )
}
