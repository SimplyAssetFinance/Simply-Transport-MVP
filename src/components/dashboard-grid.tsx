'use client'
import { useState, useEffect } from 'react'
// react-grid-layout uses CJS `export =` — default import gives the class + namespace members
import ReactGridLayout from 'react-grid-layout'
import { GripVertical } from 'lucide-react'

type Layout = ReactGridLayout.Layout
const RGL = ReactGridLayout.WidthProvider(ReactGridLayout)

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

// 12-column grid, rowHeight=30px, margin=16px
// Rendered tile height (px) = h * 30 + (h - 1) * 16
const DEFAULT_LAYOUT: Layout[] = [
  { i: 'summary',          x: 0, y: 0,  w: 12, h: 4,  minW: 3, minH: 2  },
  { i: 'fuelSpend',        x: 0, y: 4,  w: 7,  h: 14, minW: 4, minH: 6  },
  { i: 'driverCompliance', x: 7, y: 4,  w: 5,  h: 6,  minW: 3, minH: 3  },
  { i: 'operatingCosts',   x: 7, y: 10, w: 5,  h: 8,  minW: 3, minH: 4  },
  { i: 'otherCharges',     x: 0, y: 18, w: 6,  h: 9,  minW: 3, minH: 4  },
  { i: 'maintenance',      x: 6, y: 18, w: 6,  h: 9,  minW: 3, minH: 4  },
  { i: 'documentAlerts',   x: 0, y: 27, w: 12, h: 5,  minW: 3, minH: 3  },
  { i: 'complianceAlerts', x: 0, y: 32, w: 6,  h: 10, minW: 3, minH: 5  },
  { i: 'fuelPrices',       x: 6, y: 32, w: 6,  h: 10, minW: 3, minH: 5  },
]

const LAYOUT_KEY = 'dashboard-layout-v2'

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
  const [layout,   setLayout]   = useState<Layout[]>(DEFAULT_LAYOUT)
  const [editMode, setEditMode] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(LAYOUT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Layout[]
        const ids   = new Set(saved.map(l => l.i))
        setLayout([
          ...saved,
          ...DEFAULT_LAYOUT.filter(l => !ids.has(l.i)),
        ])
      }
    } catch { /* ignore */ }
  }, [])

  const tileContent: Record<TileId, React.ReactNode | undefined> = {
    summary:          props.summary,
    driverCompliance: props.driverCompliance,
    maintenance:      props.maintenance,
    documentAlerts:   props.documentAlerts,
    fuelSpend:        props.fuelSpend,
    otherCharges:     props.otherCharges,
    operatingCosts:   props.operatingCosts,
    complianceAlerts: props.complianceAlerts,
    fuelPrices:       props.fuelPrices,
  }

  const visibleLayout = layout.filter(l => Boolean(tileContent[l.i as TileId]))

  function handleLayoutChange(newLayout: Layout[]) {
    setLayout(newLayout)
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout)) } catch { /* ignore */ }
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT)
    try { localStorage.removeItem(LAYOUT_KEY) } catch { /* ignore */ }
  }

  if (!mounted) {
    return <div className="min-h-[600px] animate-pulse rounded-xl bg-slate-900/40" />
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

      <RGL
        layout={visibleLayout}
        cols={12}
        rowHeight={30}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".tile-drag-handle"
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        resizeHandles={['se']}
      >
        {visibleLayout.map(({ i }) => {
          const id = i as TileId
          return (
            <div
              key={id}
              className={`flex flex-col${editMode ? ' ring-1 ring-blue-500/30 rounded-xl' : ''}`}
            >
              {editMode && (
                <div className="tile-drag-handle flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing select-none shrink-0 bg-slate-900/80 rounded-t-xl border-b border-slate-800">
                  <span className="text-slate-400 text-[11px] font-medium">{TILE_LABELS[id]}</span>
                  <div className="flex items-center gap-1 text-slate-600 text-[10px]">
                    <GripVertical size={11} />
                    <span>drag · resize ↘</span>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {tileContent[id]}
              </div>
            </div>
          )
        })}
      </RGL>
    </div>
  )
}
