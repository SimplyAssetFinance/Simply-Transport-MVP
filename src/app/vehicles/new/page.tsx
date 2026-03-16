'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const TYPES  = ['truck', 'trailer', 'ute', 'van', 'other']

export default function NewVehiclePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    registration_plate: '',
    nickname: '',
    make: '',
    model: '',
    year: '',
    vehicle_type: 'truck',
    rego_state: 'NSW',
    rego_expiry: '',
    insurance_expiry: '',
    insurance_provider: '',
    next_service_date: '',
    service_interval_km: '',
    current_odometer: '',
    vin: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.registration_plate) { setError('Registration plate is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = {
      ...form,
      year: form.year ? parseInt(form.year) : null,
      service_interval_km: form.service_interval_km ? parseInt(form.service_interval_km) : null,
      current_odometer: form.current_odometer ? parseInt(form.current_odometer) : null,
      rego_expiry: form.rego_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      next_service_date: form.next_service_date || null,
      user_id: user.id,
    }

    const { error } = await supabase.from('vehicles').insert(payload)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/vehicles')
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/vehicles">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Registration Plate *</Label>
              <Input placeholder="ABC123" value={form.registration_plate} onChange={e => set('registration_plate', e.target.value.toUpperCase())} required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Nickname</Label>
              <Input placeholder="Blue Kenworth" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Make</Label>
              <Input placeholder="Kenworth" value={form.make} onChange={e => set('make', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input placeholder="T610" value={form.model} onChange={e => set('model', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" placeholder="2022" value={form.year} onChange={e => set('year', e.target.value)} min="1980" max="2030" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.vehicle_type} onValueChange={v => set('vehicle_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Compliance Dates</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rego Expiry</Label>
              <Input type="date" value={form.rego_expiry} onChange={e => set('rego_expiry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rego State</Label>
              <Select value={form.rego_state} onValueChange={v => set('rego_state', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insurance Expiry</Label>
              <Input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Insurance Provider</Label>
              <Input placeholder="Allianz" value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Next Service Date</Label>
              <Input type="date" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Service Interval (km)</Label>
              <Input type="number" placeholder="25000" value={form.service_interval_km} onChange={e => set('service_interval_km', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Odometer (km)</Label>
              <Input type="number" placeholder="150000" value={form.current_odometer} onChange={e => set('current_odometer', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Optional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input placeholder="17-character VIN" value={form.vin} onChange={e => set('vin', e.target.value)} maxLength={17} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any additional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add Vehicle'}
          </Button>
          <Link href="/vehicles">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
