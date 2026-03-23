'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react'

export type TileSize = 'full' | 'half'

interface Props {
  id:           string
  label:        string
  size:         TileSize
  onToggleSize: () => void
  children:     React.ReactNode
}

export function SortableTile({ id, label, size, onToggleSize, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex:  isDragging ? 50   : 'auto',
      }}
      className={size === 'half' ? 'col-span-1' : 'col-span-2'}
    >
      {/* Controls — appear on hover over the tile */}
      <div className="relative group/tile">
        <div className="absolute -top-3 right-0 z-20 flex items-center gap-1 opacity-0 group-hover/tile:opacity-100 transition-opacity pointer-events-none group-hover/tile:pointer-events-auto">
          {/* Size toggle */}
          <button
            onClick={onToggleSize}
            title={size === 'full' ? 'Shrink to half width' : 'Expand to full width'}
            className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500 hover:text-white transition-colors text-[11px]"
          >
            {size === 'full'
              ? <><Minimize2 size={11} /><span>Half</span></>
              : <><Maximize2 size={11} /><span>Full</span></>
            }
          </button>

          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
            aria-label={`Drag to reorder ${label}`}
            className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500 hover:text-white cursor-grab active:cursor-grabbing transition-colors text-[11px]"
          >
            <GripVertical size={11} />
            <span>{label}</span>
          </button>
        </div>

        <div className="pt-3">
          {children}
        </div>
      </div>
    </div>
  )
}
