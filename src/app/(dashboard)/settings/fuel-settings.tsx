'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Fuel, Plus, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { FuelCard, FuelCardProvider } from '@/lib/types'
import { FUEL_CARD_OPTIONS, isShellCard, migrateFuelCards } from '@/lib/types'

type ModalState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; index: number }

type FormState = {
  provider:             FuelCardProvider
  discountCpl:          string  // non-Shell cards
  truckstopDiscountCpl: string  // Shell only
  nationalDiscountCpl:  string  // Shell only
}

const BLANK_FORM: FormState = {
  provider: 'Shell', discountCpl: '', truckstopDiscountCpl: '', nationalDiscountCpl: '',
}

export function FuelSettings() {
  const [cards,  setCards]  = useState<FuelCard[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [modal,  setModal]  = useState<ModalState>({ open: false })
  const [form,   setForm]   = useState<FormState>(BLANK_FORM)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb
        .from('user_fuel_settings')
        .select('fuel_cards')
        .eq('user_id', user.id)
        .maybeSingle()
      setCards(migrateFuelCards(data?.fuel_cards ?? []))
      setLoaded(true)
    }
    load()
  }, [])

  async function saveCards(next: FuelCard[]) {
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await sb
      .from('user_fuel_settings')
      .upsert({ user_id: user.id, fuel_cards: next, updated_at: new Date().toISOString() })
    if (error) toast.error('Failed to save')
    else { setCards(next); toast.success('Saved') }
    setSaving(false)
  }

  function openAdd() {
    const taken = cards.map(c => c.provider)
    const first = FUEL_CARD_OPTIONS.find(p => !taken.includes(p)) ?? 'Shell'
    setForm({ ...BLANK_FORM, provider: first })
    setModal({ open: true, mode: 'add' })
  }

  function openEdit(i: number) {
    const card = cards[i]
    if (isShellCard(card)) {
      setForm({
        provider:             card.provider,
        discountCpl:          '',
        truckstopDiscountCpl: String(card.truckstopDiscountCpl),
        nationalDiscountCpl:  String(card.nationalDiscountCpl),
      })
    } else {
      setForm({
        provider:             card.provider,
        discountCpl:          String(card.discountCpl),
        truckstopDiscountCpl: '',
        nationalDiscountCpl:  '',
      })
    }
    setModal({ open: true, mode: 'edit', index: i })
  }

  function handleSaveModal() {
    let card: FuelCard

    if (form.provider === 'Shell') {
      const ts  = parseFloat(form.truckstopDiscountCpl)
      const nat = parseFloat(form.nationalDiscountCpl)
      if (isNaN(ts) || ts <= 0 || ts > 50 || isNaN(nat) || nat <= 0 || nat > 50) {
        toast.error('Enter valid discounts (0.1–50 ¢/L) for both Shell tiers')
        return
      }
      card = { provider: 'Shell', truckstopDiscountCpl: ts, nationalDiscountCpl: nat }
    } else {
      const val = parseFloat(form.discountCpl)
      if (isNaN(val) || val <= 0 || val > 50) {
        toast.error('Enter a valid discount between 0.1 and 50 ¢/L')
        return
      }
      card = { provider: form.provider, discountCpl: val } as FuelCard
    }

    let next: FuelCard[]
    if (modal.open && modal.mode === 'edit') {
      next = cards.map((c, i) => i === modal.index ? card : c)
    } else {
      next = [...cards, card]
    }
    setModal({ open: false })
    saveCards(next)
  }

  const takenProviders = cards.map(c => c.provider)
  const availableProviders = FUEL_CARD_OPTIONS.filter(p =>
    !takenProviders.includes(p) ||
    (modal.open && modal.mode === 'edit' && cards[modal.index].provider === p)
  )

  if (!loaded) return null

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Fuel size={18} className="text-green-400" />
              Your Fuel Cards
            </CardTitle>
            <button
              onClick={openAdd}
              disabled={takenProviders.length >= FUEL_CARD_OPTIONS.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add Card
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">
            Add each fuel card with its negotiated ¢/L discount. The best available discount
            is automatically applied per site on the Live Prices map.
          </p>

          {cards.length === 0 ? (
            <div className="border border-dashed border-slate-700 rounded-lg px-4 py-6 text-center">
              <p className="text-slate-500 text-sm">No fuel cards added yet.</p>
              <button
                onClick={openAdd}
                className="mt-2 text-blue-400 text-sm hover:text-blue-300 underline"
              >
                Add your first card
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {cards.map((card, i) => (
                <li key={card.provider} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{card.provider}</p>
                    {isShellCard(card) ? (
                      <>
                        <p className="text-green-400 text-xs mt-0.5">Truckstop Network: −{card.truckstopDiscountCpl}¢/L</p>
                        <p className="text-green-400 text-xs">Other Shell sites: −{card.nationalDiscountCpl}¢/L</p>
                      </>
                    ) : (
                      <p className="text-green-400 text-xs mt-0.5">−{card.discountCpl}¢/L</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(i)}
                      className="text-slate-400 hover:text-white p-1.5 rounded transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => saveCards(cards.filter((_, idx) => idx !== i))}
                      disabled={saving}
                      className="text-slate-400 hover:text-red-400 p-1.5 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cards.length > 0 && (
            <p className="text-slate-600 text-xs mt-3">
              FleetCard and WEX Motorpass are accepted at all sites.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal({ open: false })} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <button
              onClick={() => setModal({ open: false })}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-white font-semibold text-base mb-5">
              {modal.mode === 'add' ? 'Add Fuel Card' : 'Edit Fuel Card'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Card Provider</label>
                <select
                  value={form.provider}
                  onChange={e => setForm(f => ({
                    ...f,
                    provider:             e.target.value as FuelCardProvider,
                    discountCpl:          '',
                    truckstopDiscountCpl: '',
                    nationalDiscountCpl:  '',
                  }))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableProviders.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {form.provider === 'Shell' ? (
                <>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1.5">
                      Truckstop Network Discount (¢/L)
                    </label>
                    <p className="text-slate-600 text-[11px] mb-1.5">259 National Truckstop Network sites</p>
                    <div className="relative">
                      <input
                        type="number" min="0.1" max="50" step="0.1"
                        value={form.truckstopDiscountCpl}
                        onChange={e => setForm(f => ({ ...f, truckstopDiscountCpl: e.target.value }))}
                        placeholder="e.g. 6.0"
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">¢/L</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1.5">
                      All Other Shell Sites (¢/L)
                    </label>
                    <p className="text-slate-600 text-[11px] mb-1.5">Shell, Viva, Liberty nationally</p>
                    <div className="relative">
                      <input
                        type="number" min="0.1" max="50" step="0.1"
                        value={form.nationalDiscountCpl}
                        onChange={e => setForm(f => ({ ...f, nationalDiscountCpl: e.target.value }))}
                        placeholder="e.g. 3.0"
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">¢/L</span>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-slate-400 text-xs block mb-1.5">Your Discount (¢/L)</label>
                  <div className="relative">
                    <input
                      type="number" min="0.1" max="50" step="0.1"
                      value={form.discountCpl}
                      onChange={e => setForm(f => ({ ...f, discountCpl: e.target.value }))}
                      placeholder="e.g. 4.5"
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">¢/L</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal({ open: false })}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Card' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
