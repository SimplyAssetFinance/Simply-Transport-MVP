'use client'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ComplianceItem } from '@/lib/types'

interface Props {
  variant:     'overdue' | 'due-week'
  items:       ComplianceItem[]
  extraCount?: number
}

export function ComplianceHoverTile({ variant, items, extraCount }: Props) {
  const [open, setOpen]       = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)
  const tileRef               = useRef<HTMLDivElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Ensure we're mounted before using createPortal
  useEffect(() => { setMounted(true) }, [])

  const isOverdue = variant === 'overdue'
  const count     = items.length

  function enter() {
    clearTimeout(timerRef.current)
    if (count > 0 && tileRef.current) {
      const r = tileRef.current.getBoundingClientRect()
      setPopupPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width })
      setOpen(true)
    }
  }
  function leave() {
    timerRef.current = setTimeout(() => setOpen(false), 200)
  }
  function stayOpen() {
    clearTimeout(timerRef.current)
  }

  const subtitle = count > 0
    ? 'hover to see details'
    : isOverdue
    ? 'compliance items'
    : `${extraCount ?? 0} more this month`

  const tileRingColor = open && count > 0
    ? (isOverdue ? '#ef4444' : '#f59e0b')
    : 'rgba(255,255,255,0.1)'

  const popup = open && count > 0 && mounted ? createPortal(
    <div
      onMouseEnter={stayOpen}
      onMouseLeave={leave}
      style={{
        position: 'absolute',
        top: popupPos.top,
        left: popupPos.left,
        width: popupPos.width,
        zIndex: 99999,
        backgroundColor: '#1e293b',
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
        borderRadius: 12,
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        padding: 12,
        fontFamily: 'inherit',
      }}
    >
      <p style={{
        color: isOverdue ? '#f87171' : '#fbbf24',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
      }}>
        {isOverdue ? 'Overdue Items' : 'Due This Week'}
      </p>
      {items.map((item, i) => (
        <a
          key={i}
          href={`/vehicles/${item.vehicleId}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 6,
            paddingBottom: 6,
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            textDecoration: 'none',
            cursor: 'pointer',
            borderRadius: 6,
            margin: '0 -4px',
            padding: '6px 4px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          <div>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{item.vehicleName}</p>
            <p style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize', margin: 0 }}>{item.type}</p>
          </div>
          <span style={{ color: isOverdue ? '#f87171' : '#fbbf24', fontSize: 12, fontWeight: 500, marginLeft: 12, flexShrink: 0 }}>
            {format(parseISO(item.dueDate), 'd MMM yyyy')}
          </span>
        </a>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <>
      <div
        ref={tileRef}
        onMouseEnter={enter}
        onMouseLeave={leave}
        style={{
          borderRadius: 12,
          backgroundColor: '#0f172a',
          boxShadow: `0 0 0 1px ${tileRingColor}`,
          padding: '16px',
          cursor: 'default',
          transition: 'box-shadow 0.15s',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, margin: 0 }}>
            {isOverdue ? 'Overdue' : 'Due This Week'}
          </p>
          {isOverdue
            ? <AlertTriangle size={18} color="#f87171" />
            : <ShieldCheck   size={18} color={count > 0 ? '#fbbf24' : '#94a3b8'} />
          }
        </div>
        <p style={{ fontSize: 30, fontWeight: 700, color: count > 0 ? (isOverdue ? '#f87171' : '#fbbf24') : '#fff', margin: 0 }}>
          {count}
        </p>
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>{subtitle}</p>
      </div>
      {popup}
    </>
  )
}
