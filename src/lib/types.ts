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

export type FuelCardProvider =
  | 'Shell'
  | '7-Eleven Fuel Pass'
  | 'AmpolCard'
  | 'BP Plus'
  | 'EG Fuel'
  | 'FleetCard'
  | 'Metro Petroleum'
  | 'Mobil'
  | 'Puma'
  | 'United'
  | 'WEX Motorpass'

// Shell Card has two discount tiers
export interface ShellCard {
  provider: 'Shell'
  truckstopDiscountCpl: number  // National Truckstop Network (259 sites) — higher discount
  nationalDiscountCpl: number   // All other Shell/Viva/Liberty sites — lower discount
}

// All other cards have a single discount
export interface StandardFuelCard {
  provider: Exclude<FuelCardProvider, 'Shell'>
  discountCpl: number // positive value e.g. 4.5
}

export type FuelCard = ShellCard | StandardFuelCard

export function isShellCard(card: FuelCard): card is ShellCard {
  return card.provider === 'Shell'
}

/** Returns the best (highest) single discount value for display purposes */
export function cardDisplayDiscount(card: FuelCard): number {
  return isShellCard(card)
    ? Math.max(card.truckstopDiscountCpl, card.nationalDiscountCpl)
    : card.discountCpl
}

/** Migrates old single-discount Shell cards to the two-tier format */
export function migrateFuelCards(raw: unknown[]): FuelCard[] {
  return (raw ?? []).map((c: any) => {
    if (c.provider === 'Shell' && typeof c.discountCpl === 'number' && !('nationalDiscountCpl' in c)) {
      return {
        provider:             'Shell' as const,
        truckstopDiscountCpl: c.discountCpl,
        nationalDiscountCpl:  c.discountCpl,
      } satisfies ShellCard
    }
    return c as FuelCard
  })
}

// ── Driver Compliance ─────────────────────────────────────────────────────────

export type DriverStatus = 'ok' | 'due_this_month' | 'overdue'
export type DriverComplianceItemStatus = 'ok' | 'due_soon' | 'overdue' | 'no_expiry'

export interface Driver {
  id: string
  user_id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  mobile: string
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  employee_id: string | null
  start_date: string | null
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DriverComplianceItem {
  id: string
  driver_id: string
  user_id: string
  item_type: string
  license_number: string | null
  issue_date: string | null
  expiry_date: string | null
  issuing_authority: string | null
  reminder_days: number[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DriverDocument {
  id: string
  driver_id: string
  user_id: string
  compliance_item_id: string | null
  document_type: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
}

export const COMPLIANCE_ITEM_TYPES = [
  "Driver's License",
  'Medical Certificate',
  'Fatigue Management (Basic)',
  'Fatigue Management (Advanced)',
  'Dangerous Goods License',
  'Forklift License',
  'First Aid Certificate',
  'Work Diary Training',
  'Chain of Responsibility',
  'Custom',
] as const

export type ComplianceItemType = typeof COMPLIANCE_ITEM_TYPES[number]

export function driverComplianceStatus(items: DriverComplianceItem[]): DriverStatus {
  const today = new Date(); today.setHours(0,0,0,0)
  let worst: DriverStatus = 'ok'
  for (const item of items) {
    if (!item.expiry_date) continue
    const due = new Date(item.expiry_date)
    const days = Math.floor((due.getTime() - today.getTime()) / 86_400_000)
    if (days < 0)  return 'overdue'
    if (days <= 30 && worst !== 'overdue') worst = 'due_this_month'
  }
  return worst
}

export function itemComplianceStatus(expiryDate: string | null): DriverComplianceItemStatus {
  if (!expiryDate) return 'no_expiry'
  const today = new Date(); today.setHours(0,0,0,0)
  const days = Math.floor((new Date(expiryDate).getTime() - today.getTime()) / 86_400_000)
  if (days < 0)   return 'overdue'
  if (days <= 30) return 'due_soon'
  return 'ok'
}

// Shell first, then alphabetical
export const FUEL_CARD_OPTIONS: FuelCardProvider[] = [
  'Shell',
  '7-Eleven Fuel Pass',
  'AmpolCard',
  'BP Plus',
  'EG Fuel',
  'FleetCard',
  'Metro Petroleum',
  'Mobil',
  'Puma',
  'United',
  'WEX Motorpass',
]
