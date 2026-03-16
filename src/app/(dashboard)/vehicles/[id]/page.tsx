'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Vehicle } from '@/lib/types'

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT']
const TYPES  = ['truck','trailer','ute','van','other']

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data } = await sb.from('vehicles').select('*').eq('id', params.id).single()
      if (data) {
        setVehicle(data)
        setForm({
          nickname: data.nickname ?? '',
          registration_plate: data.registration_plate ?? '',
          make: data.make ?? '',
          model: data.model ?? '',
          year: data.year?.toString() ?? '',
          vehicle_type: data.vehicle_type ?? 'truck',
          rego_state: data.rego_state ?? 'NSW',
          rego_expiry: data.rego_expiry ?? '',
          insurance_expiry: data.insurance_expiry ?? '',
          insurance_provider: data.insurance_provider ?? '',
          next_service_date: data.next_service_date ?? '',
          service_interval_km: data.service_interval_km?.toString() ?? '',
          current_odometer: data.current_odometer?.toString() ?? '',
          notes: data.notes ?? '',
        })
      }
    }
    load()
  }, [params.id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('vehicles').update({
      nickname: form.nickname,
      registration_plate: form.registration_plate.toUpperCase(),
      make: form.make || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      vehicle_type: form.vehicle_type,
      rego_state: form.rego_state,
      rego_expiry: form.rego_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      insurance_provider: form.insurance_provider || null,
      next_service_date: form.next_service_date || null,
      service_interval_km: form.service_interval_km ? parseInt(form.service_interval_km) : null,
      current_odometer: form.current_odometer ? parseInt(form.current_odometer) : null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id as string)

    if (error) toast.error(error.message)
    else toast.success('Vehicle updated!')
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    const sb = createClient()
    await sb.from('vehicles').delete().eq('id', params.id as string)
    toast.success('Vehicle deleted')
    router.push('/vehicles')
  }

  if (!vehicle) return <div className="text-slate-400">Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vehicles">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">{vehicle.nickname || vehicle.registration_plate}</h1>
        </div>
        <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950 gap-2">
          <Trash2 size={16} /> Delete
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nickname</Label>
                <Input value={form.nickname} onChange={e => set('nickname', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Registration Plate</Label>
                <Input value={form.registration_plate} onChange={e => set('registration_plate', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Make</Label>
                <Input value={form.make} onChange={e => set('make', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Model</Label>
                <Input value={form.model} onChange={e => set('model', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Year</Label>
                <Input value={form.year} onChange={e => set('year', e.target.value)}
                  type="number" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Type</Label>
                <Select value={form.vehicle_type ?? ''} onValueChange={v => v && set('vehicle_type', v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">State</Label>
                <Select value={form.rego_state ?? ''} onValueChange={v => v && set('rego_state', v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATES.map(s => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Compliance Dates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Rego Expiry</Label>
                <Input type="date" value={form.rego_expiry} onChange={e => set('rego_expiry', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Insurance Expiry</Label>
                <Input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Insurance Provider</Label>
              <Input value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Next Service Date</Label>
                <Input type="date" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Service Interval (km)</Label>
                <Input value={form.service_interval_km} onChange={e => set('service_interval_km', e.target.value)}
                  type="number" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Current Odometer</Label>
                <Input value={form.current_odometer} onChange={e => set('current_odometer', e.target.value)}
                  type="number" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]" />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
