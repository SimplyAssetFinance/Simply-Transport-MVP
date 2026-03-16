'use client'
import { useRef, useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ComplianceItem } from '@/lib/types'

interface Props {
  variant:    'overdue' | 'due-week'
  items:      ComplianceItem[]
  extraCount?: number
}

export function ComplianceHoverTile({ variant, items, extraCount }: Props) {
  const [open, setOpen] = useState(false)
  const timerRef        = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isOverdue = variant === 'overdue'
  const count     = items.length

  const accentText   = isOverdue ? 'text-red-400'           : 'text-amber-400'
  const accentBorder = isOverdue ? 'border-red-500/40'      : 'border-amber-500/40'
  const dropBorder   = isOverdue ? 'border-red-500/30'      : 'border-amber-500/30'
  const Icon         = isOverdue ? AlertTriangle             : ShieldCheck
  const iconColor    = isOverdue ? 'text-red-400'            : 'text-amber-400'

  function enter() {
    clearTimeout(timerRef.current)
    if (count > 0) setOpen(true)
  }

  function leave() {
    timerRef.current = setTimeout(() => setOpen(false), 120)
  }

  const subtitle = count > 0
    ? 'hover to see details'
    : isOverdue
    ? 'compliance items'
    : `${extraCount ?? 0} more this month`

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>

      {/* Tile — plain div instead of Card so overflow-hidden doesn't clip */}
      <div className={`rounded-xl bg-slate-900 ring-1 py-4 px-4 transition-colors cursor-default ${
        open && count > 0 ? `ring-current ${accentBorder}` : 'ring-foreground/10'
      }`}>
        <div className="flex flex-row items-center justify-between pb-2">
          <p className="text-slate-400 text-sm font-medium">
            {isOverdue ? 'Overdue' : 'Due This Week'}
          </p>
          <Icon size={18} className={iconColor} />
        </div>
        <p className={`text-3xl font-bold ${count > 0 ? accentText : 'text-white'}`}>{count}</p>
        <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
      </div>

      {/* Dropdown — zero gap so cursor stays within hover area */}
      {open && count > 0 && (
        <div
          className="absolute left-0 right-0 z-[9999] top-full"
          onMouseEnter={enter}
          onMouseLeave={leave}
        >
          {/* 4px invisible bridge so there's no gap between tile and dropdown */}
          <div className="h-1" />
          <div className={`bg-slate-800 border ${dropBorder} rounded-xl shadow-2xl p-3 space-y-1`}>
            <p className={`${accentText} text-xs font-semibold uppercase tracking-wide mb-2`}>
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
                <span className={`${accentText} text-xs font-medium shrink-0 ml-4`}>
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
