import type { SupabaseClient } from '@supabase/supabase-js'

export async function logAudit(
  supabase: SupabaseClient,
  action: string,
  entityType: string | null,
  entityId: string | null,
  details?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('audit_logs').insert({
    user_id:     user.id,
    action,
    entity_type: entityType,
    entity_id:   entityId,
    details:     details ?? null,
  })
}
