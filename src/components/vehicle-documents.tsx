'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, Download, Sparkles, X, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CATEGORIES = [
  { value: 'rego',           label: 'Registration' },
  { value: 'insurance',      label: 'Insurance Certificate' },
  { value: 'service_record', label: 'Service Record' },
  { value: 'invoice',        label: 'Invoice' },
  { value: 'other',          label: 'Other' },
]

const SCANNABLE = ['rego', 'insurance']

interface Doc {
  id: string
  name: string
  category: string
  file_path: string
  file_size: number | null
  uploaded_at: string
}

interface ScanResult {
  docId: string
  category: string
  data: Record<string, unknown>
}

interface VehicleDocumentsProps {
  vehicleId: string
  userId: string
  onScanResult?: (category: string, data: Record<string, unknown>) => void
}

export default function VehicleDocuments({ vehicleId, userId, onScanResult }: VehicleDocumentsProps) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [category, setCategory] = useState('rego')
  const [uploading, setUploading] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  async function loadDocs() {
    const { data } = await sb
      .from('vehicle_documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('uploaded_at', { ascending: false })
    setDocs((data as Doc[]) || [])
  }

  useEffect(() => { loadDocs() }, [vehicleId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const path = `${userId}/${vehicleId}/${Date.now()}_${file.name}`

    const { error: uploadErr } = await sb.storage.from('vehicle-files').upload(path, file)
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return }

    const { error: dbErr } = await sb.from('vehicle_documents').insert({
      vehicle_id: vehicleId,
      user_id: userId,
      name: file.name,
      category,
      file_path: path,
      file_size: file.size,
    })
    if (dbErr) { toast.error(dbErr.message); setUploading(false); return }

    toast.success('Document uploaded')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    loadDocs()
  }

  async function handleDownload(doc: Doc) {
    const { data, error } = await sb.storage.from('vehicle-files').createSignedUrl(doc.file_path, 60)
    if (error || !data) { toast.error('Could not generate download link'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await sb.storage.from('vehicle-files').remove([doc.file_path])
    await sb.from('vehicle_documents').delete().eq('id', doc.id)
    toast.success('Document deleted')
    loadDocs()
  }

  async function handleScan(doc: Doc) {
    setScanningId(doc.id)
    setScanResult(null)
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.file_path, category: doc.category }),
      })
      const json = await res.json() as { ok?: boolean; category?: string; extracted?: Record<string, unknown>; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Scan failed')
        return
      }
      setScanResult({ docId: doc.id, category: doc.category, data: json.extracted ?? {} })
      if (onScanResult && json.extracted) {
        onScanResult(doc.category, json.extracted)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanningId(null)
    }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatFieldLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function formatFieldValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') {
      if (key.includes('cost') || key.includes('amount') || key.includes('premium')) {
        return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
      }
      return String(value)
    }
    if (typeof value === 'string') {
      // Try to parse as date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        try {
          return format(parseISO(value), 'd MMM yyyy')
        } catch {
          return value
        }
      }
      return value
    }
    return String(value)
  }

  const catLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label ?? val

  return (
    <div className="space-y-4">
      {/* Upload row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={category} onValueChange={v => v && setCategory(v)}>
          <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-white">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:text-white text-sm transition-colors ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-slate-500'}`}>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx" />
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload File'}
        </label>
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-slate-500 text-xs">
                    {catLabel(doc.category)} · {formatSize(doc.file_size)} · {format(parseISO(doc.uploaded_at), 'd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
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
          ))}
        </div>
      )}

      {/* Scan result card */}
      {scanResult && (
        <div className="rounded-lg border border-green-700/50 bg-green-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <Sparkles size={15} />
              Scan complete — {catLabel(scanResult.category)}
            </div>
            <Button
              onClick={() => setScanResult(null)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white h-7 w-7 p-0"
            >
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
