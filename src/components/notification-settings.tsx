'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'
import type { NotificationSettings } from '@/lib/types'

const REMINDER_OPTIONS = [
  { days: 30, label: '30 days before' },
  { days: 14, label: '14 days before' },
  { days: 7,  label: '7 days before' },
  { days: 1,  label: '1 day before' },
]

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [reminderDays, setReminderDays] = useState<number[]>([30, 14, 7, 1])
  const [dailySummary, setDailySummary] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setSettings(data as NotificationSettings)
        setReminderDays(data.reminder_days || [30, 14, 7, 1])
        setDailySummary(data.daily_summary ?? true)
        setEmailEnabled(data.email_enabled ?? true)
      }
    }
    load()
  }, [])

  function toggleDay(day: number) {
    setReminderDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  async function handleSave() {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not logged in'); setLoading(false); return }

    const { error } = await sb.from('notification_settings').upsert({
      user_id:       user.id,
      reminder_days: reminderDays,
      daily_summary: dailySummary,
      email_enabled: emailEnabled,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) toast.error(error.message)
    else toast.success('Notification settings saved')
    setLoading(false)
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Bell size={18} /> Email Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Email reminders enabled</p>
            <p className="text-slate-500 text-xs mt-0.5">Receive compliance reminder emails</p>
          </div>
          <button
            onClick={() => setEmailEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              emailEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              emailEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Reminder windows */}
        <div className={emailEnabled ? '' : 'opacity-40 pointer-events-none'}>
          <p className="text-slate-300 text-sm font-medium mb-3">Send reminders when items are due within:</p>
          <div className="space-y-2">
            {REMINDER_OPTIONS.map(({ days, label }) => (
              <label key={days} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={reminderDays.includes(days)}
                  onChange={() => toggleDay(days)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="text-slate-300 text-sm group-hover:text-white transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Daily summary */}
        <div className={`flex items-center justify-between ${emailEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <p className="text-white text-sm font-medium">Daily summary email</p>
            <p className="text-slate-500 text-xs mt-0.5">7am AEST — overview of all upcoming compliance items</p>
          </div>
          <button
            onClick={() => setDailySummary(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              dailySummary ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              dailySummary ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
          {loading ? 'Saving…' : 'Save Notification Settings'}
        </Button>

        {!settings && (
          <p className="text-slate-500 text-xs text-center">
            Requires <code className="text-slate-400">RESEND_API_KEY</code> to be configured to send emails.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
