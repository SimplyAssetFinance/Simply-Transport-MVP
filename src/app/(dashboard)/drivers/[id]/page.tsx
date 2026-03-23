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
import type { Driver } from '@/lib/types'
import { DriverComplianceItems } from '@/components/driver-compliance-items'
import { DriverDocuments } from '@/components/driver-documents'

export default function DriverProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [driver, setDriver]     = useState<Driver | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)
  const [form, setForm]         = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) setUserId(user.id)
      const { data } = await sb.from('drivers').select('*').eq('id', params.id).single()
      if (data) {
        setDriver(data)
        setForm({
          first_name:                     data.first_name ?? '',
          last_name:                      data.last_name ?? '',
          mobile:                         data.mobile ?? '',
          email:                          data.email ?? '',
          date_of_birth:                  data.date_of_birth ?? '',
          employee_id:                    data.employee_id ?? '',
          start_date:                     data.start_date ?? '',
          emergency_contact_name:         data.emergency_contact_name ?? '',
          emergency_contact_phone:        data.emergency_contact_phone ?? '',
          emergency_contact_relationship: data.emergency_contact_relationship ?? '',
          status:                         data.status ?? 'active',
          notes:                          data.notes ?? '',
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
    const { error } = await sb.from('drivers').update({
      first_name:                     form.first_name.trim(),
      last_name:                      form.last_name.trim(),
      mobile:                         form.mobile.trim(),
      email:                          form.email.trim() || null,
      date_of_birth:                  form.date_of_birth || null,
      employee_id:                    form.employee_id.trim() || null,
      start_date:                     form.start_date || null,
      emergency_contact_name:         form.emergency_contact_name.trim() || null,
      emergency_contact_phone:        form.emergency_contact_phone.trim() || null,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
      status:                         form.status,
      notes:                          form.notes.trim() || null,
      updated_at:                     new Date().toISOString(),
    }).eq('id', params.id as string)

    if (error) toast.error(error.message)
    else toast.success('Driver updated!')
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${driver?.first_name} ${driver?.last_name}? This cannot be undone.`)) return
    const sb = createClient()
    await sb.from('drivers').delete().eq('id', params.id as string)
    toast.success('Driver deleted')
    router.push('/drivers')
  }

  if (!driver) return <div className="text-slate-400">Loading…</div>

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/drivers">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {driver.first_name} {driver.last_name}
          </h1>
        </div>
        <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950 gap-2">
          <Trash2 size={16} /> Delete
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* Left — profile form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Basic Details */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-white text-base">Basic Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">First Name</Label>
                  <Input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Last Name</Label>
                  <Input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Mobile</Label>
                  <Input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                    type="tel" className="bg-slate-800 border-slate-700 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input value={form.email} onChange={e => set('email', e.target.value)}
                    type="email" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Date of Birth</Label>
                  <Input value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                    type="date" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Employee ID</Label>
                  <Input value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" placeholder="EMP-001" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Date</Label>
                  <Input value={form.start_date} onChange={e => set('start_date', e.target.value)}
                    type="date" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select value={form.status} onValueChange={v => v && set('status', v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active"   className="text-white">Active</SelectItem>
                    <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-white text-base">Emergency Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Phone</Label>
                  <Input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)}
                    type="tel" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Relationship</Label>
                <Input value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" placeholder="e.g. Partner, Parent" />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
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

        {/* Right — compliance & documents */}
        <div className="space-y-4">
          {userId && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-white text-base">Compliance Items</CardTitle></CardHeader>
              <CardContent>
                <DriverComplianceItems driverId={params.id as string} userId={userId} />
              </CardContent>
            </Card>
          )}
          {userId && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-white text-base">Documents</CardTitle></CardHeader>
              <CardContent>
                <DriverDocuments driverId={params.id as string} userId={userId} />
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}
