'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ComplianceItem } from '@/lib/types'

interface Props {
  variant: 'overdue' | 'due-week'
  items: ComplianceItem[]
  extraCount?: number  // "X more this month" shown in due-week subtitle
}

export function ComplianceHoverTile({ variant, items, extraCount }: Props) {
  const [open, setOpen] = useState(false)

  const isOverdue = variant === 'overdue'
  const count     = items.length
  const color     = isOverdue ? 'red' : 'amber'

  const borderHover = isOverdue ? 'border-red-500/40'   : 'border-amber-500/40'
  const textColor   = isOverdue ? 'text-red-400'         : 'text-amber-400'
  const badgeBorder = isOverdue ? 'border-red-500/30'    : 'border-amber-500/30'
  const labelColor  = isOverdue ? 'text-red-400'         : 'text-amber-400'
  const Icon        = isOverdue ? AlertTriangle           : ShieldCheck

  const subtitle = count > 0
    ? 'hover to see details'
    : isOverdue
      ? 'compliance items'
      : `${extraCount ?? 0} more this month`

  return (
    <div
      className="relative"
      onMouseEnter={() => count > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Card className={`bg-slate-900 border-slate-800 transition-colors cursor-default ${count > 0 && open ? borderHover : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-slate-400 text-sm font-medium">
            {isOverdue ? 'Overdue' : 'Due This Week'}
          </CardTitle>
          <Icon size={18} className={textColor} />
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${count > 0 ? textColor : 'text-white'}`}>{count}</p>
          <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
        </CardContent>
      </Card>

      {open && count > 0 && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-2 min-w-[220px]">
          <div className={`bg-slate-800 border ${badgeBorder} rounded-xl shadow-2xl p-3 space-y-1`}>
            <p className={`${labelColor} text-xs font-semibold uppercase tracking-wide mb-2`}>
              {isOverdue ? 'Overdue Items' : 'Due This Week'}
            </p>
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0"
              >
                <div>
                  <p className="text-white text-sm font-medium">{item.vehicleName}</p>
                  <p className="text-slate-400 text-xs capitalize">{item.type}</p>
                </div>
                <span className={`${textColor} text-xs font-medium shrink-0 ml-4`}>
                  {format(parseISO(item.dueDate), 'd MMM yyyy')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
