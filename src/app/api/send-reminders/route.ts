import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { differenceInDays, parseISO, format } from 'date-fns'

// Called by Vercel Cron: 0 21 * * * (9pm UTC = 7am AEST)
// Add to vercel.json:
// { "crons": [{ "path": "/api/send-reminders", "schedule": "0 21 * * *" }] }
// Required env vars: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL,
//                   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const CRON_SECRET   = process.env.CRON_SECRET
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL    = process.env.RESEND_FROM_EMAIL || 'noreply@simplytransport.com.au'

export async function POST(request: NextRequest) {
  // Authenticate cron request
  const auth = request.headers.get('authorization')
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(RESEND_API_KEY)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch all users' notification settings
  const { data: notifSettings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('email_enabled', true)

  if (!notifSettings || notifSettings.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users with email enabled' })
  }

  let totalSent = 0
  const errors: string[] = []

  for (const ns of notifSettings) {
    try {
      // Get user's email
      const { data: { user } } = await supabase.auth.admin.getUserById(ns.user_id)
      if (!user?.email) continue

      const reminderDays: number[] = ns.reminder_days || [30, 14, 7, 1]

      // Fetch vehicles for this user
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, nickname, registration_plate, rego_expiry, insurance_expiry, next_service_date')
        .eq('user_id', ns.user_id)

      if (!vehicles || vehicles.length === 0) continue

      // Build compliance items
      interface ReminderItem {
        vehicleName: string
        plate: string
        type: string
        dueDate: string
        daysUntil: number
      }
      const reminderItems: ReminderItem[] = []

      for (const v of vehicles) {
        const name = v.nickname || v.registration_plate
        const checks = [
          { type: 'Registration', date: v.rego_expiry },
          { type: 'Insurance',    date: v.insurance_expiry },
          { type: 'Service',      date: v.next_service_date },
        ]
        for (const c of checks) {
          if (!c.date) continue
          const due      = parseISO(c.date)
          const daysUntil = differenceInDays(due, today)
          // Include if overdue OR within any reminder window
          const shouldRemind =
            daysUntil < 0 ||
            reminderDays.some(d => daysUntil === d)
          if (shouldRemind) {
            reminderItems.push({
              vehicleName: name,
              plate:       v.registration_plate,
              type:        c.type,
              dueDate:     c.date,
              daysUntil,
            })
          }
        }
      }

      // Daily summary mode also sends if enabled
      const hasDailySummary = ns.daily_summary
      if (reminderItems.length === 0 && !hasDailySummary) continue
      if (reminderItems.length === 0) continue  // Nothing to report even on daily summary

      // Build email HTML
      const overdueItems = reminderItems.filter(i => i.daysUntil < 0)
      const upcomingItems = reminderItems.filter(i => i.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil)

      const itemRow = (item: ReminderItem) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 12px; color: #f1f5f9; font-size: 14px;">${item.vehicleName} (${item.plate})</td>
          <td style="padding: 10px 12px; color: #94a3b8; font-size: 14px;">${item.type}</td>
          <td style="padding: 10px 12px; color: #94a3b8; font-size: 14px;">${format(parseISO(item.dueDate), 'd MMM yyyy')}</td>
          <td style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: ${item.daysUntil < 0 ? '#f87171' : item.daysUntil <= 7 ? '#fbbf24' : '#60a5fa'};">
            ${item.daysUntil < 0 ? `${Math.abs(item.daysUntil)} days overdue` : item.daysUntil === 0 ? 'Due today' : item.daysUntil === 1 ? 'Tomorrow' : `${item.daysUntil} days`}
          </td>
        </tr>`

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <div style="margin-bottom:24px;">
              <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">S</div>
                <span style="color:#f1f5f9;font-size:18px;font-weight:600;">Simply Transport</span>
              </div>
              <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0;">
                Fleet Compliance Reminder
              </h1>
              <p style="color:#64748b;font-size:14px;margin:4px 0 0;">${format(today, 'EEEE, d MMMM yyyy')}</p>
            </div>

            ${overdueItems.length > 0 ? `
            <div style="background:#1e293b;border:1px solid #7f1d1d;border-radius:12px;padding:16px;margin-bottom:16px;">
              <h2 style="color:#f87171;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">⚠ Overdue Items (${overdueItems.length})</h2>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #334155;">
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Vehicle</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Type</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Due Date</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Status</th>
                  </tr>
                </thead>
                <tbody>${overdueItems.map(itemRow).join('')}</tbody>
              </table>
            </div>` : ''}

            ${upcomingItems.length > 0 ? `
            <div style="background:#1e293b;border:1px solid #1e3a5f;border-radius:12px;padding:16px;margin-bottom:16px;">
              <h2 style="color:#60a5fa;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">📅 Upcoming Items (${upcomingItems.length})</h2>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #334155;">
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Vehicle</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Type</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Due Date</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Due In</th>
                  </tr>
                </thead>
                <tbody>${upcomingItems.map(itemRow).join('')}</tbody>
              </table>
            </div>` : ''}

            <div style="text-align:center;margin-top:24px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://simply-transport-npa1n8j3e-aaron-6644s-projects.vercel.app'}/compliance"
                style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View Compliance Dashboard →
              </a>
            </div>

            <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px;">
              Simply Transport · Fleet Management<br/>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://simply-transport-npa1n8j3e-aaron-6644s-projects.vercel.app'}/settings" style="color:#475569;">Manage notification settings</a>
            </p>
          </div>
        </body>
        </html>`

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      user.email,
        subject: `[Simply Transport] ${overdueItems.length > 0 ? `⚠ ${overdueItems.length} overdue — ` : ''}Fleet Compliance Reminder · ${format(today, 'd MMM yyyy')}`,
        html,
      })

      totalSent++
    } catch (err) {
      errors.push(String(err))
    }
  }

  return NextResponse.json({
    sent:   totalSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// Allow GET for manual testing (requires same auth)
export async function GET(request: NextRequest) {
  return POST(request)
}
