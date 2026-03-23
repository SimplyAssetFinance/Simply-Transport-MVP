import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Minimal CSV parser — handles quoted fields
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return lines.map(line => {
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim().replace(/^"|"$/g, ''))
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim().replace(/^"|"$/g, ''))
    return cols
  })
}

// Parse DD/MM/YYYY or YYYY-MM-DD → YYYY-MM-DD
function parseDate(raw: string): string | null {
  const ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[$,\s]/g, '')) || 0
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) return NextResponse.json({ error: 'No transactions found in file' }, { status: 400 })

  // Normalise header names for column detection
  const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

  function col(...terms: string[]): number {
    for (const term of terms) {
      const i = header.findIndex(h => h.includes(term))
      if (i !== -1) return i
    }
    return -1
  }

  const iDate    = col('transaction_date', 'trans_date', 'date')
  const iCard    = col('card_number', 'card_no', 'card')
  const iDriver  = col('driver_name', 'driver')
  const iRego    = col('vehicle_rego', 'rego', 'vehicle')
  const iSite    = col('site_name', 'site', 'station')
  const iAddr    = col('site_address', 'address')
  const iProduct = col('product', 'fuel_type', 'type')
  const iQty     = col('quantity', 'litres', 'qty', 'volume')
  const iPrice   = col('unit_price', 'price_cpl', 'price')
  const iTotal   = col('total', 'amount', 'cost')
  const iGST     = col('gst')

  if (iDate === -1 || iQty === -1 || iTotal === -1 || iSite === -1) {
    return NextResponse.json({
      error: 'Missing required columns. Expected: Transaction Date, Site Name, Quantity (L), Total ($)',
    }, { status: 400 })
  }

  // Create the import record first
  const { data: importRecord, error: importError } = await supabase
    .from('fuel_imports')
    .insert({
      user_id:   user.id,
      filename:  file.name,
      provider:  'shell',
      status:    'complete',
      row_count: rows.length - 1,
    })
    .select('id')
    .single()

  if (importError || !importRecord) {
    return NextResponse.json({ error: 'Failed to create import record' }, { status: 500 })
  }

  const transactions: object[] = []
  let skipped = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 3) continue

    const dateStr = parseDate(row[iDate] ?? '')
    if (!dateStr) { skipped++; continue }

    const qty   = parseAmount(row[iQty]   ?? '0')
    const total = parseAmount(row[iTotal] ?? '0')
    const site  = iSite !== -1 ? (row[iSite] ?? '').trim() : ''

    if (!qty || !total || !site) { skipped++; continue }

    transactions.push({
      user_id:          user.id,
      import_id:        importRecord.id,
      transaction_date: dateStr,
      card_number:      iCard !== -1 ? (row[iCard] ?? '').trim() : '',
      driver_name:      iDriver !== -1 ? row[iDriver] || null : null,
      vehicle_rego:     iRego !== -1 ? row[iRego] || null : null,
      site_name:        site,
      site_address:     iAddr !== -1 ? row[iAddr] || null : null,
      product:          iProduct !== -1 ? row[iProduct] || 'Diesel' : 'Diesel',
      quantity_litres:  qty,
      unit_price_cpl:   iPrice !== -1 ? parseAmount(row[iPrice] ?? '0') : 0,
      total_aud:        total,
      gst_aud:          iGST !== -1 ? parseAmount(row[iGST] ?? '0') || null : null,
    })
  }

  if (transactions.length === 0) {
    return NextResponse.json({ error: 'No valid transactions found — check the file format' }, { status: 400 })
  }

  // Upsert — ignore rows that conflict on the unique dedup index
  const { error: txError } = await supabase
    .from('fuel_transactions')
    .upsert(transactions, {
      onConflict:       'user_id,transaction_date,card_number,site_name,total_aud',
      ignoreDuplicates: true,
    })

  if (txError) {
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
  }

  return NextResponse.json({
    import_id:     importRecord.id,
    rows_imported: transactions.length,
    rows_skipped:  skipped,
  })
}
