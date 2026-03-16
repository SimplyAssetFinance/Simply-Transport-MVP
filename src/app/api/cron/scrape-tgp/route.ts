import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for inserts
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Map Viva city names → our terminal names
const VIVA_TERMINAL_MAP: Record<string, string> = {
  'SYDNEY':     'Sydney (Silverwater)',
  'NEWCASTLE':  'Newcastle (Mayfield)',
  'BRISBANE':   'Brisbane (Pinkenba)',
  'MELBOURNE':  'Melbourne (Newport)',
  'ADELAIDE':   'Adelaide (Birkenhead)',
  'PERTH':      'Perth (Kwinana)',
  'DARWIN':     'Darwin',
}

// Map AIP location keys → our terminal names
const AIP_TERMINAL_MAP: Record<string, string> = {
  'sydney':     'Sydney (Silverwater)',
  'newcastle':  'Newcastle (Mayfield)',
  'brisbane':   'Brisbane (Pinkenba)',
  'melbourne':  'Melbourne (Newport)',
  'adelaide':   'Adelaide (Birkenhead)',
  'perth':      'Perth (Kwinana)',
  'darwin':     'Darwin',
}

// Scrape Shell Viva diesel prices
async function scrapeVivaEnergy(): Promise<Record<string, number>> {
  const res = await fetch('https://www.vivaenergy.com.au/quick-links/terminal-gate-pricing', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimplyTransport/1.0)' },
    next: { revalidate: 0 },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  const prices: Record<string, number> = {}

  // Find header row to locate Diesel column index
  const headers: string[] = []
  $('table.tgp-table tr.tgp-row').first().find('th.tgp-header').each((_, el) => {
    headers.push($(el).text().replace(/\s+/g, ' ').trim())
  })
  const dieselIdx = headers.findIndex(h => h.toLowerCase().includes('diesel') && !h.toLowerCase().includes('bio'))

  if (dieselIdx === -1) return prices

  let currentState = ''
  $('table.tgp-table tr.tgp-row').slice(1).each((_, row) => {
    const cells = $(row).find('td.tgp-col')
    const state = $(cells[0]).text().trim()
    const city  = $(cells[1]).text().trim().toUpperCase()
    const price = $(cells[dieselIdx]).text().trim()

    if (state) currentState = state
    if (!city || !price || price === '--') return

    const terminal = VIVA_TERMINAL_MAP[city]
    if (!terminal) return

    const num = parseFloat(price)
    if (!isNaN(num)) prices[terminal] = num
  })

  return prices
}

// Fetch AIP diesel prices (BP + Ampol via market aggregate)
async function scrapeAIP(): Promise<Record<string, { bp: number | null; ampol: number | null }>> {
  const res = await fetch(
    'https://www.aip.com.au/aip-api-request?api-path=public/api&call=tgpTables&location=',
    { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, next: { revalidate: 0 } }
  )
  const data = await res.json()

  const result: Record<string, { bp: number | null; ampol: number | null }> = {}

  // AIP returns e.g. sydneyDiesel: { 0: {...}, 1: {...}, ... }
  // Each entry has a fuelPrice. We use entries 0 and 1 as BP and Ampol approximations
  // (AIP lists major retailers; indices represent different providers)
  for (const [key, val] of Object.entries(data)) {
    if (!key.toLowerCase().includes('diesel')) continue

    const locKey = key.replace(/diesel$/i, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase().replace(/\s+/g, '')
    const terminal = AIP_TERMINAL_MAP[locKey]
    if (!terminal) continue

    const entries = Object.values(val as Record<string, { fuelPrice: string }>)
    const prices = entries.map(e => parseFloat(e.fuelPrice)).filter(n => !isNaN(n))

    if (!result[terminal]) result[terminal] = { bp: null, ampol: null }

    // Use first two provider entries as BP and Ampol estimates
    if (prices[0]) result[terminal].bp     = +prices[0].toFixed(2)
    if (prices[1]) result[terminal].ampol  = +prices[1].toFixed(2)
  }

  return result
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const [vivaData, aipData] = await Promise.all([
      scrapeVivaEnergy(),
      scrapeAIP(),
    ])

    const terminals = [...new Set([...Object.keys(vivaData), ...Object.keys(aipData)])]
    const rows = []

    for (const terminal of terminals) {
      const shell = vivaData[terminal] ?? null
      const bp    = aipData[terminal]?.bp ?? null
      const ampol = aipData[terminal]?.ampol ?? null

      const prices: Record<string, number> = {}
      if (shell) prices['Shell Viva'] = shell
      if (bp)    prices['BP']         = bp
      if (ampol) prices['Ampol']      = ampol

      const vals = Object.values(prices)
      if (vals.length === 0) continue

      const minPrice = Math.min(...vals)
      const maxPrice = Math.max(...vals)
      const cheapest = Object.entries(prices).find(([, v]) => v === minPrice)?.[0] ?? null

      rows.push({
        date: today,
        terminal,
        shell_viva: shell,
        bp,
        ampol,
        cheapest_provider: cheapest,
        spread: vals.length > 1 ? +(maxPrice - minPrice).toFixed(2) : 0,
      })
    }

    const sb = getAdminClient()
    const { error } = await sb
      .from('tgp_prices')
      .upsert(rows, { onConflict: 'date,terminal' })

    if (error) throw error

    return NextResponse.json({ ok: true, date: today, terminals: rows.length, rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
