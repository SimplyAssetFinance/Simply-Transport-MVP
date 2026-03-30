'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface Props {
  entityType:    'vehicle' | 'driver'
  entityId:      string
  entityName:    string
  complianceType: string   // 'rego' | 'insurance' | 'service' for vehicle; item_type for driver
  itemId?:       string    // required for driver compliance items
  currentExpiry: string | null
  onSuccess?:    () => void
}

const TYPE_LABELS: Record<string, string> = {
  rego:      'Registration',
  insurance: 'Insurance',
  service:   'Service',
}

export function RenewComplianceButton({
  entityType, entityId, entityName, complianceType, itemId, currentExpiry, onSuccess,
}: Props) {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [newExpiry, setNewExpiry] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const typeLabel = TYPE_LABELS[complianceType] ?? complianceType

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setNewExpiry('')
    setRefNumber('')
    setNotes('')
  }

  async function handleSubmit() {
    if (!newExpiry) { toast.error('New expiry date is required'); return }
    setSaving(true)

    const res = await fetch('/api/compliance/renew', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        entityType,
        entityId,
        entityName,
        complianceType,
        itemId,
        oldExpiry:       currentExpiry,
        newExpiry,
        referenceNumber: refNumber.trim() || undefined,
        notes:           notes.trim()     || undefined,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error || 'Failed to renew')
      return
    }

    toast.success(`${typeLabel} renewed successfully`)
    handleClose()
    if (onSuccess) onSuccess()
    else router.refresh()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 text-slate-400 hover:text-blue-400 rounded transition-colors"
        title={`Renew ${typeLabel}`}
      >
        <RotateCcw size={13} />
      </button>

      <Dialog open={open} onOpenChange={open => { if (!open) handleClose() }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Renew {typeLabel}</DialogTitle>
            <DialogDescription className="text-slate-400">{entityName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {currentExpiry && (
              <p className="text-sm text-slate-400">
                Current expiry:{' '}
                <span className="text-slate-300 font-medium">
                  {format(parseISO(currentExpiry), 'd MMM yyyy')}
                </span>
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">
                New Expiry Date <span className="text-red-400">*</span>
              </Label>
              <Input
                type="date"
                value={newExpiry}
                onChange={e => setNewExpiry(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Reference / Receipt Number</Label>
              <Input
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                placeholder="Optional"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !newExpiry}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving…' : 'Confirm Renewal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
