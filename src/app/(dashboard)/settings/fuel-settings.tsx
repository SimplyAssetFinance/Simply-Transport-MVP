'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Fuel } from 'lucide-react'
import { toast } from 'sonner'

export function FuelSettings() {
  const [discount, setDiscount] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data } = await sb
        .from('user_fuel_settings')
        .select('fuel_discount_cpl')
        .eq('user_id', user.id)
        .maybeSingle()

      setDiscount(data?.fuel_discount_cpl != null ? String(data.fuel_discount_cpl) : '')
      setLoaded(true)
    }
    load()
  }, [])

  async function handleSave() {
    const val = parseFloat(discount)
    if (isNaN(val) || val < 0 || val > 50) {
      toast.error('Enter a valid discount between 0 and 50 ¢/L')
      return
    }

    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await sb
      .from('user_fuel_settings')
      .upsert({ user_id: user.id, fuel_discount_cpl: val, updated_at: new Date().toISOString() })

    if (error) {
      toast.error('Failed to save discount')
    } else {
      toast.success('Fuel discount saved')
    }
    setSaving(false)
  }

  if (!loaded) return null

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Fuel size={18} className="text-green-400" />
          Fuel Discount
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-sm">
          Enter your negotiated discount off the pump price (cents per litre).
          This will show your net price on the Live Prices map.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="e.g. 3.5"
              className="w-32 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              ¢/L
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {discount && (
            <span className="text-slate-400 text-sm">
              Board price − {discount}¢ = your net cost
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
