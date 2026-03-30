import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { format, subDays, addDays, startOfYear, parseISO } from 'date-fns'
import { getComplianceItems } from '@/lib/utils/compliance'
import { driverComplianceStatus } from '@/lib/types'
import type { Vehicle, Driver, DriverComplianceItem } from '@/lib/types'

// Called by Vercel Cron — one entry per cadence (see vercel.json)
// Required env vars: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL,
//                   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                   NEXT_PUBLIC_APP_URL

const CRON_SECRET    = process.env.CRON_SECRET
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'noreply@simplytransport.com.au'
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://simply-transport-mvp-two.vercel.app'

type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
type OrgPlan = 'trial' | 'essentials' | 'fleet_pro' | 'enterprise'

const CADENCE_PLANS: Record<Cadence, OrgPlan[]> = {
  daily:     ['fleet_pro', 'enterprise'],
  weekly:    ['trial', 'essentials', 'fleet_pro', 'enterprise'],
  monthly:   ['essentials', 'fleet_pro', 'enterprise'],
  quarterly: ['fleet_pro', 'enterprise'],
  annual:    ['enterprise'],
}

// ── Fuel helpers ─────────────────────────────────────────────────────────────

interface FuelTx {
  transaction_date: string
  quantity_litres:  number
  total_aud:        number
  site_name:        string
  unit_price_cpl:   number
  pump_total_aud:   number | null
}

interface FuelSummary {
  totalSpend:  number
  totalLitres: number
  avgPriceCpl: number
  savingsAud:  number
  txCount:     number
}

function aggFuel(txs: FuelTx[]): FuelSummary {
  const totalSpend  = txs.reduce((s, t) => s + Number(t.total_aud), 0)
  const totalLitres = txs.reduce((s, t) => s + Number(t.quantity_litres), 0)
  const avgPriceCpl = totalLitres > 0 ? (totalSpend / totalLitres) * 100 : 0
  const pumpSpend   = txs.reduce((s, t) => {
    const pump = Number(t.pump_total_aud)
    if (pump > 0) return s + pump
    const cpl = Number(t.unit_price_cpl)
    return s + (cpl > 0 ? Number(t.quantity_litres) * (cpl / 100) : Number(t.total_aud))
  }, 0)
  return {
    totalSpend,
    totalLitres,
    avgPriceCpl,
    savingsAud: Math.max(0, pumpSpend - totalSpend),
    txCount:    txs.length,
  }
}

function getTopSites(txs: FuelTx[], limit = 3) {
  const map: Record<string, { spend: number; count: number }> = {}
  for (const t of txs) {
    const s = map[t.site_name] ?? { spend: 0, count: 0 }
    s.spend += Number(t.total_aud)
    s.count += 1
    map[t.site_name] = s
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b.spend - a.spend)
    .slice(0, limit)
    .map(([name, d]) => ({ name, spend: Math.round(d.spend * 100) / 100, count: d.count }))
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const fmtAud = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
const fmtNum = (n: number, dp = 1) => n.toFixed(dp)
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ── HTML building blocks ─────────────────────────────────────────────────────

function emailWrapper(title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">S</div>
        <span style="color:#f1f5f9;font-size:18px;font-weight:600;">Simply Transport</span>
      </div>
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0;">${title}</h1>
      <p style="color:#64748b;font-size:13px;margin:4px 0 0;">${subtitle}</p>
    </div>
    ${body}
    <div style="text-align:center;margin-top:28px;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Dashboard →</a>
    </div>
    <p style="color:#334155;font-size:12px;text-align:center;margin-top:20px;">
      Simply Transport · Fleet Management<br/>
      <a href="${APP_URL}/settings" style="color:#475569;text-decoration:none;">Manage notification settings</a>
    </p>
  </div>
</body></html>`
}

function card(title: string, content: string, borderColor = '#1e3a5f'): string {
  return `<div style="background:#1e293b;border:1px solid ${borderColor};border-radius:12px;padding:16px;margin-bottom:16px;">
    <h2 style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 14px;">${title}</h2>
    ${content}
  </div>`
}

function statCells(stats: { label: string; value: string; color?: string }[]): string {
  const pct = Math.floor(100 / stats.length)
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;"><tr>${stats.map(s =>
    `<td style="padding-right:8px;width:${pct}%;vertical-align:top;">
      <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px 14px;">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 5px;">${s.label}</p>
        <p style="color:${s.color ?? '#f1f5f9'};font-size:20px;font-weight:700;margin:0;">${s.value}</p>
      </div>
    </td>`
  ).join('')}</tr></table>`
}

function changeLabel(pct: number): string {
  const color = pct <= 0 ? '#4ade80' : '#f87171'
  return `<span style="color:${color};">${pct > 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}%</span>`
}

function complianceList(items: Array<{ label: string; sub: string; days: number }>): string {
  if (items.length === 0) return '<p style="color:#4ade80;font-size:13px;margin:0;">✓ All items are up to date</p>'
  return items.map(item => {
    const color = item.days < 0 ? '#f87171' : item.days <= 7 ? '#fbbf24' : '#60a5fa'
    const badge = item.days < 0 ? `OVERDUE ${Math.abs(item.days)}d` : item.days === 0 ? 'DUE TODAY' : `${item.days}d`
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #1e293b;">
      <div>
        <p style="color:#f1f5f9;font-size:13px;font-weight:500;margin:0;">${item.label}</p>
        <p style="color:#64748b;font-size:11px;margin:2px 0 0;">${item.sub}</p>
      </div>
      <span style="color:${color};font-size:11px;font-weight:700;white-space:nowrap;margin-left:12px;background:${color}1a;padding:3px 8px;border-radius:5px;">${badge}</span>
    </div>`
  }).join('')
}

function siteList(sites: ReturnType<typeof getTopSites>): string {
  return `<p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin:14px 0 8px;">Top Sites</p>` +
    sites.map(s =>
      `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #334155;">
        <span style="color:#f1f5f9;font-size:13px;">${s.name}</span>
        <span style="color:#94a3b8;font-size:12px;font-weight:600;">${fmtAud(s.spend)} · ${s.count} tx</span>
      </div>`
    ).join('')
}

function maintenanceList(items: Array<{ vehicle: string; desc: string; date: string; cost: number | null }>): string {
  if (items.length === 0) return '<p style="color:#64748b;font-size:13px;margin:0;">No maintenance scheduled</p>'
  return items.map(item =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #334155;">
      <div>
        <p style="color:#f1f5f9;font-size:13px;font-weight:500;margin:0;">${item.vehicle} — ${item.desc}</p>
        <p style="color:#64748b;font-size:11px;margin:2px 0 0;">${item.date}</p>
      </div>
      ${item.cost != null ? `<span style="color:#94a3b8;font-size:12px;white-space:nowrap;margin-left:12px;">${fmtAud(item.cost)} est.</span>` : ''}
    </div>`
  ).join('')
}

// ── Per-cadence email builders ────────────────────────────────────────────────

function buildDaily(p: {
  today:            Date
  vehicles:         Vehicle[]
  fuelTxs:          FuelTx[]
  activeDriverCount: number
  complianceItems:  ReturnType<typeof getComplianceItems>
  driverOverdue:    number
}): { subject: string; html: string } {
  const fuel        = aggFuel(p.fuelTxs)
  const overdue     = p.complianceItems.filter(i => i.status === 'overdue')
  const dueToday    = p.complianceItems.filter(i => i.daysUntil === 0)
  const totalItems  = p.complianceItems.length
  const okPct       = totalItems > 0 ? Math.round((p.complianceItems.filter(i => i.status === 'ok').length / totalItems) * 100) : 100
  const alertCount  = overdue.length + p.driverOverdue

  const alertItems = [
    ...overdue.map(i => ({ label: `${i.vehicleName} — ${capFirst(i.type)}`, sub: format(parseISO(i.dueDate), 'd MMM yyyy'), days: i.daysUntil })),
    ...dueToday.map(i => ({ label: `${i.vehicleName} — ${capFirst(i.type)}`, sub: 'Due today', days: 0 })),
  ]
  if (p.driverOverdue > 0) alertItems.push({ label: `${p.driverOverdue} driver${p.driverOverdue > 1 ? 's' : ''} — Compliance Overdue`, sub: 'Review driver compliance', days: -1 })

  const body = [
    card('Fleet at a Glance', statCells([
      { label: 'Vehicles',       value: String(p.vehicles.length) },
      { label: 'Active Drivers', value: String(p.activeDriverCount) },
      { label: 'Compliance',     value: `${okPct}%`, color: okPct === 100 ? '#4ade80' : okPct >= 80 ? '#fbbf24' : '#f87171' },
    ])),
    fuel.txCount > 0
      ? card("Yesterday's Fuel Spend", statCells([
          { label: 'Total Spend',   value: fmtAud(fuel.totalSpend) },
          { label: 'Transactions', value: String(fuel.txCount) },
          { label: 'Avg Price',    value: `${fmtNum(fuel.avgPriceCpl)}¢/L` },
        ]))
      : '',
    card(
      alertCount > 0 ? `⚠ Compliance Alerts (${alertCount})` : 'Compliance',
      complianceList(alertItems),
      alertCount > 0 ? '#7f1d1d' : '#1e3a5f',
    ),
  ].join('')

  return {
    subject: `[Simply Transport] Daily Report · ${format(p.today, 'd MMM yyyy')}${alertCount > 0 ? ` — ⚠ ${alertCount} alert${alertCount > 1 ? 's' : ''}` : ''}`,
    html: emailWrapper('Daily Fleet Report', format(p.today, 'EEEE, d MMMM yyyy'), body),
  }
}

function buildWeekly(p: {
  today:           Date
  vehicles:        Vehicle[]
  fuelTxs:         FuelTx[]
  prevFuelTxs:     FuelTx[]
  complianceItems: ReturnType<typeof getComplianceItems>
  driverOverdue:   number
  driverDueMonth:  number
  maintenance:     Array<{ vehicle: string; desc: string; date: string; cost: number | null }>
}): { subject: string; html: string } {
  const fuel      = aggFuel(p.fuelTxs)
  const prev      = aggFuel(p.prevFuelTxs)
  const spendChg  = prev.totalSpend > 0 ? ((fuel.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : null
  const sites     = getTopSites(p.fuelTxs)
  const overdue   = p.complianceItems.filter(i => i.status === 'overdue')
  const dueWeek   = p.complianceItems.filter(i => i.status === 'due-week')
  const alertCount = overdue.length + p.driverOverdue
  const weekLabel  = format(subDays(p.today, 7), 'd MMM') + ' – ' + format(subDays(p.today, 1), 'd MMM yyyy')

  const fuelContent = fuel.txCount > 0 ? [
    statCells([
      { label: 'Total Spend',   value: fmtAud(fuel.totalSpend) },
      { label: 'Total Litres', value: `${fmtNum(fuel.totalLitres, 0)} L` },
      { label: 'Avg Price',    value: `${fmtNum(fuel.avgPriceCpl)}¢/L` },
    ]),
    `<p style="color:#94a3b8;font-size:12px;margin:2px 0 0;">`,
    spendChg !== null ? `${changeLabel(spendChg)} vs last week (${fmtAud(prev.totalSpend)})` : '',
    fuel.savingsAud > 1 ? `&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:#4ade80;">💰 Saved ${fmtAud(fuel.savingsAud)} vs pump</span>` : '',
    `</p>`,
    sites.length > 0 ? siteList(sites) : '',
  ].join('') : '<p style="color:#64748b;font-size:13px;margin:0;">No fuel transactions this week</p>'

  const alertItems = [
    ...overdue.map(i => ({ label: `${i.vehicleName} — ${capFirst(i.type)}`, sub: format(parseISO(i.dueDate), 'd MMM yyyy'), days: i.daysUntil })),
    ...dueWeek.map(i => ({ label: `${i.vehicleName} — ${capFirst(i.type)}`, sub: format(parseISO(i.dueDate), 'd MMM yyyy'), days: i.daysUntil })),
  ]
  if (p.driverOverdue  > 0) alertItems.push({ label: `${p.driverOverdue} driver${p.driverOverdue > 1 ? 's' : ''} — Overdue`, sub: 'Review driver compliance', days: -1 })
  if (p.driverDueMonth > 0) alertItems.push({ label: `${p.driverDueMonth} driver${p.driverDueMonth > 1 ? 's' : ''} — Expiring this month`, sub: 'Review driver compliance', days: 15 })

  const body = [
    card('Fuel Spend This Week', fuelContent),
    card(
      alertCount > 0 ? `⚠ Compliance Alerts (${alertCount})` : 'Compliance',
      complianceList(alertItems),
      alertCount > 0 ? '#7f1d1d' : '#1e3a5f',
    ),
    card('🔧 Upcoming Maintenance', maintenanceList(p.maintenance)),
  ].join('')

  return {
    subject: `[Simply Transport] Weekly Report · ${weekLabel}${alertCount > 0 ? ` — ⚠ ${alertCount} alert${alertCount > 1 ? 's' : ''}` : ''}`,
    html: emailWrapper('Weekly Fleet Report', weekLabel, body),
  }
}

function buildMonthly(p: {
  today:           Date
  fuelTxs:         FuelTx[]
  prevFuelTxs:     FuelTx[]
  ytdCost:         number
  forecastCost:    number
  complianceItems: ReturnType<typeof getComplianceItems>
  activeDriverCount: number
  driverOverdue:   number
  driverDueMonth:  number
  driverOk:        number
}): { subject: string; html: string } {
  const fuel      = aggFuel(p.fuelTxs)
  const prev      = aggFuel(p.prevFuelTxs)
  const spendChg  = prev.totalSpend > 0 ? ((fuel.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : null
  const totalItems = p.complianceItems.length
  const okPct     = totalItems > 0 ? Math.round((p.complianceItems.filter(i => i.status === 'ok').length / totalItems) * 100) : 100
  const overdue   = p.complianceItems.filter(i => i.status === 'overdue')
  const dueSoon   = p.complianceItems.filter(i => i.status === 'due-month' || i.status === 'due-week')
  const monthLabel = format(p.today, 'MMMM yyyy')

  const fuelContent = fuel.txCount > 0 ? [
    statCells([
      { label: 'Monthly Spend',  value: fmtAud(fuel.totalSpend) },
      { label: 'Total Litres',  value: `${fmtNum(fuel.totalLitres, 0)} L` },
      { label: 'Savings',       value: fmtAud(fuel.savingsAud), color: '#4ade80' },
    ]),
    spendChg !== null ? `<p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">${changeLabel(spendChg)} vs last month (${fmtAud(prev.totalSpend)})</p>` : '',
  ].join('') : '<p style="color:#64748b;font-size:13px;margin:0;">No fuel transactions this month</p>'

  const body = [
    card('Fuel This Month', fuelContent),
    card('Operating Costs YTD', statCells([
      { label: 'YTD Maintenance',    value: fmtAud(p.ytdCost) },
      { label: 'Next 90 Days (Est.)', value: fmtAud(p.forecastCost) },
    ])),
    card('Vehicle Compliance Health', statCells([
      { label: 'Compliance Rate', value: `${okPct}%`, color: okPct === 100 ? '#4ade80' : okPct >= 80 ? '#fbbf24' : '#f87171' },
      { label: 'Overdue',         value: String(overdue.length),  color: overdue.length > 0 ? '#f87171' : '#4ade80' },
      { label: 'Due Soon',        value: String(dueSoon.length),  color: dueSoon.length > 0 ? '#fbbf24' : '#f1f5f9' },
    ])),
    p.activeDriverCount > 0 ? card('Driver Compliance Health', statCells([
      { label: 'Active Drivers', value: String(p.activeDriverCount) },
      { label: 'Compliant',      value: String(p.driverOk),       color: '#4ade80' },
      { label: 'Due This Month', value: String(p.driverDueMonth), color: p.driverDueMonth > 0 ? '#fbbf24' : '#f1f5f9' },
      { label: 'Overdue',        value: String(p.driverOverdue),  color: p.driverOverdue > 0 ? '#f87171' : '#f1f5f9' },
    ])) : '',
  ].join('')

  return {
    subject: `[Simply Transport] Monthly Report · ${monthLabel}`,
    html: emailWrapper('Monthly Fleet Report', monthLabel, body),
  }
}

function buildQuarterly(p: {
  today:            Date
  fuelTxs:          FuelTx[]
  prevFuelTxs:      FuelTx[]
  maintenanceCost:  number
  complianceItems:  ReturnType<typeof getComplianceItems>
  activeDriverCount: number
  driverOverdue:    number
}): { subject: string; html: string } {
  const fuel       = aggFuel(p.fuelTxs)
  const prev       = aggFuel(p.prevFuelTxs)
  const spendChg   = prev.totalSpend > 0 ? ((fuel.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : null
  const sites      = getTopSites(p.fuelTxs, 5)
  const totalItems = p.complianceItems.length
  const okPct      = totalItems > 0 ? Math.round((p.complianceItems.filter(i => i.status === 'ok').length / totalItems) * 100) : 100
  const qNum       = Math.ceil((p.today.getMonth() + 1) / 3)
  const quarterLabel = `Q${qNum} ${p.today.getFullYear()}`

  const fuelContent = [
    statCells([
      { label: 'Quarter Spend',  value: fmtAud(fuel.totalSpend) },
      { label: 'Total Litres',  value: `${fmtNum(fuel.totalLitres, 0)} L` },
      { label: 'Savings',       value: fmtAud(fuel.savingsAud), color: '#4ade80' },
    ]),
    spendChg !== null ? `<p style="color:#94a3b8;font-size:12px;margin:2px 0 0;">${changeLabel(spendChg)} vs prior quarter (${fmtAud(prev.totalSpend)})</p>` : '',
    sites.length > 0 ? siteList(sites) : '',
  ].join('')

  const body = [
    card('Fuel This Quarter', fuelContent),
    p.maintenanceCost > 0 ? card('Maintenance Costs This Quarter', statCells([
      { label: 'Total Maintenance Spend', value: fmtAud(p.maintenanceCost) },
    ])) : '',
    card('Fleet Compliance', statCells([
      { label: 'Compliance Rate', value: `${okPct}%`, color: okPct === 100 ? '#4ade80' : okPct >= 80 ? '#fbbf24' : '#f87171' },
      { label: 'Active Drivers', value: String(p.activeDriverCount) },
      { label: 'Driver Alerts',  value: String(p.driverOverdue), color: p.driverOverdue > 0 ? '#f87171' : '#4ade80' },
    ])),
  ].join('')

  return {
    subject: `[Simply Transport] Quarterly Report · ${quarterLabel}`,
    html: emailWrapper('Quarterly Fleet Report', quarterLabel, body),
  }
}

function buildAnnual(p: {
  today:            Date
  vehicles:         Vehicle[]
  fuelTxs:          FuelTx[]
  prevFuelTxs:      FuelTx[]
  maintenanceCost:  number
  complianceItems:  ReturnType<typeof getComplianceItems>
  activeDriverCount: number
}): { subject: string; html: string } {
  const fuel       = aggFuel(p.fuelTxs)
  const prev       = aggFuel(p.prevFuelTxs)
  const spendChg   = prev.totalSpend > 0 ? ((fuel.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : null
  const sites      = getTopSites(p.fuelTxs, 5)
  const totalItems = p.complianceItems.length
  const okPct      = totalItems > 0 ? Math.round((p.complianceItems.filter(i => i.status === 'ok').length / totalItems) * 100) : 100
  const year       = p.today.getFullYear()

  const body = [
    card(`${year} Year in Review`, statCells([
      { label: 'Total Fuel Spend',  value: fmtAud(fuel.totalSpend) },
      { label: 'Maintenance Costs', value: fmtAud(p.maintenanceCost) },
      { label: 'Total Savings',     value: fmtAud(fuel.savingsAud), color: '#4ade80' },
    ])),
    card('Fleet Snapshot', statCells([
      { label: 'Vehicles',       value: String(p.vehicles.length) },
      { label: 'Active Drivers', value: String(p.activeDriverCount) },
      { label: 'Compliance Rate', value: `${okPct}%`, color: okPct === 100 ? '#4ade80' : okPct >= 80 ? '#fbbf24' : '#f87171' },
    ])),
    spendChg !== null ? card('Year on Year Fuel', statCells([
      { label: `${year} Spend`,     value: fmtAud(fuel.totalSpend) },
      { label: `${year - 1} Spend`, value: fmtAud(prev.totalSpend) },
      { label: 'Change',            value: `${spendChg > 0 ? '+' : ''}${spendChg.toFixed(1)}%`, color: spendChg <= 0 ? '#4ade80' : '#f87171' },
    ])) : '',
    sites.length > 0 ? card('Top Fuel Sites This Year', sites.map(s =>
      `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #334155;">
        <span style="color:#f1f5f9;font-size:13px;">${s.name}</span>
        <span style="color:#94a3b8;font-size:12px;font-weight:600;">${fmtAud(s.spend)}</span>
      </div>`
    ).join('')) : '',
  ].filter(Boolean).join('')

  return {
    subject: `[Simply Transport] ${year} Annual Fleet Report`,
    html: emailWrapper(`${year} Annual Fleet Report`, 'Year in Review', body),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handler(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization')
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const cadence = (request.nextUrl.searchParams.get('cadence') ?? 'weekly') as Cadence
  if (!CADENCE_PLANS[cadence]) {
    return NextResponse.json({ error: `Invalid cadence: ${cadence}` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const resend = new Resend(RESEND_API_KEY)

  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr   = today.toISOString().split('T')[0]
  const yearStart  = startOfYear(today).toISOString().split('T')[0]

  const { data: notifSettings } = await supabase
    .from('notification_settings')
    .select('user_id')
    .eq('email_enabled', true)

  if (!notifSettings?.length) {
    return NextResponse.json({ cadence, sent: 0, message: 'No users with email enabled' })
  }

  let totalSent = 0
  const errors: string[] = []

  for (const ns of notifSettings) {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(ns.user_id)
      if (!user?.email) continue

      const { data: org } = await supabase
        .from('organizations')
        .select('plan')
        .eq('admin_user_id', ns.user_id)
        .maybeSingle()
      const plan = (org?.plan ?? 'trial') as OrgPlan
      if (!CADENCE_PLANS[cadence].includes(plan)) continue

      // Fetch data common to all cadences
      const [
        { data: vehiclesRaw },
        { data: driversRaw },
        { data: driverItemsRaw },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', ns.user_id),
        supabase.from('drivers').select('*').eq('user_id', ns.user_id).eq('status', 'active'),
        supabase.from('driver_compliance_items').select('*').eq('user_id', ns.user_id),
      ])

      const vehicles      = (vehiclesRaw    as Vehicle[])               ?? []
      const activeDrivers = (driversRaw     as Driver[])                ?? []
      const driverItems   = (driverItemsRaw as DriverComplianceItem[])  ?? []
      const complianceItems = getComplianceItems(vehicles)

      const driverOverdue  = activeDrivers.filter(d => driverComplianceStatus(driverItems.filter(i => i.driver_id === d.id)) === 'overdue').length
      const driverDueMonth = activeDrivers.filter(d => driverComplianceStatus(driverItems.filter(i => i.driver_id === d.id)) === 'due_this_month').length
      const driverOk       = activeDrivers.filter(d => driverComplianceStatus(driverItems.filter(i => i.driver_id === d.id)) === 'ok').length

      const fuelCols = 'transaction_date, quantity_litres, total_aud, site_name, unit_price_cpl, pump_total_aud'

      let email: { subject: string; html: string } | null = null

      // ── Daily ────────────────────────────────────────────────────────────────
      if (cadence === 'daily') {
        const yesterday = subDays(today, 1).toISOString().split('T')[0]
        const { data: fuelRaw } = await supabase
          .from('fuel_transactions')
          .select(fuelCols)
          .eq('user_id', ns.user_id)
          .eq('transaction_date', yesterday)

        email = buildDaily({
          today,
          vehicles,
          fuelTxs: (fuelRaw ?? []) as FuelTx[],
          activeDriverCount: activeDrivers.length,
          complianceItems,
          driverOverdue,
        })
      }

      // ── Weekly ───────────────────────────────────────────────────────────────
      else if (cadence === 'weekly') {
        const d7  = subDays(today, 7).toISOString().split('T')[0]
        const d14 = subDays(today, 14).toISOString().split('T')[0]
        const d7f = addDays(today, 7).toISOString().split('T')[0]

        const [{ data: fuelRaw }, { data: prevFuelRaw }, { data: maintRaw }] = await Promise.all([
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d7).lte('transaction_date', todayStr),
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d14).lt('transaction_date', d7),
          supabase.from('maintenance_records')
            .select('description, date, type, cost, vehicles(nickname, registration_plate)')
            .eq('user_id', ns.user_id).eq('status', 'scheduled')
            .gte('date', todayStr).lte('date', d7f)
            .order('date', { ascending: true }).limit(5),
        ])

        const maintenance = ((maintRaw ?? []) as any[]).map(r => ({
          vehicle: (r.vehicles as any)?.nickname || (r.vehicles as any)?.registration_plate || 'Unknown',
          desc:    r.description,
          date:    format(parseISO(r.date), 'd MMM yyyy'),
          cost:    r.cost ?? null,
        }))

        email = buildWeekly({
          today,
          vehicles,
          fuelTxs:         (fuelRaw     ?? []) as FuelTx[],
          prevFuelTxs:     (prevFuelRaw ?? []) as FuelTx[],
          complianceItems,
          driverOverdue,
          driverDueMonth,
          maintenance,
        })
      }

      // ── Monthly ──────────────────────────────────────────────────────────────
      else if (cadence === 'monthly') {
        const d30  = subDays(today, 30).toISOString().split('T')[0]
        const d60  = subDays(today, 60).toISOString().split('T')[0]
        const d90f = addDays(today, 90).toISOString().split('T')[0]

        const [{ data: fuelRaw }, { data: prevFuelRaw }, { data: maintYTD }, { data: maintForecast }] = await Promise.all([
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d30),
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d60).lt('transaction_date', d30),
          supabase.from('maintenance_records').select('cost').eq('user_id', ns.user_id).eq('status', 'completed').gte('date', yearStart).not('cost', 'is', null),
          supabase.from('maintenance_records').select('cost').eq('user_id', ns.user_id).eq('status', 'scheduled').gte('date', todayStr).lte('date', d90f).not('cost', 'is', null),
        ])

        email = buildMonthly({
          today,
          fuelTxs:          (fuelRaw     ?? []) as FuelTx[],
          prevFuelTxs:      (prevFuelRaw ?? []) as FuelTx[],
          ytdCost:          ((maintYTD      ?? []) as { cost: number }[]).reduce((s, r) => s + r.cost, 0),
          forecastCost:     ((maintForecast ?? []) as { cost: number }[]).reduce((s, r) => s + r.cost, 0),
          complianceItems,
          activeDriverCount: activeDrivers.length,
          driverOverdue,
          driverDueMonth,
          driverOk,
        })
      }

      // ── Quarterly ────────────────────────────────────────────────────────────
      else if (cadence === 'quarterly') {
        const d90  = subDays(today, 90).toISOString().split('T')[0]
        const d180 = subDays(today, 180).toISOString().split('T')[0]

        const [{ data: fuelRaw }, { data: prevFuelRaw }, { data: maintRaw }] = await Promise.all([
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d90),
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', d180).lt('transaction_date', d90),
          supabase.from('maintenance_records').select('cost').eq('user_id', ns.user_id).eq('status', 'completed').gte('date', d90).not('cost', 'is', null),
        ])

        email = buildQuarterly({
          today,
          fuelTxs:          (fuelRaw     ?? []) as FuelTx[],
          prevFuelTxs:      (prevFuelRaw ?? []) as FuelTx[],
          maintenanceCost:  ((maintRaw ?? []) as { cost: number }[]).reduce((s, r) => s + r.cost, 0),
          complianceItems,
          activeDriverCount: activeDrivers.length,
          driverOverdue,
        })
      }

      // ── Annual ───────────────────────────────────────────────────────────────
      else if (cadence === 'annual') {
        const thisYearStart = `${today.getFullYear()}-01-01`
        const lastYearStart = `${today.getFullYear() - 1}-01-01`
        const lastYearEnd   = `${today.getFullYear() - 1}-12-31`

        const [{ data: fuelRaw }, { data: prevFuelRaw }, { data: maintRaw }] = await Promise.all([
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', thisYearStart),
          supabase.from('fuel_transactions').select(fuelCols).eq('user_id', ns.user_id).gte('transaction_date', lastYearStart).lte('transaction_date', lastYearEnd),
          supabase.from('maintenance_records').select('cost').eq('user_id', ns.user_id).eq('status', 'completed').gte('date', thisYearStart).not('cost', 'is', null),
        ])

        email = buildAnnual({
          today,
          vehicles,
          fuelTxs:          (fuelRaw     ?? []) as FuelTx[],
          prevFuelTxs:      (prevFuelRaw ?? []) as FuelTx[],
          maintenanceCost:  ((maintRaw ?? []) as { cost: number }[]).reduce((s, r) => s + r.cost, 0),
          complianceItems,
          activeDriverCount: activeDrivers.length,
        })
      }

      if (!email) continue

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      user.email,
        subject: email.subject,
        html:    email.html,
      })
      totalSent++
    } catch (err) {
      errors.push(`${ns.user_id}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    cadence,
    sent:   totalSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}

export const GET  = handler
export const POST = handler
