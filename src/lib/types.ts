export interface Vehicle {
  id: string
  user_id: string
  nickname: string
  registration_plate: string
  make: string | null
  model: string | null
  year: number | null
  vehicle_type: 'truck' | 'prime_mover' | 'trailer' | 'ute' | 'van' | 'other' | null
  rego_state: string | null
  rego_expiry: string | null
  insurance_expiry: string | null
  insurance_provider: string | null
  next_service_date: string | null
  service_interval_km: number | null
  current_odometer: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TGPPrice {
  id: string
  date: string
  terminal: string
  shell_viva: number | null
  bp: number | null
  ampol: number | null
  cheapest_provider: string | null
  spread: number | null
}

export type ComplianceStatus = 'overdue' | 'due-week' | 'due-month' | 'ok'

export interface ComplianceItem {
  vehicleId: string
  vehicleName: string
  plate: string
  type: 'rego' | 'insurance' | 'service'
  dueDate: string
  daysUntil: number
  status: ComplianceStatus
}

export interface KmLog {
  id: string
  vehicle_id: string
  user_id: string
  log_date: string
  odometer: number
  notes: string | null
  created_at: string
}

export interface ChecklistItem {
  label: string
  required: boolean
}

export interface Checklist {
  id: string
  user_id: string
  name: string
  items: ChecklistItem[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ChecklistResponse {
  checked: boolean
  notes: string
}

export interface ChecklistSubmission {
  id: string
  vehicle_id: string
  checklist_id: string | null
  user_id: string
  responses: Record<string, ChecklistResponse>
  passed: boolean | null
  submitted_at: string
  // joined fields
  vehicles?: { nickname: string; registration_plate: string } | null
  checklists?: { name: string } | null
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface NotificationSettings {
  user_id: string
  reminder_days: number[]
  daily_summary: boolean
  email_enabled: boolean
  updated_at: string
}
