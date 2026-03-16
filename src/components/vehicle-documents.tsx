'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, Download } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CATEGORIES = [
  { value: 'rego',           label: 'Registration' },
  { value: 'insurance',      label: 'Insurance Certificate' },
  { value: 'service_record', label: 'Service Record' },
  { value: 'invoice',        label: 'Invoice' },
  { value: 'other',          label: 'Other' },
]

interface Doc {
  id: string
  name: string
  category: string
  file_path: string
  file_size: number | null
  uploaded_at: string
}

export default function VehicleDocuments({ vehicleId, userId }: { vehicleId: string; userId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [category, setCategory] = useState('rego')
  const [uploading, setUploading] = useState(false)
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

    const ext = file.name.split('.').pop()
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

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    </div>
  )
}
