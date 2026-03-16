'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Download, Wrench, Calendar, DollarSign } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const TYPES = [
  { value: 'service',      label: 'Scheduled Service' },
  { value: 'repair',       label: 'Repair' },
  { value: 'tyre',         label: 'Tyres' },
  { value: 'inspection',   label: 'Inspection' },
  { value: 'registration', label: 'Registration' },
  { value: 'insurance',    label: 'Insurance' },
  { value: 'other',        label: 'Other' },
]

interface MaintenanceRecord {
  id: string
  type: string
  description: string
  date: string
  cost: number | null
  odometer_at_job: number | null
  invoice_path: string | null
  status: string
  provider_name: string | null
  notes: string | null
}

const emptyForm = {
  type: 'service',
  description: '',
  date: new Date().toISOString().split('T')[0],
  cost: '',
  odometer_at_job: '',
  status: 'completed',
  provider_name: '',
  notes: '',
}

export default function MaintenanceLog({ vehicleId, userId }: { vehicleId: string; userId: string }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  async function loadRecords() {
    const { data } = await sb
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
    setRecords((data as MaintenanceRecord[]) || [])
  }

  useEffect(() => { loadRecords() }, [vehicleId])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.description || !form.date) { toast.error('Description and date are required'); return }
    setSaving(true)

    let invoice_path: string | null = null
    if (invoiceFile) {
      const path = `${userId}/${vehicleId}/invoices/${Date.now()}_${invoiceFile.name}`
      const { error: uploadErr } = await sb.storage.from('vehicle-files').upload(path, invoiceFile)
      if (uploadErr) { toast.error(uploadErr.message); setSaving(false); return }
      invoice_path = path
    }

    const { error } = await sb.from('maintenance_records').insert({
      vehicle_id: vehicleId,
      user_id: userId,
      type: form.type,
      description: form.description,
      date: form.date,
      cost: form.cost ? parseFloat(form.cost) : null,
      odometer_at_job: form.odometer_at_job ? parseInt(form.odometer_at_job) : null,
      status: form.status,
      provider_name: form.provider_name || null,
      notes: form.notes || null,
      invoice_path,
    })

    if (error) { toast.error(error.message); setSaving(false); return }

    toast.success(form.status === 'scheduled' ? 'Scheduled job added' : 'Record saved')
    setForm({ ...emptyForm })
    setInvoiceFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setAdding(false)
    setSaving(false)
    loadRecords()
  }

  async function handleDownloadInvoice(record: MaintenanceRecord) {
    if (!record.invoice_path) return
    const { data, error } = await sb.storage.from('vehicle-files').createSignedUrl(record.invoice_path, 60)
    if (error || !data) { toast.error('Could not generate download link'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(record: MaintenanceRecord) {
    if (!confirm(`Delete this record?`)) return
    if (record.invoice_path) await sb.storage.from('vehicle-files').remove([record.invoice_path])
    await sb.from('maintenance_records').delete().eq('id', record.id)
    toast.success('Record deleted')
    loadRecords()
  }

  const currentYear = new Date().getFullYear()

  const completed = records.filter(r => r.status === 'completed')
  const scheduled = records.filter(r => r.status === 'scheduled')

  const ytdCost = completed
    .filter(r => r.cost && new Date(r.date).getFullYear() === currentYear)
    .reduce((sum, r) => sum + (r.cost ?? 0), 0)

  const lifetimeCost = completed
    .filter(r => r.cost)
    .reduce((sum, r) => sum + (r.cost ?? 0), 0)

  const scheduledCost = scheduled
    .filter(r => r.cost)
    .reduce((sum, r) => sum + (r.cost ?? 0), 0)

  const typeLabel = (val: string) => TYPES.find(t => t.value === val)?.label ?? val

  const fmt = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <DollarSign size={14} className="text-green-400" />
          <span>YTD: <span className="text-white font-semibold">{fmt(ytdCost)}</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <DollarSign size={14} className="text-emerald-500" />
          <span>Lifetime: <span className="text-white font-semibold">{fmt(lifetimeCost)}</span></span>
        </div>
        {scheduledCost > 0 && (
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign size={14} className="text-amber-400" />
            <span>Est. upcoming: <span className="text-amber-300 font-semibold">{fmt(scheduledCost)}</span></span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-400">
          <Wrench size={14} className="text-blue-400" />
          <span>{completed.length} completed</span>
        </div>
        {scheduled.length > 0 && (
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} className="text-amber-400" />
            <span className="text-amber-400 font-medium">{scheduled.length} upcoming</span>
          </div>
        )}
      </div>

      {/* Add button / form */}
      {!adding ? (
        <Button onClick={() => setAdding(true)} variant="outline" size="sm"
          className="border-slate-700 text-slate-300 hover:text-white gap-2">
          <Plus size={14} /> Add Record
        </Button>
      ) : (
        <div className="bg-slate-800/60 rounded-lg p-4 space-y-4 border border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => v && set('type', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => v && set('status', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="scheduled" className="text-white">Scheduled (future)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Description *</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. 250,000km service — oil, filters, brake check"
              className="bg-slate-900 border-slate-700 text-white h-9" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="bg-slate-900 border-slate-700 text-white h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Cost (AUD)</Label>
              <Input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                placeholder="0.00" className="bg-slate-900 border-slate-700 text-white h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Odometer (km)</Label>
              <Input type="number" value={form.odometer_at_job} onChange={e => set('odometer_at_job', e.target.value)}
                placeholder="km" className="bg-slate-900 border-slate-700 text-white h-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Provider / Mechanic</Label>
            <Input value={form.provider_name} onChange={e => set('provider_name', e.target.value)}
              placeholder="e.g. Kenworth Service Centre Sydney"
              className="bg-slate-900 border-slate-700 text-white h-9" />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Invoice / Receipt (optional)</Label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setInvoiceFile(e.target.files?.[0] ?? null)}
              className="text-slate-400 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 file:text-xs hover:file:bg-slate-600" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={() => { setAdding(false); setForm({ ...emptyForm }); setInvoiceFile(null) }}
              variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming scheduled */}
      {scheduled.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Upcoming / Scheduled</h4>
          {scheduled.map(r => (
            <RecordRow key={r.id} record={r} typeLabel={typeLabel} onDelete={handleDelete} onDownload={handleDownloadInvoice} />
          ))}
        </div>
      )}

      {/* Completed history */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">History</h4>
          {completed.map(r => (
            <RecordRow key={r.id} record={r} typeLabel={typeLabel} onDelete={handleDelete} onDownload={handleDownloadInvoice} />
          ))}
        </div>
      )}

      {records.length === 0 && !adding && (
        <p className="text-slate-500 text-sm">No maintenance records yet.</p>
      )}
    </div>
  )
}

function RecordRow({ record, typeLabel, onDelete, onDownload }: {
  record: MaintenanceRecord
  typeLabel: (v: string) => string
  onDelete: (r: MaintenanceRecord) => void
  onDownload: (r: MaintenanceRecord) => void
}) {
  return (
    <div className="flex items-start justify-between bg-slate-800/50 rounded-lg px-4 py-3 gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-medium">{record.description}</span>
          <Badge variant="outline" className={`text-xs border-0 px-2 py-0 ${
            record.status === 'scheduled'
              ? 'bg-amber-900/40 text-amber-400'
              : 'bg-slate-700 text-slate-300'
          }`}>
            {typeLabel(record.type)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
          <span>{format(parseISO(record.date), 'd MMM yyyy')}</span>
          {record.cost && <span className="text-green-400">${record.cost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>}
          {record.odometer_at_job && <span>{record.odometer_at_job.toLocaleString()} km</span>}
          {record.provider_name && <span>{record.provider_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {record.invoice_path && (
          <Button onClick={() => onDownload(record)} variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0">
            <Download size={14} />
          </Button>
        )}
        <Button onClick={() => onDelete(record)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0">
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}
