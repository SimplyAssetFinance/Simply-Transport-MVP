'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ClipboardList, Plus, Pencil, Trash2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Checklist, ChecklistSubmission } from '@/lib/types'

const DEFAULT_ITEMS = [
  { label: 'Tyres — condition and inflation', required: true },
  { label: 'Lights — headlights, brake lights, indicators', required: true },
  { label: 'Brakes — test effectiveness', required: true },
  { label: 'Fluids — oil, coolant, washer fluid', required: true },
  { label: 'Damage — inspect for new defects', required: true },
  { label: 'Mirrors — clean and properly adjusted', required: true },
  { label: 'Seatbelt — condition and function', required: true },
]

export default function ChecklistsPage() {
  const [checklists, setChecklists]     = useState<Checklist[]>([])
  const [submissions, setSubmissions]   = useState<ChecklistSubmission[]>([])
  const [creating, setCreating]         = useState(false)
  const [newName, setNewName]           = useState('')
  const [loading, setLoading]           = useState(false)

  async function fetchAll() {
    const sb = createClient()
    const [{ data: cl }, { data: sub }] = await Promise.all([
      sb.from('checklists').select('*').order('created_at', { ascending: false }),
      sb.from('checklist_submissions')
        .select('*, vehicles(nickname, registration_plate), checklists(name)')
        .order('submitted_at', { ascending: false })
        .limit(20),
    ])
    setChecklists((cl as Checklist[]) || [])
    setSubmissions((sub as ChecklistSubmission[]) || [])
  }

  useEffect(() => { fetchAll() }, [])

  async function createDefault() {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }
    const { error } = await sb.from('checklists').insert({
      user_id:    user.id,
      name:       'Standard Pre-Start',
      items:      DEFAULT_ITEMS,
      is_default: true,
    })
    if (error) toast.error(error.message)
    else { toast.success('Default checklist created'); fetchAll() }
    setLoading(false)
  }

  async function createCustom() {
    if (!newName.trim()) return toast.error('Name is required')
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }
    const { data, error } = await sb.from('checklists').insert({
      user_id:    user.id,
      name:       newName.trim(),
      items:      DEFAULT_ITEMS,
      is_default: false,
    }).select('id').single()
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Checklist created')
      setCreating(false)
      setNewName('')
      fetchAll()
      // Navigate to edit page to customise items
      window.location.href = `/checklists/${data.id}`
    }
    setLoading(false)
  }

  async function deleteChecklist(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const sb = createClient()
    await sb.from('checklists').delete().eq('id', id)
    toast.success('Checklist deleted')
    fetchAll()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Checklists</h1>
          <p className="text-slate-400 mt-1">Pre-start inspection templates and submission history</p>
        </div>
        <div className="flex gap-3">
          <Link href="/checklists/submit">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <ClipboardList size={16} /> Submit Checklist
            </Button>
          </Link>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Templates</h2>
          <div className="flex gap-2">
            {!checklists.some(c => c.is_default) && (
              <Button size="sm" variant="outline" onClick={createDefault} disabled={loading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
                + Add Default Template
              </Button>
            )}
            <Button size="sm" onClick={() => setCreating(v => !v)} disabled={loading}
              className="bg-slate-700 hover:bg-slate-600 gap-1.5 text-xs">
              <Plus size={14} /> New Template
            </Button>
          </div>
        </div>

        {creating && (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="Template name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCustom(); if (e.key === 'Escape') setCreating(false) }}
              className="bg-slate-800 border-slate-700 text-white h-9"
            />
            <Button size="sm" onClick={createCustom} disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-9">
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}
              className="text-slate-400 hover:text-white h-9">
              Cancel
            </Button>
          </div>
        )}

        {checklists.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-10 text-center">
              <ClipboardList size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No templates yet.</p>
              <p className="text-slate-500 text-xs mt-1">Create a default template or build your own.</p>
              <Button size="sm" onClick={createDefault} disabled={loading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-xs">
                + Create Default Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {checklists.map(cl => (
              <div key={cl.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{cl.name}</p>
                    {cl.is_default && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs">Default</Badge>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {cl.items.length} item{cl.items.length !== 1 ? 's' : ''} ·
                    Created {format(parseISO(cl.created_at), 'd MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/checklists/${cl.id}`}>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1.5 text-xs h-8">
                      <Pencil size={13} /> Edit
                    </Button>
                  </Link>
                  <button onClick={() => deleteChecklist(cl.id, cl.name)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="space-y-4">
        <h2 className="text-white font-semibold">Recent Submissions</h2>
        {submissions.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-8 text-center">
              <p className="text-slate-500 text-sm">No submissions yet.</p>
              <Link href="/checklists/submit">
                <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-xs gap-1.5">
                  <ChevronRight size={14} /> Submit First Checklist
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {submissions.map(sub => {
              const v = sub.vehicles as { nickname: string; registration_plate: string } | null
              const vName = v?.nickname || v?.registration_plate || 'Unknown vehicle'
              const clName = (sub.checklists as { name: string } | null)?.name || 'Unknown template'
              return (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    {sub.passed === true
                      ? <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                      : sub.passed === false
                      ? <XCircle size={18} className="text-red-400 shrink-0" />
                      : <ClipboardList size={18} className="text-slate-500 shrink-0" />
                    }
                    <div>
                      <p className="text-white text-sm font-medium">{vName}</p>
                      <p className="text-slate-400 text-xs">
                        {clName} · {format(parseISO(sub.submitted_at), 'd MMM yyyy, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge className={
                    sub.passed === true  ? 'bg-green-500/20 text-green-400 border-green-500/30 border' :
                    sub.passed === false ? 'bg-red-500/20 text-red-400 border-red-500/30 border' :
                    'bg-slate-700 text-slate-400 border-slate-600 border'
                  }>
                    {sub.passed === true ? 'Passed' : sub.passed === false ? 'Failed' : 'Incomplete'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
