import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fuel } from 'lucide-react'

export default async function FuelPricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prices } = await supabase
    .from('tgp_prices')
    .select('*')
    .order('date', { ascending: false })
    .order('terminal', { ascending: true })
    .limit(100)

  const dates = [...new Set((prices || []).map(p => p.date))].slice(0, 10)
  const latestDate = dates[0]
  const todayPrices = (prices || []).filter(p => p.date === latestDate)

  function providerBadge(provider: string | null) {
    if (!provider) return '—'
    const colors: Record<string, string> = {
      'Shell Viva': 'bg-yellow-100 text-yellow-800',
      'BP':         'bg-green-100 text-green-800',
      'Ampol':      'bg-red-100 text-red-800',
    }
    return (
      <Badge className={`text-xs ${colors[provider] || 'bg-gray-100 text-gray-700'} hover:opacity-80`}>
        {provider}
      </Badge>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Fuel className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Pricing</h1>
          <p className="text-gray-500 mt-0.5">Terminal Gate Prices — diesel, all Australian terminals</p>
        </div>
        {latestDate && (
          <Badge variant="outline" className="ml-auto">
            Latest: {new Date(latestDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Badge>
        )}
      </div>

      {/* Latest Prices */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s TGP — Diesel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayPrices.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              No TGP data yet. Upload your daily Excel file from the STS Admin Dashboard.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Terminal</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Shell Viva</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">BP</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Ampol</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Cheapest</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {todayPrices.map(p => (
                    <tr key={p.terminal} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{p.terminal}</td>
                      <td className="text-right py-3 px-4">{p.shell_viva != null ? `${p.shell_viva}¢` : '—'}</td>
                      <td className="text-right py-3 px-4">{p.bp != null ? `${p.bp}¢` : '—'}</td>
                      <td className="text-right py-3 px-4">{p.ampol != null ? `${p.ampol}¢` : '—'}</td>
                      <td className="text-right py-3 px-4">{providerBadge(p.cheapest_provider)}</td>
                      <td className="text-right py-3 px-4 text-gray-500">{p.spread != null ? `${p.spread}¢` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History */}
      {dates.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Terminal</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Shell Viva</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">BP</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Ampol</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Cheapest</th>
                  </tr>
                </thead>
                <tbody>
                  {(prices || []).filter(p => p.date !== latestDate).slice(0, 30).map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-500">{new Date(p.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-2 px-4 font-medium">{p.terminal}</td>
                      <td className="text-right py-2 px-4">{p.shell_viva != null ? `${p.shell_viva}¢` : '—'}</td>
                      <td className="text-right py-2 px-4">{p.bp != null ? `${p.bp}¢` : '—'}</td>
                      <td className="text-right py-2 px-4">{p.ampol != null ? `${p.ampol}¢` : '—'}</td>
                      <td className="text-right py-2 px-4">{providerBadge(p.cheapest_provider)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
