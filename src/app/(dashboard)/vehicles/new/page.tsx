'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT']
const TYPES  = ['truck','trailer','ute','van','other']

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nickname: '', registration_plate: '', make: '', model: '',
    year: '', vehicle_type: 'truck', rego_state: 'NSW',
    rego_expiry: '', insurance_expiry: '', insurance_provider: '',
    next_service_date: '', service_interval_km: '', current_odometer: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.registration_plate) return toast.error('Registration plate is required')
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      nickname: form.nickname || form.registration_plate,
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
    }

    const { error } = await sb.from('vehicles').insert(payload)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Vehicle added!')
      router.push('/vehicles')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vehicles">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nickname</Label>
                <Input value={form.nickname} onChange={e => set('nickname', e.target.value)}
                  placeholder="Blue Kenworth" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Registration Plate *</Label>
                <Input value={form.registration_plate} onChange={e => set('registration_plate', e.target.value)}
                  placeholder="ABC-123" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Make</Label>
                <Input value={form.make} onChange={e => set('make', e.target.value)}
                  placeholder="Kenworth" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Model</Label>
                <Input value={form.model} onChange={e => set('model', e.target.value)}
                  placeholder="T610" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Year</Label>
                <Input value={form.year} onChange={e => set('year', e.target.value)}
                  placeholder="2022" type="number" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Type</Label>
                <Select value={form.vehicle_type} onValueChange={v => v && set('vehicle_type', v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">State</Label>
                <Select value={form.rego_state} onValueChange={v => v && set('rego_state', v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATES.map(s => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
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
                placeholder="Allianz, NRMA, etc." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
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
                  placeholder="25000" type="number" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Current Odometer</Label>
                <Input value={form.current_odometer} onChange={e => set('current_odometer', e.target.value)}
                  placeholder="187500" type="number" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes about this vehicle…"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[80px]" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 flex-1" disabled={loading}>
            {loading ? 'Saving…' : 'Add Vehicle'}
          </Button>
          <Link href="/vehicles">
            <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
