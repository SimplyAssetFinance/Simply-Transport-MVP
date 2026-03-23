import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, CreditCard } from 'lucide-react'
import { FuelSettings } from './fuel-settings'
import { FuelImportCard } from './fuel-import'
import { NotificationSettingsCard } from '@/components/notification-settings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <User size={18} /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Name</p>
                  <p className="text-white mt-1">{meta.name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Company</p>
                  <p className="text-white mt-1">{meta.company_name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="text-white mt-1">{user?.email}</p>
                </div>
                <div>
                  <p className="text-slate-400">Member Since</p>
                  <p className="text-white mt-1">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-AU') : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <CreditCard size={18} /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Simply Transport MVP</p>
                  <p className="text-slate-400 text-sm">$29/month · Unlimited vehicles</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">Trial</Badge>
              </div>
              <p className="text-slate-500 text-xs">Stripe billing coming soon</p>
            </CardContent>
          </Card>

          <NotificationSettingsCard />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <FuelSettings />
          <FuelImportCard />
        </div>
      </div>
    </div>
  )
}
