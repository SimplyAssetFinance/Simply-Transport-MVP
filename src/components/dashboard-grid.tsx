'use client'
import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { SortableTile, type TileSize } from './sortable-tile'

export type TileId =
  | 'summary'
  | 'driverCompliance'
  | 'maintenance'
  | 'documentAlerts'
  | 'fuelSpend'
  | 'otherCharges'
  | 'operatingCosts'
  | 'complianceAlerts'
  | 'fuelPrices'

const DEFAULT_ORDER: TileId[] = [
  'summary',
  'driverCompliance',
  'maintenance',
  'documentAlerts',
  'fuelSpend',
  'otherCharges',
  'operatingCosts',
  'complianceAlerts',
  'fuelPrices',
]

const DEFAULT_SIZES: Record<TileId, TileSize> = {
  summary:          'full',
  driverCompliance: 'full',
  maintenance:      'full',
  documentAlerts:   'full',
  fuelSpend:        'full',
  otherCharges:     'full',
  operatingCosts:   'full',
  complianceAlerts: 'half',
  fuelPrices:       'half',
}

const TILE_LABELS: Record<TileId, string> = {
  summary:          'Fleet Summary',
  driverCompliance: 'Driver Compliance',
  maintenance:      'Upcoming Maintenance',
  documentAlerts:   'Document Alerts',
  fuelSpend:        'Fuel Spend',
  otherCharges:     'Other Card Charges',
  operatingCosts:   'Operating Costs',
  complianceAlerts: 'Compliance Alerts',
  fuelPrices:       "Today's Fuel Prices",
}

const ORDER_KEY = 'dashboard-tile-order'
const SIZES_KEY = 'dashboard-tile-sizes'

export interface DashboardGridProps {
  summary:           React.ReactNode
  driverCompliance?: React.ReactNode
  maintenance?:      React.ReactNode
  documentAlerts?:   React.ReactNode
  fuelSpend:         React.ReactNode
  otherCharges:      React.ReactNode
  operatingCosts:    React.ReactNode
  complianceAlerts:  React.ReactNode
  fuelPrices:        React.ReactNode
}

export function DashboardGrid(props: DashboardGridProps) {
  // Always initialise with defaults — avoid hydration mismatch
  // (localStorage is only read after mount in useEffect)
  const [order,    setOrder]    = useState<TileId[]>(DEFAULT_ORDER)
  const [sizes,    setSizes]    = useState<Record<TileId, TileSize>>(DEFAULT_SIZES)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as string[]
        setOrder([
          ...saved.filter((id): id is TileId => DEFAULT_ORDER.includes(id as TileId)),
          ...DEFAULT_ORDER.filter(id => !saved.includes(id)),
        ])
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem(SIZES_KEY)
      if (raw) setSizes(prev => ({ ...prev, ...JSON.parse(raw) }))
    } catch { /* ignore */ }
  }, [])

  const tileContent: Record<TileId, React.ReactNode> = {
    summary:          props.summary,
    driverCompliance: props.driverCompliance ?? null,
    maintenance:      props.maintenance      ?? null,
    documentAlerts:   props.documentAlerts   ?? null,
    fuelSpend:        props.fuelSpend,
    otherCharges:     props.otherCharges,
    operatingCosts:   props.operatingCosts,
    complianceAlerts: props.complianceAlerts,
    fuelPrices:       props.fuelPrices,
  }

  // Only sortable items that have real content
  const visible = order.filter(id => Boolean(tileContent[id]))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(active.id as TileId), prev.indexOf(over.id as TileId))
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function toggleSize(id: TileId) {
    setSizes(prev => {
      const next = { ...prev, [id]: prev[id] === 'half' ? 'full' : 'half' } as Record<TileId, TileSize>
      try { localStorage.setItem(SIZES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function resetLayout() {
    setOrder(DEFAULT_ORDER)
    setSizes(DEFAULT_SIZES)
    try {
      localStorage.removeItem(ORDER_KEY)
      localStorage.removeItem(SIZES_KEY)
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-3 mb-3">
        {editMode && (
          <button
            onClick={resetLayout}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            Reset to default
          </button>
        )}
        <button
          onClick={() => setEditMode(v => !v)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            editMode
              ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
        >
          {editMode ? 'Done' : 'Edit layout'}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          {/* 2-column grid: tiles use col-span-1 (half) or col-span-2 (full) */}
          <div className="grid grid-cols-2 gap-6">
            {visible.map(id => (
              <SortableTile
                key={id}
                id={id}
                label={TILE_LABELS[id]}
                size={sizes[id] ?? 'full'}
                editMode={editMode}
                onToggleSize={() => toggleSize(id)}
              >
                {tileContent[id]}
              </SortableTile>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
