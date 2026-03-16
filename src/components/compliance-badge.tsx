import { Badge } from '@/components/ui/badge'
import type { ComplianceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const config: Record<ComplianceStatus, { label: string; className: string }> = {
  overdue:    { label: 'Overdue',    className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'due-week': { label: 'Due Soon',   className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'due-month':{ label: 'Due Month',  className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ok:         { label: 'OK',         className: 'bg-green-500/20 text-green-400 border-green-500/30' },
}

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const { label, className } = config[status]
  return <Badge variant="outline" className={cn('text-xs font-medium', className)}>{label}</Badge>
}
