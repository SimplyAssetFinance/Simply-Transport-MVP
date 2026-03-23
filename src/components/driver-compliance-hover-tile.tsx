'use client'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Clock, Users, ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export interface DriverHoverItem {
  driverId:   string
  driverName: string
  itemType:   string
  expiryDate: string
}

interface Props {
  variant: 'overdue' | 'due_this_month' | 'ok' | 'active'
  items?:  DriverHoverItem[]
  count:   number
}

export function DriverComplianceHoverTile({ variant, items = [], count }: Props) {
  const [open, setOpen]       = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)
  const tileRef               = useRef<HTMLDivElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { setMounted(true) }, [])

  const hasHover = (variant === 'overdue' || variant === 'due_this_month') && items.length > 0

  function enter() {
    clearTimeout(timerRef.current)
    if (hasHover && tileRef.current) {
      const r = tileRef.current.getBoundingClientRect()
      setPopupPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width })
      setOpen(true)
    }
  }
  function leave()    { timerRef.current = setTimeout(() => setOpen(false), 200) }
  function stayOpen() { clearTimeout(timerRef.current) }

  const cfg = {
    overdue:        { label: 'Overdue',        numColor: '#f87171', icon: <AlertTriangle size={18} color="#f87171" />, ring: '#ef4444', popupLabel: 'Overdue Drivers',        popupColor: '#f87171' },
    due_this_month: { label: 'Due This Month', numColor: '#fbbf24', icon: <Clock size={18} color="#fbbf24" />,        ring: '#f59e0b', popupLabel: 'Expiring This Month',    popupColor: '#fbbf24' },
    ok:             { label: 'Compliant',       numColor: '#4ade80', icon: <ShieldCheck size={18} color="#4ade80" />,  ring: 'rgba(255,255,255,0.08)', popupLabel: '', popupColor: '' },
    active:         { label: 'Active Drivers',  numColor: '#fff',    icon: <Users size={18} color="#94a3b8" />,        ring: 'rgba(255,255,255,0.08)', popupLabel: '', popupColor: '' },
  }[variant]

  const tileRingColor = open && hasHover ? cfg.ring : 'rgba(255,255,255,0.08)'

  const subtitle = hasHover ? 'hover to see details' : ''

  const popup = open && hasHover && mounted ? createPortal(
    <div
      onMouseEnter={stayOpen}
      onMouseLeave={leave}
      style={{
        position: 'absolute',
        top: popupPos.top,
        left: popupPos.left,
        width: Math.max(popupPos.width, 240),
        zIndex: 99999,
        backgroundColor: '#1e293b',
        border: `1px solid ${cfg.ring}4d`,
        borderRadius: 12,
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        padding: 12,
        fontFamily: 'inherit',
      }}
    >
      <p style={{ color: cfg.popupColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {cfg.popupLabel}
      </p>
      {items.map((item, i) => (
        <a
          key={i}
          href={`/drivers/${item.driverId}`}
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
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{item.driverName}</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>{item.itemType}</p>
          </div>
          <span style={{ color: cfg.popupColor, fontSize: 12, fontWeight: 500, marginLeft: 12, flexShrink: 0 }}>
            {format(parseISO(item.expiryDate), 'd MMM yyyy')}
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
          cursor: hasHover ? 'default' : 'default',
          transition: 'box-shadow 0.15s',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, margin: 0 }}>{cfg.label}</p>
          {cfg.icon}
        </div>
        <p style={{ fontSize: 30, fontWeight: 700, color: cfg.numColor, margin: 0 }}>{count}</p>
        {subtitle && <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {popup}
    </>
  )
}
