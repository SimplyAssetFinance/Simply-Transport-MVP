import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for inserts
function getAdminClient() {
  return createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Terminal name maps ────────────────────────────────────────────────────────

const VIVA_TERMINAL_MAP: Record<string, string> = {
  'SYDNEY':     'Sydney (Silverwater)',
  'NEWCASTLE':  'Newcastle (Mayfield)',
  'BRISBANE':   'Brisbane (Pinkenba)',
  'MELBOURNE':  'Melbourne (Newport)',
  'ADELAIDE':   'Adelaide (Birkenhead)',
  'PERTH':      'Perth (Kwinana)',
  'DARWIN':     'Darwin',
}

// AIP returns a market average (not per-retailer); keyed by camelCase location
const AIP_TERMINAL_MAP: Record<string, string> = {
  'sydney':     'Sydney (Silverwater)',
  'newcastle':  'Newcastle (Mayfield)',
  'brisbane':   'Brisbane (Pinkenba)',
  'melbourne':  'Melbourne (Newport)',
  'adelaide':   'Adelaide (Birkenhead)',
  'perth':      'Perth (Kwinana)',
  'darwin':     'Darwin',
}

// Ampol PDF uses city name + asterisks; Kwinana = Perth terminal
const AMPOL_TERMINAL_MAP: Record<string, string> = {
  'sydney':     'Sydney (Silverwater)',
  'newcastle':  'Newcastle (Mayfield)',
  'brisbane':   'Brisbane (Pinkenba)',
  'melbourne':  'Melbourne (Newport)',
  'adelaide':   'Adelaide (Birkenhead)',
  'kwinana':    'Perth (Kwinana)',
  'darwin':     'Darwin',
}

const IOR_LOCATION_MAP: Record<string, string> = {
  'sydney':    'Sydney (Silverwater)',
  'newcastle': 'Newcastle (Mayfield)',
  'brisbane':  'Brisbane (Pinkenba)',
  'melbourne': 'Melbourne (Newport)',
  'adelaide':  'Adelaide (Birkenhead)',
  'perth':     'Perth (Kwinana)',
  'darwin':    'Darwin',
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

// Scrape Shell Viva diesel prices
async function scrapeVivaEnergy(): Promise<Record<string, number>> {
  const res = await fetch('https://www.vivaenergy.com.au/quick-links/terminal-gate-pricing', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
    },
    next: { revalidate: 0 },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  const prices: Record<string, number> = {}

  const headers: string[] = []
  $('table.tgp-table tr.tgp-row').first().find('th.tgp-header').each((_, el) => {
    headers.push($(el).text().replace(/\s+/g, ' ').trim())
  })
  const dieselIdx = headers.findIndex(h => h.toLowerCase().includes('diesel') && !h.toLowerCase().includes('bio'))

  if (dieselIdx === -1) return prices

  $('table.tgp-table tr.tgp-row').slice(1).each((_, row) => {
    const cells = $(row).find('td.tgp-col')
    const city  = $(cells[1]).text().trim().toUpperCase()
    const price = $(cells[dieselIdx]).text().trim()

    if (!city || !price || price === '--') return
    const terminal = VIVA_TERMINAL_MAP[city]
    if (!terminal) return

    const num = parseFloat(price)
    if (!isNaN(num)) prices[terminal] = num
  })

  return prices
}

// Fetch AIP diesel market average — index '0' is today's price
async function scrapeAIP(): Promise<Record<string, number>> {
  const res = await fetch(
    'https://www.aip.com.au/aip-api-request?api-path=public/api&call=tgpTables&location=',
    { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, next: { revalidate: 0 } }
  )
  const data = await res.json()

  const result: Record<string, number> = {}

  for (const [key, val] of Object.entries(data)) {
    if (!key.toLowerCase().includes('diesel')) continue

    const locKey = key
      .replace(/diesel$/i, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')

    const terminal = AIP_TERMINAL_MAP[locKey]
    if (!terminal) continue

    // Index '0' is the most recent entry (today's market average)
    const entry = (val as Record<string, { fuelPrice: string }>)['0']
    if (!entry) continue

    const price = parseFloat(entry.fuelPrice)
    if (!isNaN(price)) result[terminal] = +price.toFixed(2)
  }

  return result
}

// Scrape Ampol diesel TGP from their daily PDF price advice
// PDF columns: E10 | ULP91 | PULP95 | SPULP98 | DIESEL — each with Previous + Current
// The last number on each location row is Diesel-Current (today's Ampol TGP)
async function scrapeAmpol(): Promise<Record<string, number>> {
  // Discover the current PDF URL from the Ampol pricing page (URL may rotate daily)
  let pdfUrl = 'https://assets.contentstack.io/v3/assets/blt35cb056c1c8431c3/bltbb6f9915e2ec22d2/Ampol_Terminal_Gate_Prices1.pdf'
  try {
    const pageRes = await fetch('https://www.ampol.com.au/business/pricing', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const m = html.match(
        /https:\/\/assets\.contentstack\.io[^\s"'<>]+Ampol_Terminal_Gate_Prices[^\s"'<>]*\.pdf/i
      )
      if (m) pdfUrl = m[0]
    }
  } catch { /* fall back to known URL */ }

  const res = await fetch(pdfUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimplyTransport/1.0)' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return {}

  const buffer = Buffer.from(await res.arrayBuffer())
  // Use lib path to skip pdf-parse's own test-file read on require
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
  const { text } = await pdfParse(buffer)

  const prices: Record<string, number> = {}

  for (const line of text.split('\n')) {
    const lower = line.toLowerCase().trim()
    if (!lower) continue
    for (const [loc, terminal] of Object.entries(AMPOL_TERMINAL_MAP)) {
      if (lower.includes(loc)) {
        // Extract all prices in TGP range; last is Diesel-Current (rightmost column)
        const nums = [...line.matchAll(/(\d{3,4}\.\d{2})/g)]
          .map(m => parseFloat(m[1]))
          .filter(p => p >= 200 && p <= 500)
        if (nums.length > 0 && !prices[terminal]) {
          prices[terminal] = nums[nums.length - 1]
        }
        break
      }
    }
  }

  return prices
}

async function scrapeIOR(): Promise<Record<string, number>> {
  const res = await fetch('https://customer.ior.com.au/TerminalGatePrices/CurrentTgpFile', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimplyTransport/1.0)' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return {}

  const buffer = Buffer.from(await res.arrayBuffer())
  // Use lib path to skip pdf-parse's own test-file read on require
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
  const { text } = await pdfParse(buffer)

  const prices: Record<string, number> = {}

  for (const line of text.split('\n')) {
    const lower = line.toLowerCase().trim()
    if (!lower) continue
    for (const [loc, terminal] of Object.entries(IOR_LOCATION_MAP)) {
      if (lower.includes(loc)) {
        const matches = [...line.matchAll(/(\d{3,4}\.\d{2})/g)].map(m => parseFloat(m[1]))
        const diesel = matches.find(p => p >= 200 && p <= 500)
        if (diesel !== undefined && !prices[terminal]) prices[terminal] = diesel
        break
      }
    }
  }

  return prices
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const [vivaData, aipData, ampolData, iorData] = await Promise.all([
      scrapeVivaEnergy(),
      scrapeAIP(),
      scrapeAmpol(),
      scrapeIOR(),
    ])

    const terminals = [...new Set([
      ...Object.keys(vivaData),
      ...Object.keys(aipData),
      ...Object.keys(ampolData),
      ...Object.keys(iorData),
    ])]

    const rows = []

    for (const terminal of terminals) {
      const shell = vivaData[terminal]  ?? null
      const bp    = aipData[terminal]   ?? null  // AIP market average (best available BP proxy)
      const ampol = ampolData[terminal] ?? null  // Direct from Ampol daily PDF
      const ior   = iorData[terminal]   ?? null

      const prices: Record<string, number> = {}
      if (shell) prices['Shell Viva'] = shell
      if (bp)    prices['BP']         = bp
      if (ampol) prices['Ampol']      = ampol
      if (ior)   prices['IOR']        = ior

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
        ior,
        cheapest_provider: cheapest,
        spread: vals.length > 1 ? +(maxPrice - minPrice).toFixed(2) : 0,
      })
    }

    const sb = getAdminClient()
    const { error } = await sb
      .from('tgp_prices')
      .upsert(rows, { onConflict: 'date,terminal' })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      date: today,
      terminals: rows.length,
      sources: {
        viva:  Object.keys(vivaData).length,
        aip:   Object.keys(aipData).length,
        ampol: Object.keys(ampolData).length,
        ior:   Object.keys(iorData).length,
      },
      rows,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
