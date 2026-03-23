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

// Parse DD/MM/YYYY, YYYY-MM-DD, or ISO 8601 with timezone → YYYY-MM-DD
function parseDate(raw: string): string | null {
  const ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`
  // ISO 8601 with or without time/timezone — take date portion only
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  return null
}

const FUEL_PRODUCTS = /diesel|petrol|unleaded|e10|lpg|adblue|vpower|v-power/i
// GST-free items (bottled water, certain foods) — excluded from other charges tile
const GST_FREE     = /gst.free|gst free/i

function isFuelProduct(product: string): boolean {
  return FUEL_PRODUCTS.test(product)
}

function isGstFree(product: string): boolean {
  return GST_FREE.test(product)
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
  const iSite    = col('site_name', 'site', 'outlet', 'station')
  const iAddr    = col('site_address', 'address')
  const iProduct = col('product', 'fuel_type', 'type')
  const iQty     = col('quantity', 'litres', 'qty', 'volume')
  // pumpPrice column ($/L) — multiply × 100 to convert to ¢/L for storage
  const iPrice   = col('pumpprice', 'unit_price', 'price_cpl', 'price')
  // Shell Card actual charge (after discount) — preferred for total_aud
  const iCardAmt = col('incgst')
  // Pump price total (before discount) — fallback when no card amount
  const iTotal   = col('docketamount', 'docket', 'total', 'amount', 'cost')
  const iGST     = col('gst')

  if (iDate === -1 || iQty === -1 || (iCardAmt === -1 && iTotal === -1) || iSite === -1) {
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

  const transactions:   object[] = []
  const otherCharges:   object[] = []
  let skipped = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 3) continue

    const dateStr = parseDate(row[iDate] ?? '')
    if (!dateStr) { skipped++; continue }

    const product   = iProduct !== -1 ? (row[iProduct] ?? '').trim() : ''
    // Prefer Shell card amount (actual charge after discount); fall back to docket total
    const cardAmt   = iCardAmt !== -1 ? parseAmount(row[iCardAmt] ?? '0') : 0
    const pumpTotal = iTotal   !== -1 ? parseAmount(row[iTotal]   ?? '0') : 0
    const totalAud  = cardAmt > 0 ? cardAmt : pumpTotal
    const gstAud    = iGST !== -1 ? parseAmount(row[iGST] ?? '0') || null : null
    const cardNo    = iCard !== -1 ? (row[iCard] ?? '').trim() : ''

    if (isFuelProduct(product)) {
      const qty  = parseAmount(row[iQty] ?? '0')
      const site = iSite !== -1 ? (row[iSite] ?? '').trim() : ''
      if (!qty || !totalAud || !site) { skipped++; continue }

      transactions.push({
        user_id:          user.id,
        import_id:        importRecord.id,
        transaction_date: dateStr,
        card_number:      cardNo,
        driver_name:      iDriver !== -1 ? row[iDriver] || null : null,
        vehicle_rego:     iRego   !== -1 ? row[iRego]   || null : null,
        site_name:        site,
        site_address:     iAddr   !== -1 ? row[iAddr]   || null : null,
        product:          product || 'Diesel',
        quantity_litres:  qty,
        // Unit pump price in ¢/L (pumpPrice column is $/L → × 100)
        unit_price_cpl:   iPrice !== -1 ? parseAmount(row[iPrice] ?? '0') * 100 : 0,
        // Column L: board price total incl GST (docketAmount) — used for savings comparison
        pump_total_aud:   pumpTotal > 0 ? pumpTotal : null,
        total_aud:        totalAud,
        gst_aud:          gstAud,
      })
    } else if (!isGstFree(product) && totalAud > 0 && product) {
      // Non-fuel, taxable charges: admin fees, groceries, drinks, confectionery, etc.
      otherCharges.push({
        user_id:          user.id,
        import_id:        importRecord.id,
        transaction_date: dateStr,
        card_number:      cardNo,
        description:      product,
        total_aud:        totalAud,
        gst_aud:          gstAud,
      })
    } else {
      skipped++
    }
  }

  if (transactions.length === 0 && otherCharges.length === 0) {
    return NextResponse.json({ error: 'No valid transactions found — check the file format' }, { status: 400 })
  }

  // Upsert fuel transactions
  if (transactions.length > 0) {
    const { error: txError } = await supabase
      .from('fuel_transactions')
      .upsert(transactions, {
        onConflict:       'user_id,transaction_date,card_number,site_name,total_aud',
        ignoreDuplicates: true,
      })
    if (txError) {
      return NextResponse.json({ error: 'Failed to save fuel transactions' }, { status: 500 })
    }
  }

  // Upsert other charges
  if (otherCharges.length > 0) {
    const { error: ocError } = await supabase
      .from('other_charges')
      .upsert(otherCharges, {
        onConflict:       'user_id,transaction_date,card_number,description,total_aud',
        ignoreDuplicates: true,
      })
    if (ocError) {
      return NextResponse.json({ error: 'Failed to save other charges' }, { status: 500 })
    }
  }

  return NextResponse.json({
    import_id:            importRecord.id,
    rows_imported:        transactions.length,
    other_charges_saved:  otherCharges.length,
    rows_skipped:         skipped,
  })
}
