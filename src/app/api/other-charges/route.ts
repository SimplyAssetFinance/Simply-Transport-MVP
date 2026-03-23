import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '90'), 365)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('other_charges')
    .select('transaction_date, description, total_aud, gst_aud')
    .eq('user_id', user.id)
    .gte('transaction_date', sinceStr)
    .order('transaction_date', { ascending: false })

  const charges = (rows ?? []) as {
    transaction_date: string
    description:      string
    total_aud:        number
    gst_aud:          number | null
  }[]

  const totalAud = charges.reduce((s, r) => s + Number(r.total_aud), 0)

  // Group by description
  const catMap: Record<string, { total: number; count: number }> = {}
  for (const r of charges) {
    const existing = catMap[r.description] ?? { total: 0, count: 0 }
    catMap[r.description] = { total: existing.total + Number(r.total_aud), count: existing.count + 1 }
  }
  const byCategory = Object.entries(catMap)
    .map(([description, { total, count }]) => ({
      description,
      total_aud: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => b.total_aud - a.total_aud)

  // 10 most recent
  const recent = charges.slice(0, 10).map(r => ({
    transaction_date: r.transaction_date,
    description:      r.description,
    total_aud:        Math.round(Number(r.total_aud) * 100) / 100,
  }))

  return NextResponse.json({
    period_days:       days,
    transaction_count: charges.length,
    total_aud:         Math.round(totalAud * 100) / 100,
    by_category:       byCategory,
    recent,
  })
}
