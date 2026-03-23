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
      .select('transaction_date, quantity_litres, total_aud, site_name')
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
    quantity_litres: number
    total_aud: number
    site_name: string
  }[]

  // Summary metrics
  const totalSpend  = transactions.reduce((s, t) => s + Number(t.total_aud), 0)
  const totalLitres = transactions.reduce((s, t) => s + Number(t.quantity_litres), 0)
  const avgPriceCpl = totalLitres > 0 ? (totalSpend / totalLitres) * 100 : 0

  // Savings from the first configured fuel card
  const cards = migrateFuelCards(settingsData?.fuel_cards ?? [])
  let discountCpl   = 0
  let discountLabel = ''
  if (cards.length > 0) {
    const card = cards[0]
    if (isShellCard(card)) {
      discountCpl   = card.truckstopDiscountCpl
      discountLabel = `Shell Truckstop Discount (−${discountCpl}¢/L)`
    } else {
      discountCpl   = card.discountCpl
      discountLabel = `${card.provider} Discount (−${discountCpl}¢/L)`
    }
  }
  const savingsAud = totalLitres * (discountCpl / 100)

  // Weekly chart buckets (start of ISO week = Monday)
  function weekStart(dateStr: string): string {
    const d   = new Date(dateStr)
    const dow = d.getDay() // 0 = Sun
    const diff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    return mon.toISOString().split('T')[0]
  }

  const bucketMap: Record<string, number> = {}
  for (const t of transactions) {
    const key = days <= 30 ? t.transaction_date : weekStart(t.transaction_date)
    bucketMap[key] = (bucketMap[key] ?? 0) + Number(t.total_aud)
  }
  const chartBuckets = Object.entries(bucketMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, spend_aud]) => ({ period, spend_aud: Math.round(spend_aud * 100) / 100 }))

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
    total_litres:      Math.round(totalLitres * 10)  / 10,
    avg_price_cpl:     Math.round(avgPriceCpl * 10)  / 10,
    transaction_count: transactions.length,
    savings_aud:       Math.round(savingsAud  * 100) / 100,
    discount_label:    discountLabel,
    chart_buckets:     chartBuckets,
    top_sites:         topSites,
  })
}
