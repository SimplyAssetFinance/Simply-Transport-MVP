'use client'
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Trash2, ChevronDown, ChevronRight, Upload as UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { FuelImport } from '@/lib/types'

export function FuelImportCard() {
  const [imports,          setImports]          = useState<FuelImport[]>([])
  const [uploading,        setUploading]        = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [dragOver,         setDragOver]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadImports() }, [])

  async function loadImports() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb
      .from('fuel_imports')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(10)
    setImports((data as FuelImport[]) || [])
  }

  async function handleFile(file: File) {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch('/api/fuel/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Upload failed')
      } else {
        const skippedMsg = data.rows_skipped > 0 ? ` (${data.rows_skipped} duplicates skipped)` : ''
        toast.success(`Imported ${data.rows_imported} transactions${skippedMsg}`)
        loadImports()
      }
    } catch {
      toast.error('Upload failed — please try again')
    }
    setUploading(false)
  }

  async function deleteImport(id: string) {
    const sb = createClient()
    await sb.from('fuel_imports').delete().eq('id', id)
    setImports(prev => prev.filter(i => i.id !== id))
    toast.success('Import record removed')
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <UploadIcon size={18} className="text-blue-400" />
          Import Fuel Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-sm">
          Upload your fuel card transaction export (CSV) to track spend, savings, and top refuelling sites on your dashboard.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors ${
            uploading
              ? 'border-slate-700 cursor-default'
              : dragOver
              ? 'border-blue-500 bg-blue-500/5 cursor-pointer'
              : 'border-slate-700 hover:border-slate-600 cursor-pointer'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.CSV"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <Upload size={24} className="text-slate-600 mx-auto mb-2" />
          {uploading ? (
            <p className="text-slate-400 text-sm">Uploading and processing…</p>
          ) : (
            <>
              <p className="text-slate-300 text-sm font-medium">Drag & drop CSV file here</p>
              <p className="text-slate-500 text-xs mt-1">or click to browse</p>
            </>
          )}
        </div>

        <p className="text-slate-500 text-xs">
          Supported: Shell Card Online export format. BP Plus, Ampol and other providers coming soon.
        </p>

        {/* Shell export instructions */}
        <div>
          <button
            onClick={() => setShowInstructions(v => !v)}
            className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-colors"
          >
            {showInstructions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            How to export from Shell Card Online
          </button>
          {showInstructions && (
            <div className="mt-2 bg-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-1.5">
              <p>1. Log in to <span className="text-slate-300">Shell Card Online</span> (shellcardonline.shell.com.au)</p>
              <p>2. Go to <span className="text-slate-300">Reports › Transaction Report</span></p>
              <p>3. Select your date range (up to 3 months recommended)</p>
              <p>4. Choose format: <span className="text-slate-300">CSV</span></p>
              <p>5. Click <span className="text-slate-300">Download</span>, then upload the file above</p>
            </div>
          )}
        </div>

        {/* Import history */}
        {imports.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Previous Imports</p>
            <div className="space-y-1.5">
              {imports.map(imp => (
                <div key={imp.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-xs truncate">{imp.filename}</p>
                      <p className="text-slate-500 text-[11px]">
                        {new Date(imp.uploaded_at).toLocaleDateString('en-AU')}
                        {imp.row_count != null ? ` · ${imp.row_count} rows` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteImport(imp.id)}
                    className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors shrink-0 ml-2"
                    title="Remove import record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
