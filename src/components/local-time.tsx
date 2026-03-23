'use client'
import { useEffect, useState } from 'react'

interface Props {
  iso: string
  className?: string
}

export function LocalTime({ iso, className }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
    setText(`${date}, ${time}`)
  }, [iso])

  return <span className={className}>{text || '—'}</span>
}
