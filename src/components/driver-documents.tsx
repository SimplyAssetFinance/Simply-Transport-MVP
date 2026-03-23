'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, Eye } from 'lucide-react'
import type { DriverDocument } from '@/lib/types'
import { format, parseISO } from 'date-fns'

const DOC_TYPES = [
  "Driver's License (front)",
  "Driver's License (back)",
  'Medical Certificate',
  'Training Certificate',
  'Dangerous Goods License',
  'Forklift License',
  'First Aid Certificate',
  'Employment Contract',
  'Induction Records',
  'Other',
]

interface Props {
  driverId: string
  userId:   string
}

export function DriverDocuments({ driverId, userId }: Props) {
  const [docs,       setDocs]       = useState<DriverDocument[]>([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [docType,    setDocType]    = useState(DOC_TYPES[0])
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const sb = createClient()
    const { data } = await sb
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('uploaded_at', { ascending: false })
    setDocs((data as DriverDocument[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [driverId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB')
      return
    }

    setUploading(true)
    const sb = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${driverId}/${Date.now()}.${ext}`

    const { error: uploadError } = await sb.storage
      .from('driver-documents')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await sb.from('driver_documents').insert({
      driver_id:     driverId,
      user_id:       userId,
      document_type: docType,
      file_name:     file.name,
      file_path:     path,
      file_size:     file.size,
      mime_type:     file.type,
    })

    if (dbError) {
      toast.error(dbError.message)
    } else {
      toast.success('Document uploaded')
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    }
    setUploading(false)
  }

  async function handleView(doc: DriverDocument) {
    const sb = createClient()
    const { data } = await sb.storage
      .from('driver-documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not open file')
  }

  async function handleDelete(doc: DriverDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    const sb = createClient()
    await sb.storage.from('driver-documents').remove([doc.file_path])
    await sb.from('driver_documents').delete().eq('id', doc.id)
    toast.success('Document deleted')
    await load()
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024)       return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>

  return (
    <div className="space-y-3">
      {docs.length === 0 && !showUpload && (
        <p className="text-slate-500 text-sm text-center py-4">No documents uploaded yet</p>
      )}

      {/* Document list */}
      {docs.map(doc => (
        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={18} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-slate-400 text-xs">
                {doc.document_type}
                {doc.file_size && ` · ${formatSize(doc.file_size)}`}
                {` · ${format(parseISO(doc.uploaded_at), 'd MMM yyyy')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <button onClick={() => handleView(doc)} className="p-1.5 text-slate-400 hover:text-white rounded" title="View">
              <Eye size={15} />
            </button>
            <button onClick={() => handleDelete(doc)} className="p-1.5 text-slate-400 hover:text-red-400 rounded" title="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

      {/* Upload form */}
      {showUpload && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3 bg-slate-800/50">
          <div className="space-y-1">
            <label className="text-slate-400 text-xs font-medium">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
            >
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              {uploading ? 'Uploading…' : 'Click to browse or drag & drop'}
            </p>
            <p className="text-slate-600 text-xs mt-1">PDF, JPG, PNG — max 10MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(false)}
            className="text-slate-400 hover:text-white"
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      )}

      {!showUpload && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(true)}
          className="w-full border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
        >
          <Upload size={14} /> Upload Document
        </Button>
      )}
    </div>
  )
}
