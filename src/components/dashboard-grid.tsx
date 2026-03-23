'use client'
import { useState } from 'react'
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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { SortableTile } from './sortable-tile'

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

export const DEFAULT_ORDER: TileId[] = [
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

const STORAGE_KEY = 'dashboard-tile-order'

function loadOrder(): TileId[] {
  if (typeof window === 'undefined') return DEFAULT_ORDER
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ORDER
    const saved = JSON.parse(raw) as string[]
    // Keep saved order, append any new tiles not yet in saved list
    const merged = [
      ...saved.filter((id): id is TileId => DEFAULT_ORDER.includes(id as TileId)),
      ...DEFAULT_ORDER.filter(id => !saved.includes(id)),
    ]
    return merged
  } catch {
    return DEFAULT_ORDER
  }
}

interface Props {
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

export function DashboardGrid(props: Props) {
  const [order, setOrder] = useState<TileId[]>(loadOrder)

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prev => {
      const from = prev.indexOf(active.id as TileId)
      const to   = prev.indexOf(over.id   as TileId)
      const next = arrayMove(prev, from, to)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function resetLayout() {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setOrder(DEFAULT_ORDER)
  }

  return (
    <div className="space-y-1">
      {/* Reset hint */}
      <div className="flex justify-end mb-2">
        <button
          onClick={resetLayout}
          className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
        >
          Reset layout
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-6 pt-2">
            {order.map(id => {
              const node = tileContent[id]
              if (!node) return null
              return (
                <SortableTile key={id} id={id} label={TILE_LABELS[id]}>
                  {node}
                </SortableTile>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
