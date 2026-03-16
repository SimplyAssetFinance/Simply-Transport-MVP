export interface Vehicle {
  id: string
  user_id: string
  nickname: string
  registration_plate: string
  make: string | null
  model: string | null
  year: number | null
  vehicle_type: 'truck' | 'trailer' | 'ute' | 'van' | 'other' | null
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
