'use client'
import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export type TileSize = 1 | 2 | 3 | 4 | 5 | 6

// All class names written out explicitly so Tailwind JIT includes them
const COL_SPAN: Record<TileSize, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
}

const GRID_COLS = 6

interface Props {
  id:       string
  label:    string
  size:     TileSize
  editMode: boolean
  onResize: (size: TileSize) => void
  children: React.ReactNode
}

export function SortableTile({ id, label, size, editMode, onResize, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editMode })

  const innerRef = useRef<HTMLDivElement>(null)

  function handleResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()

    const gridEl = innerRef.current?.closest('.grid') as HTMLElement | null
    if (!gridEl) return

    const gridWidth = gridEl.getBoundingClientRect().width
    const colWidth  = gridWidth / GRID_COLS
    const startX    = e.clientX
    const startSpan = size

    function onMove(ev: PointerEvent) {
      const dx      = ev.clientX - startX
      const newSpan = Math.max(1, Math.min(GRID_COLS, Math.round(startSpan + dx / colWidth))) as TileSize
      onResize(newSpan)
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex:  isDragging ? 50   : 'auto',
      }}
      className={COL_SPAN[size]}
    >
      {editMode && (
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-slate-600 text-[11px] select-none">{label}</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[10px] tabular-nums">{size}/6</span>
            <button
              {...attributes}
              {...listeners}
              style={{ touchAction: 'none' }}
              aria-label={`Drag to reorder ${label}`}
              title="Drag to reorder"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 cursor-grab active:cursor-grabbing transition-colors text-[11px]"
            >
              <GripVertical size={11} />
              <span>Move</span>
            </button>
          </div>
        </div>
      )}

      <div ref={innerRef} className={`relative${editMode ? ' ring-1 ring-blue-500/30 rounded-lg' : ''}`}>
        {children}

        {editMode && (
          <div
            onPointerDown={handleResizeStart}
            title="Drag to resize"
            style={{ touchAction: 'none' }}
            className="absolute top-0 right-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize z-10 group/resize"
          >
            <div className="w-1 h-10 rounded-full bg-blue-500/30 group-hover/resize:bg-blue-400 transition-colors" />
          </div>
        )}
      </div>
    </div>
  )
}
