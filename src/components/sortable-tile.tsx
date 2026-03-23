'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface Props {
  id:       string
  label:    string
  children: React.ReactNode
}

export function SortableTile({ id, label, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/tile">
      {/* Drag handle — visible on hover */}
      <button
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        aria-label={`Drag to reorder ${label}`}
        className="absolute -top-3 right-2 z-20 flex items-center gap-1.5 px-2 py-1
                   bg-slate-800 border border-slate-700 rounded
                   opacity-0 group-hover/tile:opacity-100
                   transition-opacity cursor-grab active:cursor-grabbing
                   select-none"
      >
        <GripVertical size={13} className="text-slate-500" />
        <span className="text-slate-500 text-[11px] leading-none">{label}</span>
      </button>

      {children}
    </div>
  )
}
