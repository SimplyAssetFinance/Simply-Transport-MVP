'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { DriverComplianceItem } from '@/lib/types'
import { COMPLIANCE_ITEM_TYPES, itemComplianceStatus } from '@/lib/types'

interface Props {
  driverId:   string
  userId:     string
  driverName: string
}

function StatusPill({ expiry }: { expiry: string | null }) {
  const s = itemComplianceStatus(expiry)
  if (s === 'no_expiry') return <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">No Expiry</span>
  if (s === 'overdue')   return <span className="text-xs text-red-400    bg-red-500/10   border border-red-500/20   px-2 py-0.5 rounded-full">🔴 Overdue</span>
  if (s === 'due_soon')  return <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">🟡 Due Soon</span>
  return                        <span className="text-xs text-green-400  bg-green-500/10  border border-green-500/20  px-2 py-0.5 rounded-full">🟢 OK</span>
}

const BLANK = {
  item_type: "Driver's License", license_number: '', issue_date: '',
  expiry_date: '', issuing_authority: '', notes: '',
}

export function DriverComplianceItems({ driverId, userId, driverName }: Props) {
  const [items,   setItems]   = useState<DriverComplianceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [form,    setForm]    = useState<Record<string, string>>(BLANK)
  const [saving,  setSaving]  = useState(false)

  async function load() {
    const sb = createClient()
    const { data } = await sb
      .from('driver_compliance_items')
      .select('*')
      .eq('driver_id', driverId)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setItems((data as DriverComplianceItem[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [driverId])

  function setF(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function startEdit(item: DriverComplianceItem) {
    setEditId(item.id)
    setAdding(false)
    setForm({
      item_type:         item.item_type,
      license_number:    item.license_number ?? '',
      issue_date:        item.issue_date ?? '',
      expiry_date:       item.expiry_date ?? '',
      issuing_authority: item.issuing_authority ?? '',
      notes:             item.notes ?? '',
    })
  }

  function cancelForm() {
    setAdding(false)
    setEditId(null)
    setForm(BLANK)
  }

  async function handleSave() {
    if (!form.item_type) { toast.error('Item type is required'); return }
    setSaving(true)
    const sb = createClient()
    const payload = {
      driver_id:         driverId,
      user_id:           userId,
      item_type:         form.item_type,
      license_number:    form.license_number.trim() || null,
      issue_date:        form.issue_date || null,
      expiry_date:       form.expiry_date || null,
      issuing_authority: form.issuing_authority.trim() || null,
      notes:             form.notes.trim() || null,
      updated_at:        new Date().toISOString(),
    }

    let error
    if (editId) {
      // Log history if expiry date changed
      const oldItem = items.find(i => i.id === editId)
      if (oldItem && oldItem.expiry_date && oldItem.expiry_date !== (form.expiry_date || null)) {
        await sb.from('compliance_history').insert({
          user_id:         userId,
          entity_type:     'driver',
          entity_id:       driverId,
          entity_name:     driverName,
          compliance_type: form.item_type,
          old_expiry:      oldItem.expiry_date,
          new_expiry:      form.expiry_date || null,
        })
      }
      ;({ error } = await sb.from('driver_compliance_items').update(payload).eq('id', editId))
    } else {
      ;({ error } = await sb.from('driver_compliance_items').insert(payload))
    }

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editId ? 'Item updated' : 'Item added')
    cancelForm()
    await load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this compliance item?')) return
    const sb = createClient()
    await sb.from('driver_compliance_items').delete().eq('id', id)
    toast.success('Item deleted')
    await load()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>

  return (
    <div className="space-y-3">
      {items.length === 0 && !adding && (
        <p className="text-slate-500 text-sm text-center py-4">No compliance items yet</p>
      )}

      {/* Item list */}
      {items.map(item => (
        <div key={item.id}>
          {editId === item.id ? (
            <ComplianceItemForm form={form} setF={setF} onSave={handleSave} onCancel={cancelForm} saving={saving} isEdit />
          ) : (
            <div className="flex items-start justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium">{item.item_type}</p>
                  <StatusPill expiry={item.expiry_date} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {item.license_number    && <span>#{item.license_number}</span>}
                  {item.issuing_authority && <span>{item.issuing_authority}</span>}
                  {item.expiry_date       && <span>Expires: {format(parseISO(item.expiry_date), 'd MMM yyyy')}</span>}
                  {item.issue_date        && <span>Issued: {format(parseISO(item.issue_date), 'd MMM yyyy')}</span>}
                </div>
                {item.notes && <p className="text-slate-500 text-xs mt-1">{item.notes}</p>}
              </div>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-white rounded">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {adding && !editId && (
        <ComplianceItemForm form={form} setF={setF} onSave={handleSave} onCancel={cancelForm} saving={saving} />
      )}

      {!adding && !editId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setAdding(true); setForm(BLANK) }}
          className="w-full border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
        >
          <Plus size={14} /> Add Compliance Item
        </Button>
      )}
    </div>
  )
}

function ComplianceItemForm({
  form, setF, onSave, onCancel, saving, isEdit,
}: {
  form: Record<string, string>
  setF: (f: string, v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit?: boolean
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-4 space-y-3 bg-slate-800/50">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-slate-400 text-xs">Item Type</Label>
          <Select value={form.item_type} onValueChange={v => v && setF('item_type', v)}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {COMPLIANCE_ITEM_TYPES.map(t => (
                <SelectItem key={t} value={t} className="text-white text-sm">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">License/Cert Number</Label>
          <Input value={form.license_number} onChange={e => setF('license_number', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white h-9 text-sm" placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Issuing Authority</Label>
          <Input value={form.issuing_authority} onChange={e => setF('issuing_authority', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white h-9 text-sm" placeholder="e.g. RMS, NHVR" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Issue Date</Label>
          <Input type="date" value={form.issue_date} onChange={e => setF('issue_date', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Expiry Date <span className="text-slate-600">(blank = no expiry)</span></Label>
          <Input type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-slate-400 text-xs">Notes</Label>
          <Input value={form.notes} onChange={e => setF('notes', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white h-9 text-sm" placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          <Check size={13} /> {isEdit ? 'Update' : 'Add Item'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}
          className="text-slate-400 hover:text-white gap-1.5">
          <X size={13} /> Cancel
        </Button>
      </div>
    </div>
  )
}
