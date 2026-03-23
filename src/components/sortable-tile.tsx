'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react'

export type TileSize = 'full' | 'half'

interface Props {
  id:           string
  label:        string
  size:         TileSize
  editMode:     boolean
  onToggleSize: () => void
  children:     React.ReactNode
}

export function SortableTile({ id, label, size, editMode, onToggleSize, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editMode })

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
      {editMode && (
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          {/* Label */}
          <span className="text-slate-600 text-[11px] select-none">{label}</span>

          <div className="flex items-center gap-1">
            {/* Size toggle */}
            <button
              onClick={onToggleSize}
              title={size === 'full' ? 'Shrink to half width' : 'Expand to full width'}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-[11px]"
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
              title="Drag to reorder"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 cursor-grab active:cursor-grabbing transition-colors text-[11px]"
            >
              <GripVertical size={11} />
              <span>Move</span>
            </button>
          </div>
        </div>
      )}

      <div className={editMode ? 'ring-1 ring-blue-500/30 rounded-lg' : ''}>
        {children}
      </div>
    </div>
  )
}
