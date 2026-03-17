'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Gauge, Plus, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { logAudit } from '@/lib/audit'
import type { KmLog } from '@/lib/types'

interface Props {
  vehicleId: string
  currentOdometer: number | null
  onOdometerUpdate: (value: number) => void
}

export function KmLogSection({ vehicleId, currentOdometer, onOdometerUpdate }: Props) {
  const [logs, setLogs]       = useState<KmLog[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({
    log_date: new Date().toISOString().split('T')[0],
    odometer: '',
    notes: '',
  })

  async function fetchLogs() {
    const sb = createClient()
    const { data } = await sb
      .from('km_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
    setLogs((data as KmLog[]) || [])
  }

  useEffect(() => { fetchLogs() }, [vehicleId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.odometer) return toast.error('Odometer reading is required')
    const odo = parseInt(form.odometer)
    if (isNaN(odo) || odo < 0) return toast.error('Invalid odometer reading')

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }

    const { error } = await sb.from('km_logs').insert({
      vehicle_id: vehicleId,
      user_id:    user.id,
      log_date:   form.log_date,
      odometer:   odo,
      notes:      form.notes || null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      // Update vehicle's current_odometer if this reading is higher
      if (!currentOdometer || odo > currentOdometer) {
        await sb.from('vehicles').update({ current_odometer: odo, updated_at: new Date().toISOString() }).eq('id', vehicleId)
        onOdometerUpdate(odo)
      }
      await logAudit(sb, 'km_logged', 'vehicle', vehicleId, { odometer: odo, log_date: form.log_date })
      toast.success('KM entry added')
      setForm({ log_date: new Date().toISOString().split('T')[0], odometer: '', notes: '' })
      setShowForm(false)
      fetchLogs()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this KM entry?')) return
    const sb = createClient()
    await sb.from('km_logs').delete().eq('id', id)
    toast.success('Entry deleted')
    fetchLogs()
  }

  // Calculate km traveled between entries
  function kmTraveled(index: number): number | null {
    if (index >= logs.length - 1) return null
    return logs[index].odometer - logs[index + 1].odometer
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-blue-400" />
          <span className="text-slate-300 text-sm font-medium">Odometer History</span>
          {currentOdometer && (
            <span className="text-slate-500 text-xs">· Current: {currentOdometer.toLocaleString()} km</span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm(v => !v)}
          className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8 text-xs"
        >
          <Plus size={14} /> Log KMs
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Date</Label>
              <Input
                type="date"
                value={form.log_date}
                onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Odometer (km) *</Label>
              <Input
                type="number"
                placeholder="187500"
                value={form.odometer}
                onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Notes (optional)</Label>
            <Input
              placeholder="e.g. After Sydney run"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs" disabled={loading}>
              {loading ? 'Saving…' : 'Save Entry'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white h-8 text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No KM entries yet — log your first reading above.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const traveled = kmTraveled(i)
            return (
              <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-white text-sm font-medium">{log.odometer.toLocaleString()} km</p>
                    {traveled !== null && traveled > 0 && (
                      <span className="text-blue-400 text-xs">+{traveled.toLocaleString()} km</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {format(parseISO(log.log_date), 'd MMM yyyy')}
                    {log.notes && <span className="ml-2 text-slate-500">· {log.notes}</span>}
                  </p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
