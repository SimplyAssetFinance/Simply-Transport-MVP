'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Upload, FileText, Trash2, Download, FolderOpen,
  AlertTriangle, Calendar, X, Sparkles, Loader2,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

const CATEGORIES = [
  { value: 'insurance_policy', label: 'Insurance Policy' },
  { value: 'tax_invoice',      label: 'Tax Invoice' },
  { value: 'contract',         label: 'Contract / Agreement' },
  { value: 'permit',           label: 'Permit / Licence' },
  { value: 'registration',     label: 'Business Registration' },
  { value: 'other',            label: 'Other' },
]

const SCANNABLE = ['insurance_policy', 'tax_invoice']

interface BizDoc {
  id: string
  name: string
  category: string
  file_path: string
  file_size: number | null
  due_date: string | null
  reminder_note: string | null
  uploaded_at: string
}

interface ScanResult {
  docId: string
  data: Record<string, unknown>
}

function dueBadge(dueDate: string) {
  const days = differenceInDays(parseISO(dueDate), new Date())
  if (days < 0)   return { label: 'Overdue',     cls: 'bg-red-900/40 text-red-400 border-red-700/40' }
  if (days <= 1)  return { label: '1 day',        cls: 'bg-red-900/40 text-red-400 border-red-700/40' }
  if (days <= 7)  return { label: `${days}d`,     cls: 'bg-orange-900/40 text-orange-400 border-orange-700/40' }
  if (days <= 14) return { label: `${days}d`,     cls: 'bg-amber-900/40 text-amber-400 border-amber-700/40' }
  if (days <= 28) return { label: `${days}d`,     cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40' }
  return { label: format(parseISO(dueDate), 'd MMM yyyy'), cls: 'bg-slate-700 text-slate-300 border-slate-600' }
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function catLabel(val: string) {
  return CATEGORIES.find(c => c.value === val)?.label ?? val
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<BizDoc[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [filterCat, setFilterCat] = useState('all')

  // Upload form state
  const [category, setCategory] = useState('insurance_policy')
  const [dueDate, setDueDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadDocs(user.id)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDocs(uid?: string) {
    const id = uid ?? userId
    if (!id) return
    const { data } = await sb
      .from('business_documents')
      .select('*')
      .eq('user_id', id)
      .order('uploaded_at', { ascending: false })
    setDocs((data as BizDoc[]) || [])
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)

    const path = `${userId}/business/${Date.now()}_${file.name}`
    const { error: uploadErr } = await sb.storage.from('vehicle-files').upload(path, file)
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return }

    const { error: dbErr } = await sb.from('business_documents').insert({
      user_id: userId,
      name: file.name,
      category,
      file_path: path,
      file_size: file.size,
      due_date: dueDate || null,
      reminder_note: reminderNote || null,
    })
    if (dbErr) { toast.error(dbErr.message); setUploading(false); return }

    toast.success('Document uploaded')
    if (fileRef.current) fileRef.current.value = ''
    setDueDate('')
    setReminderNote('')
    setUploading(false)
    loadDocs()
  }

  async function handleDownload(doc: BizDoc) {
    const { data, error } = await sb.storage.from('vehicle-files').createSignedUrl(doc.file_path, 60)
    if (error || !data) { toast.error('Could not generate download link'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: BizDoc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await sb.storage.from('vehicle-files').remove([doc.file_path])
    await sb.from('business_documents').delete().eq('id', doc.id)
    toast.success('Document deleted')
    loadDocs()
  }

  async function handleScan(doc: BizDoc) {
    setScanningId(doc.id)
    setScanResult(null)
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.file_path, category: doc.category }),
      })
      const json = await res.json() as { ok?: boolean; extracted?: Record<string, unknown>; error?: string }
      if (!res.ok || !json.ok) { toast.error(json.error ?? 'Scan failed'); return }
      setScanResult({ docId: doc.id, data: json.extracted ?? {} })

      // Auto-fill due date if extracted
      const ext = json.extracted ?? {}
      const expiry = ext.expiry_date ?? ext.due_date
      if (typeof expiry === 'string' && expiry && !dueDate) {
        // Update the doc row with the extracted due date
        await sb.from('business_documents').update({ due_date: expiry }).eq('id', doc.id)
        toast.success('Due date extracted and saved — review below')
        loadDocs()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanningId(null)
    }
  }

  function formatFieldLabel(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function formatFieldValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') {
      if (key.includes('amount') || key.includes('cost') || key.includes('premium') || key.includes('total')) {
        return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
      }
      return String(value)
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      try { return format(parseISO(value), 'd MMM yyyy') } catch { return value }
    }
    return String(value)
  }

  const filtered = filterCat === 'all' ? docs : docs.filter(d => d.category === filterCat)
  const overdue  = docs.filter(d => d.due_date && differenceInDays(parseISO(d.due_date), new Date()) < 0)
  const due28    = docs.filter(d => d.due_date && differenceInDays(parseISO(d.due_date), new Date()) >= 0 && differenceInDays(parseISO(d.due_date), new Date()) <= 28)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Business Documents</h1>
        <p className="text-slate-400 mt-1 text-sm">Store policies, invoices, permits and other important documents. Set due dates for reminders.</p>
      </div>

      {/* Alerts banner */}
      {(overdue.length > 0 || due28.length > 0) && (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              <AlertTriangle size={16} className="shrink-0" />
              <span><strong>{overdue.length}</strong> document{overdue.length > 1 ? 's are' : ' is'} overdue: {overdue.map(d => d.name).join(', ')}</span>
            </div>
          )}
          {due28.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
              <Calendar size={16} className="shrink-0" />
              <span><strong>{due28.length}</strong> document{due28.length > 1 ? 's' : ''} due in the next 28 days</span>
            </div>
          )}
        </div>
      )}

      {/* Upload card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader><CardTitle className="text-white text-base">Upload Document</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Select value={category} onValueChange={v => v && setCategory(v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-white">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Due / Expiry Date <span className="text-slate-500 font-normal">(optional)</span></Label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Reminder Note <span className="text-slate-500 font-normal">(optional)</span></Label>
            <Input
              value={reminderNote}
              onChange={e => setReminderNote(e.target.value)}
              placeholder="e.g. Renew before this date, Pay by EFT"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xlsx,.xls"
            />
            <Upload size={15} />
            {uploading ? 'Uploading…' : 'Choose File & Upload'}
          </label>
        </CardContent>
      </Card>

      {/* Filter + list */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-slate-400" />
            <CardTitle className="text-white text-base">Stored Documents</CardTitle>
          </div>
          <Select value={filterCat} onValueChange={v => v && setFilterCat(v)}>
            <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-white text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => {
                const badge = doc.due_date ? dueBadge(doc.due_date) : null
                return (
                  <div key={doc.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {catLabel(doc.category)} · {formatSize(doc.file_size)} · {format(parseISO(doc.uploaded_at), 'd MMM yyyy')}
                        </p>
                        {doc.reminder_note && (
                          <p className="text-slate-400 text-xs mt-0.5 italic">{doc.reminder_note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0 flex-wrap justify-end">
                      {badge && (
                        <Badge variant="outline" className={`text-xs border px-2 py-0 ${badge.cls}`}>
                          {badge.label}
                        </Badge>
                      )}
                      {SCANNABLE.includes(doc.category) && (
                        <Button
                          onClick={() => handleScan(doc)}
                          disabled={scanningId === doc.id}
                          variant="ghost"
                          size="sm"
                          className="text-violet-400 hover:text-violet-300 h-8 px-2 gap-1 text-xs"
                          title="Scan with AI"
                        >
                          {scanningId === doc.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Sparkles size={14} />
                          }
                          <span className="hidden sm:inline">{scanningId === doc.id ? 'Scanning…' : 'Scan'}</span>
                        </Button>
                      )}
                      <Button onClick={() => handleDownload(doc)} variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0">
                        <Download size={14} />
                      </Button>
                      <Button onClick={() => handleDelete(doc)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan result card */}
      {scanResult && (
        <div className="rounded-lg border border-green-700/50 bg-green-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <Sparkles size={15} />
              AI Scan Complete
            </div>
            <Button onClick={() => setScanResult(null)} variant="ghost" size="sm" className="text-slate-400 hover:text-white h-7 w-7 p-0">
              <X size={14} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {Object.entries(scanResult.data)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-slate-500 text-xs">{formatFieldLabel(key)}</span>
                  <span className="text-white text-sm">{formatFieldValue(key, value)}</span>
                </div>
              ))
            }
          </div>
          {Object.values(scanResult.data).every(v => v === null) && (
            <p className="text-slate-400 text-sm">No data could be extracted from this document.</p>
          )}
        </div>
      )}
    </div>
  )
}
