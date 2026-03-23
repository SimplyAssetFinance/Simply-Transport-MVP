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

export default function NewDriverPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    first_name: '', last_name: '', mobile: '', email: '',
    date_of_birth: '', employee_id: '', start_date: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    emergency_contact_relationship: '', status: 'active', notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.mobile.trim()) {
      toast.error('First name, last name and mobile are required')
      return
    }
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data, error } = await sb.from('drivers').insert({
      user_id:                        user!.id,
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
    }).select().single()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Driver added!')
    router.push(`/drivers/${data.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/drivers">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Driver</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Basic Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">First Name <span className="text-red-400">*</span></Label>
                <Input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" required />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Last Name <span className="text-red-400">*</span></Label>
                <Input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Mobile <span className="text-red-400">*</span></Label>
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
                  className="bg-slate-800 border-slate-700 text-white" placeholder="e.g. EMP-001" />
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
          {loading ? 'Adding Driver…' : 'Add Driver'}
        </Button>
      </form>
    </div>
  )
}
