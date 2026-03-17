'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import type { Checklist, ChecklistItem } from '@/lib/types'

export default function EditChecklistPage() {
  const params = useParams()
  const router = useRouter()
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [name, setName]           = useState('')
  const [items, setItems]         = useState<ChecklistItem[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data } = await sb.from('checklists').select('*').eq('id', params.id).single()
      if (data) {
        setChecklist(data as Checklist)
        setName(data.name)
        setItems(data.items || [])
      }
    }
    load()
  }, [params.id])

  function updateItem(index: number, field: keyof ChecklistItem, value: string | boolean) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { label: '', required: false }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim()) return toast.error('Template name is required')
    const validItems = items.filter(i => i.label.trim())
    if (validItems.length === 0) return toast.error('At least one item is required')

    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('checklists').update({
      name:       name.trim(),
      items:      validItems,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id as string)

    if (error) toast.error(error.message)
    else { toast.success('Template saved'); router.push('/checklists') }
    setLoading(false)
  }

  if (!checklist) return <div className="text-slate-400">Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/checklists">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Edit Template</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader><CardTitle className="text-white text-base">Template Name</CardTitle></CardHeader>
        <CardContent>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Standard Pre-Start"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Checklist Items</CardTitle>
            <Button size="sm" onClick={addItem} className="bg-slate-700 hover:bg-slate-600 gap-1.5 text-xs h-8">
              <Plus size={14} /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No items yet. Add your first inspection item.</p>
          )}
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <GripVertical size={16} className="text-slate-600 shrink-0" />
              <Input
                value={item.label}
                onChange={e => updateItem(i, 'label', e.target.value)}
                placeholder="Inspection item description…"
                className="bg-slate-700 border-slate-600 text-white text-sm h-8 flex-1"
              />
              <label className="flex items-center gap-1.5 text-slate-400 text-xs shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={e => updateItem(i, 'required', e.target.checked)}
                  className="accent-blue-500"
                />
                Required
              </label>
              <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={addItem}
            className="w-full text-slate-500 hover:text-white border border-dashed border-slate-700 hover:border-slate-500 h-9 text-xs">
            <Plus size={14} className="mr-1.5" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 flex-1">
          {loading ? 'Saving…' : 'Save Template'}
        </Button>
        <Link href="/checklists">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
        </Link>
      </div>
    </div>
  )
}
