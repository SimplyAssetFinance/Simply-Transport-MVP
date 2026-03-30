import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VEHICLE_FIELD: Record<string, string> = {
  rego:      'rego_expiry',
  insurance: 'insurance_expiry',
  service:   'next_service_date',
}

const HISTORY_LABEL: Record<string, string> = {
  rego:      'Registration',
  insurance: 'Insurance',
  service:   'Service',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    entityType,
    entityId,
    entityName,
    complianceType,
    itemId,
    oldExpiry,
    newExpiry,
    referenceNumber,
    notes,
  } = await req.json()

  if (!entityType || !entityId || !complianceType || !newExpiry) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Update the compliance record ────────────────────────────────────────────
  if (entityType === 'vehicle') {
    const field = VEHICLE_FIELD[complianceType]
    if (!field) return NextResponse.json({ error: 'Unknown compliance type' }, { status: 400 })

    const { error } = await supabase
      .from('vehicles')
      .update({ [field]: newExpiry, updated_at: new Date().toISOString() })
      .eq('id', entityId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else if (entityType === 'driver') {
    if (!itemId) return NextResponse.json({ error: 'itemId required for driver compliance' }, { status: 400 })

    const { error } = await supabase
      .from('driver_compliance_items')
      .update({ expiry_date: newExpiry, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }

  // ── Write compliance history ─────────────────────────────────────────────────
  const historyLabel = HISTORY_LABEL[complianceType] ?? complianceType
  const historyNotes = [
    referenceNumber ? `Ref: ${referenceNumber}` : null,
    notes || null,
  ].filter(Boolean).join(' · ') || null

  await supabase.from('compliance_history').insert({
    user_id:         user.id,
    entity_type:     entityType,
    entity_id:       entityId,
    entity_name:     entityName,
    compliance_type: historyLabel,
    old_expiry:      oldExpiry ?? null,
    new_expiry:      newExpiry,
    notes:           historyNotes,
  })

  // ── Audit log ────────────────────────────────────────────────────────────────
  await supabase.from('audit_logs').insert({
    user_id:     user.id,
    action:      'compliance_renewed',
    entity_type: entityType,
    entity_id:   entityId,
    details:     { complianceType, oldExpiry, newExpiry, referenceNumber, notes },
  })

  return NextResponse.json({ ok: true })
}
