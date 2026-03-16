/**
 * Simply Transport MVP — Supabase Seed Script
 *
 * Usage:
 *   1. Set your service role key below (Settings → API → service_role secret)
 *   2. node seed.js
 *
 * What it creates:
 *   - 1 demo user  (demo@simplytransport.com.au / Demo1234!)
 *   - 12 vehicles  (mix of trucks, trailers, utes — various compliance states)
 *   - 60 days of TGP price history across 5 terminals
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL         = 'https://kobbsdvuradwpmjgkhbc.supabase.co'
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY'   // ← paste from Supabase → Settings → API

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2)
}

// ─────────────────────────────────────────
// Demo User
// ─────────────────────────────────────────

async function seedUser() {
  console.log('→ Creating demo user…')

  const { data, error } = await sb.auth.admin.createUser({
    email:          'demo@simplytransport.com.au',
    password:       'Demo1234!',
    email_confirm:  true,
    user_metadata:  { name: 'Aaron Demo', company_name: 'Demo Haulage Pty Ltd' },
  })

  if (error && error.message.includes('already registered')) {
    console.log('  Demo user already exists, fetching…')
    const { data: list } = await sb.auth.admin.listUsers()
    const existing = list.users.find(u => u.email === 'demo@simplytransport.com.au')
    return existing.id
  }

  if (error) throw error
  console.log('  Created:', data.user.email)
  return data.user.id
}

// ─────────────────────────────────────────
// Vehicles
// ─────────────────────────────────────────

function buildVehicles(userId) {
  return [
    // Overdue
    {
      user_id: userId, nickname: 'Blue Kenworth', registration_plate: 'NSW-BK1',
      make: 'Kenworth', model: 'T610', year: 2020, vehicle_type: 'truck',
      rego_state: 'NSW', rego_expiry: daysFromNow(-15),
      insurance_expiry: daysFromNow(120), insurance_provider: 'Allianz',
      next_service_date: daysFromNow(45), service_interval_km: 25000, current_odometer: 187500,
    },
    {
      user_id: userId, nickname: 'Red Mack', registration_plate: 'VIC-RM2',
      make: 'Mack', model: 'Anthem', year: 2019, vehicle_type: 'truck',
      rego_state: 'VIC', rego_expiry: daysFromNow(22),
      insurance_expiry: daysFromNow(-5), insurance_provider: 'NRMA',
      next_service_date: daysFromNow(60), service_interval_km: 30000, current_odometer: 241000,
    },
    // Due this week
    {
      user_id: userId, nickname: 'White Volvo', registration_plate: 'QLD-WV3',
      make: 'Volvo', model: 'FH16', year: 2021, vehicle_type: 'truck',
      rego_state: 'QLD', rego_expiry: daysFromNow(5),
      insurance_expiry: daysFromNow(95), insurance_provider: 'IAG',
      next_service_date: daysFromNow(3), service_interval_km: 20000, current_odometer: 98000,
    },
    {
      user_id: userId, nickname: 'Silver Scania', registration_plate: 'NSW-SS4',
      make: 'Scania', model: 'R500', year: 2022, vehicle_type: 'truck',
      rego_state: 'NSW', rego_expiry: daysFromNow(90),
      insurance_expiry: daysFromNow(6), insurance_provider: 'CGU',
      next_service_date: daysFromNow(200), service_interval_km: 25000, current_odometer: 55000,
    },
    // Due this month
    {
      user_id: userId, nickname: 'Black Isuzu', registration_plate: 'VIC-BI5',
      make: 'Isuzu', model: 'FVZ', year: 2018, vehicle_type: 'truck',
      rego_state: 'VIC', rego_expiry: daysFromNow(18),
      insurance_expiry: daysFromNow(220), insurance_provider: 'Suncorp',
      next_service_date: daysFromNow(25), service_interval_km: 15000, current_odometer: 312000,
    },
    {
      user_id: userId, nickname: 'Yellow Hino', registration_plate: 'QLD-YH6',
      make: 'Hino', model: '700', year: 2020, vehicle_type: 'truck',
      rego_state: 'QLD', rego_expiry: daysFromNow(28),
      insurance_expiry: daysFromNow(180), insurance_provider: 'Allianz',
      next_service_date: daysFromNow(14), service_interval_km: 20000, current_odometer: 145000,
    },
    // All clear
    {
      user_id: userId, nickname: 'Trailer 1', registration_plate: 'NSW-T1',
      make: 'Vawdrey', model: 'B-Double', year: 2021, vehicle_type: 'trailer',
      rego_state: 'NSW', rego_expiry: daysFromNow(180),
      insurance_expiry: daysFromNow(180), insurance_provider: 'Allianz',
      next_service_date: daysFromNow(90), service_interval_km: null, current_odometer: null,
    },
    {
      user_id: userId, nickname: 'Trailer 2', registration_plate: 'NSW-T2',
      make: 'Vawdrey', model: 'Semi', year: 2019, vehicle_type: 'trailer',
      rego_state: 'NSW', rego_expiry: daysFromNow(210),
      insurance_expiry: daysFromNow(210), insurance_provider: 'Allianz',
      next_service_date: null, service_interval_km: null, current_odometer: null,
    },
    {
      user_id: userId, nickname: 'Work Ute', registration_plate: 'NSW-UTE1',
      make: 'Toyota', model: 'HiLux', year: 2023, vehicle_type: 'ute',
      rego_state: 'NSW', rego_expiry: daysFromNow(300),
      insurance_expiry: daysFromNow(300), insurance_provider: 'NRMA',
      next_service_date: daysFromNow(120), service_interval_km: 10000, current_odometer: 28000,
    },
    {
      user_id: userId, nickname: 'Mercedes Van', registration_plate: 'VIC-VAN1',
      make: 'Mercedes-Benz', model: 'Sprinter', year: 2022, vehicle_type: 'van',
      rego_state: 'VIC', rego_expiry: daysFromNow(265),
      insurance_expiry: daysFromNow(265), insurance_provider: 'RACV',
      next_service_date: daysFromNow(80), service_interval_km: 15000, current_odometer: 41000,
    },
    {
      user_id: userId, nickname: 'Old Kenworth', registration_plate: 'SA-OK7',
      make: 'Kenworth', model: 'T909', year: 2015, vehicle_type: 'truck',
      rego_state: 'SA', rego_expiry: daysFromNow(150),
      insurance_expiry: daysFromNow(150), insurance_provider: 'CGU',
      next_service_date: daysFromNow(35), service_interval_km: 25000, current_odometer: 520000,
    },
    {
      user_id: userId, nickname: 'Freightliner', registration_plate: 'WA-FL8',
      make: 'Freightliner', model: 'Cascadia', year: 2023, vehicle_type: 'truck',
      rego_state: 'WA', rego_expiry: daysFromNow(340),
      insurance_expiry: daysFromNow(340), insurance_provider: 'IAG',
      next_service_date: daysFromNow(200), service_interval_km: 30000, current_odometer: 12000,
    },
  ]
}

async function seedVehicles(userId) {
  console.log('→ Seeding vehicles…')
  const { error } = await sb.from('vehicles').insert(buildVehicles(userId))
  if (error) throw error
  console.log('  12 vehicles created')
}

// ─────────────────────────────────────────
// TGP Prices — 60 days history, 5 terminals
// ─────────────────────────────────────────

const TERMINALS = [
  'Sydney (Silverwater)',
  'Melbourne (Newport)',
  'Brisbane (Pinkenba)',
  'Adelaide (Birkenhead)',
  'Perth (Kwinana)',
]

// Base prices per terminal (¢/L) — rough real-world reference
const BASE = {
  'Sydney (Silverwater)':   { shell: 198.5, bp: 199.2, ampol: 197.8 },
  'Melbourne (Newport)':    { shell: 196.2, bp: 197.0, ampol: 195.5 },
  'Brisbane (Pinkenba)':    { shell: 200.1, bp: 201.3, ampol: 199.6 },
  'Adelaide (Birkenhead)':  { shell: 202.4, bp: 203.1, ampol: 201.9 },
  'Perth (Kwinana)':        { shell: 205.8, bp: 206.5, ampol: 204.9 },
}

function buildTGPPrices() {
  const rows = []
  let drift = { shell: 0, bp: 0, ampol: 0 }

  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    // Correlated daily drift (same direction for all terminals, slight divergence)
    drift.shell  += randomBetween(-1.2, 1.2)
    drift.bp     += randomBetween(-1.0, 1.0)
    drift.ampol  += randomBetween(-1.1, 1.1)

    // Keep drift bounded
    drift.shell  = Math.max(-15, Math.min(15, drift.shell))
    drift.bp     = Math.max(-15, Math.min(15, drift.bp))
    drift.ampol  = Math.max(-15, Math.min(15, drift.ampol))

    const date = daysFromNow(-daysAgo)

    for (const terminal of TERMINALS) {
      const base = BASE[terminal]
      const terminalNoise = randomBetween(-0.5, 0.5)

      const shell  = +(base.shell  + drift.shell  + terminalNoise).toFixed(2)
      const bp     = +(base.bp     + drift.bp     + terminalNoise).toFixed(2)
      const ampol  = +(base.ampol  + drift.ampol  + terminalNoise).toFixed(2)

      const minPrice = Math.min(shell, bp, ampol)
      const maxPrice = Math.max(shell, bp, ampol)

      const cheapest_provider =
        minPrice === shell  ? 'Shell Viva' :
        minPrice === bp     ? 'BP'         : 'Ampol'

      rows.push({
        date,
        terminal,
        shell_viva: shell,
        bp,
        ampol,
        cheapest_provider,
        spread: +(maxPrice - minPrice).toFixed(2),
      })
    }
  }

  return rows
}

async function seedTGPPrices() {
  console.log('→ Seeding TGP prices (61 days × 5 terminals)…')
  const rows = buildTGPPrices()

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await sb.from('tgp_prices').upsert(batch, { onConflict: 'date,terminal' })
    if (error) throw error
  }
  console.log(`  ${rows.length} price records created`)
}

// ─────────────────────────────────────────
// Run
// ─────────────────────────────────────────

async function main() {
  console.log('\n🌱 Simply Transport — Seeding database\n')

  try {
    const userId = await seedUser()
    await seedVehicles(userId)
    await seedTGPPrices()
    console.log('\n✅ Seed complete!')
    console.log('   Login: demo@simplytransport.com.au')
    console.log('   Password: Demo1234!\n')
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message)
    process.exit(1)
  }
}

main()
