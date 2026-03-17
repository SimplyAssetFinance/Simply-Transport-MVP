'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, XCircle, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { logAudit } from '@/lib/audit'
import type { Vehicle, Checklist, ChecklistItem } from '@/lib/types'

export default function SubmitChecklistPage() {
  const router = useRouter()
  const [vehicles, setVehicles]     = useState<Vehicle[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [vehicleId, setVehicleId]   = useState('')
  const [checklistId, setChecklistId] = useState('')
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [responses, setResponses]   = useState<Record<string, { checked: boolean; notes: string }>>({})
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: v }, { data: c }] = await Promise.all([
        sb.from('vehicles').select('id,nickname,registration_plate').order('nickname'),
        sb.from('checklists').select('*').order('is_default', { ascending: false }),
      ])
      setVehicles((v as Vehicle[]) || [])
      const cls = (c as Checklist[]) || []
      setChecklists(cls)
      // Auto-select default checklist
      const def = cls.find(cl => cl.is_default)
      if (def) {
        setChecklistId(def.id)
        setSelectedChecklist(def)
        initResponses(def.items)
      }
    }
    load()
  }, [])

  function initResponses(items: ChecklistItem[]) {
    const r: Record<string, { checked: boolean; notes: string }> = {}
    items.forEach(item => { r[item.label] = { checked: false, notes: '' } })
    setResponses(r)
  }

  function onChecklistChange(id: string) {
    setChecklistId(id)
    const cl = checklists.find(c => c.id === id)
    setSelectedChecklist(cl || null)
    if (cl) initResponses(cl.items)
  }

  function setChecked(label: string, checked: boolean) {
    setResponses(r => ({ ...r, [label]: { ...r[label], checked } }))
  }
  function setNote(label: string, note: string) {
    setResponses(r => ({ ...r, [label]: { ...r[label], notes: note } }))
  }

  async function handleSubmit() {
    if (!vehicleId) return toast.error('Select a vehicle')
    if (!checklistId || !selectedChecklist) return toast.error('Select a checklist template')

    // Check required items
    const failedRequired = selectedChecklist.items.filter(
      item => item.required && !responses[item.label]?.checked
    )

    const passed = failedRequired.length === 0

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }

    const { error } = await sb.from('checklist_submissions').insert({
      vehicle_id:   vehicleId,
      checklist_id: checklistId,
      user_id:      user.id,
      responses,
      passed,
    })

    if (error) {
      toast.error(error.message)
    } else {
      await logAudit(sb, 'checklist_submitted', 'vehicle', vehicleId, {
        checklist_id: checklistId,
        checklist_name: selectedChecklist.name,
        passed,
      })
      toast.success(passed ? 'Checklist submitted — Passed ✓' : 'Checklist submitted — Failed (required items incomplete)')
      router.push('/checklists')
    }
    setLoading(false)
  }

  const allRequiredChecked = selectedChecklist
    ? selectedChecklist.items.filter(i => i.required).every(i => responses[i.label]?.checked)
    : true

  const checkedCount = Object.values(responses).filter(r => r.checked).length
  const totalCount   = selectedChecklist?.items.length ?? 0

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/checklists">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Submit Pre-Start Checklist</h1>
      </div>

      {/* Vehicle + Template selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader><CardTitle className="text-white text-base">Selection</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select vehicle…" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-white">
                    {v.nickname || v.registration_plate}
                    {v.nickname ? ` (${v.registration_plate})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Checklist Template *</Label>
            <Select value={checklistId} onValueChange={onChecklistChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select template…" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {checklists.map(cl => (
                  <SelectItem key={cl.id} value={cl.id} className="text-white">
                    {cl.name}{cl.is_default ? ' (Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checklist items */}
      {selectedChecklist && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">{selectedChecklist.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">{checkedCount}/{totalCount}</span>
                {allRequiredChecked
                  ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs">All Required ✓</Badge>
                  : <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">Required Pending</Badge>
                }
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedChecklist.items.map((item, i) => {
              const resp = responses[item.label] || { checked: false, notes: '' }
              return (
                <div key={i} className={`p-3 rounded-lg border transition-colors ${
                  resp.checked ? 'bg-green-950/20 border-green-500/20' : 'bg-slate-800 border-slate-700'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={resp.checked}
                        onChange={e => setChecked(item.label, e.target.checked)}
                        className="accent-green-500 w-4 h-4"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${resp.checked ? 'text-green-400' : 'text-white'}`}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="text-red-400 text-xs">*</span>
                        )}
                        {resp.checked
                          ? <CheckCircle2 size={14} className="text-green-400 ml-auto" />
                          : item.required ? <XCircle size={14} className="text-red-400/40 ml-auto" /> : null
                        }
                      </div>
                      {resp.checked && (
                        <Input
                          placeholder="Notes (optional)…"
                          value={resp.notes}
                          onChange={e => setNote(item.label, e.target.value)}
                          className="mt-2 bg-slate-700 border-slate-600 text-white text-xs h-7 placeholder:text-slate-500"
                        />
                      )}
                    </div>
                  </label>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Progress summary + submit */}
      {selectedChecklist && (
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || !vehicleId}
            className={`${allRequiredChecked ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} gap-2`}
          >
            <ClipboardList size={16} />
            {loading ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      )}

      {!selectedChecklist && checklists.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-8 text-center">
            <p className="text-slate-400 text-sm">No checklist templates found.</p>
            <Link href="/checklists">
              <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-xs">Create a Template First</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
