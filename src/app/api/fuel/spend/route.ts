import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migrateFuelCards, isShellCard } from '@/lib/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '90'), 365)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const [{ data: txData }, { data: settingsData }] = await Promise.all([
    supabase
      .from('fuel_transactions')
      .select('transaction_date, quantity_litres, total_aud, site_name, unit_price_cpl')
      .eq('user_id', user.id)
      .gte('transaction_date', sinceStr)
      .order('transaction_date', { ascending: true }),
    supabase
      .from('user_fuel_settings')
      .select('fuel_cards')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const transactions = (txData ?? []) as {
    transaction_date: string
    quantity_litres:  number
    total_aud:        number
    site_name:        string
    unit_price_cpl:   number
  }[]

  // Summary metrics
  const totalSpend  = transactions.reduce((s, t) => s + Number(t.total_aud), 0)
  const totalLitres = transactions.reduce((s, t) => s + Number(t.quantity_litres), 0)
  const avgPriceCpl = totalLitres > 0 ? (totalSpend / totalLitres) * 100 : 0

  // Site-dependent savings: derive from per-transaction pump price vs card price.
  // unit_price_cpl is the pump price in ¢/L; total_aud is what the card was charged.
  // pump_total = qty × unit_price_cpl / 100; savings = pump_total − card_total.
  const hasPumpData = transactions.some(t => Number(t.unit_price_cpl) > 0)
  const pumpSpend   = hasPumpData
    ? transactions.reduce((s, t) => {
        const cpl = Number(t.unit_price_cpl)
        return s + (cpl > 0 ? Number(t.quantity_litres) * (cpl / 100) : Number(t.total_aud))
      }, 0)
    : 0

  // Fall back to card-settings discount for older imports without pump price data
  const cards = migrateFuelCards(settingsData?.fuel_cards ?? [])
  let fallbackDiscountCpl = 0
  if (!hasPumpData && cards.length > 0) {
    const card = cards[0]
    fallbackDiscountCpl = isShellCard(card) ? card.truckstopDiscountCpl : card.discountCpl
  }

  const savingsAud    = hasPumpData
    ? Math.max(0, pumpSpend - totalSpend)
    : totalLitres * (fallbackDiscountCpl / 100)
  const discountLabel = hasPumpData
    ? 'vs pump price (site-weighted)'
    : fallbackDiscountCpl > 0
      ? `card discount (−${fallbackDiscountCpl}¢/L)`
      : ''

  // Weekly chart buckets (start of ISO week = Monday)
  function weekStart(dateStr: string): string {
    const d   = new Date(dateStr)
    const dow = d.getDay() // 0 = Sun
    const diff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    return mon.toISOString().split('T')[0]
  }

  const bucketMap: Record<string, { spend: number; pump: number }> = {}
  for (const t of transactions) {
    const key     = days <= 30 ? t.transaction_date : weekStart(t.transaction_date)
    const cpl     = Number(t.unit_price_cpl)
    const pumpAmt = cpl > 0 ? Number(t.quantity_litres) * (cpl / 100) : Number(t.total_aud)
    const existing = bucketMap[key] ?? { spend: 0, pump: 0 }
    bucketMap[key] = {
      spend: existing.spend + Number(t.total_aud),
      pump:  existing.pump  + pumpAmt,
    }
  }
  const chartBuckets = Object.entries(bucketMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { spend, pump }]) => ({
      period,
      spend_aud: Math.round(spend * 100) / 100,
      pump_aud:  Math.round(pump  * 100) / 100,
    }))

  // Top 5 sites by spend
  const siteMap: Record<string, { total_spend: number; visit_count: number; total_litres: number }> = {}
  for (const t of transactions) {
    const s = siteMap[t.site_name] ?? { total_spend: 0, visit_count: 0, total_litres: 0 }
    s.total_spend  += Number(t.total_aud)
    s.visit_count  += 1
    s.total_litres += Number(t.quantity_litres)
    siteMap[t.site_name] = s
  }
  const topSites = Object.entries(siteMap)
    .map(([site_name, d]) => ({ site_name, ...d }))
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 5)
    .map(s => ({
      site_name:    s.site_name,
      total_spend:  Math.round(s.total_spend  * 100) / 100,
      visit_count:  s.visit_count,
      total_litres: Math.round(s.total_litres * 10)  / 10,
    }))

  return NextResponse.json({
    period_days:       days,
    total_spend_aud:   Math.round(totalSpend  * 100) / 100,
    pump_spend_aud:    Math.round(pumpSpend   * 100) / 100,
    total_litres:      Math.round(totalLitres * 10)  / 10,
    avg_price_cpl:     Math.round(avgPriceCpl * 10)  / 10,
    transaction_count: transactions.length,
    savings_aud:       Math.round(savingsAud  * 100) / 100,
    discount_label:    discountLabel,
    has_pump_data:     hasPumpData,
    chart_buckets:     chartBuckets,
    top_sites:         topSites,
  })
}
