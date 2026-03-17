# Simply Transport — Fleet Tracking Platform

## Overview

Fleet compliance and cost visibility platform for SME transport operators (5-50 vehicles). Simple, affordable, transport-specific.

**Target market:** Small-to-medium transport fleets in NSW, Australia
**Competitors:** Teletrac Navman ($25-45/vehicle), Webfleet ($30-50), Fleetio ($5-10)
**Our positioning:** Fleetio simplicity + Teletrac transport focus + lower price

---

## Tech Stack

- **Frontend:** Next.js 14+ (App Router)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Hosting:** Vercel
- **Email:** Resend
- **Maps:** Google Maps API (for rest break locator in Phase 2)
- **Payments:** Stripe (Phase 2+)

### Supabase Project
- **URL:** `https://kobbsdvuradwpmjgkhbc.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/kobbsdvuradwpmjgkhbc`

---

## Phase 1: MVP (Current Focus)

Build the core features. No driver app yet — web dashboard only.

### User Stories

1. **As a fleet manager, I can register and log in securely**
   - Email/password auth via Supabase Auth
   - 2FA optional (can be Phase 2)
   - Password reset flow

2. **As a fleet manager, I can add vehicles to my fleet**
   - Fields: Rego, Make, Model, Year, VIN (optional), Vehicle Type
   - Vehicle types: Truck, Prime Mover, Trailer, Ute, Van, Other

3. **As a fleet manager, I can track compliance dates for each vehicle**
   - Registration expiry
   - Service due (by date OR by KMs — whichever comes first)
   - Insurance expiry
   - Roadworthy/safety check due
   - Custom compliance items (user-defined)

4. **As a fleet manager, I receive email reminders before compliance items expire**
   - Configurable reminder periods: 30 days, 14 days, 7 days, 1 day
   - Daily summary email (optional)
   - Send via Resend

5. **As a fleet manager, I can manually log KMs for each vehicle**
   - Date + odometer reading
   - Calculate KMs traveled between entries
   - Track for service scheduling

6. **As a fleet manager, I can complete a pre-start checklist for vehicles**
   - Standard template (tyres, lights, brakes, fluids, damage)
   - Checkbox format
   - Pass/Fail + notes field
   - Timestamp + user who completed it

7. **As a fleet manager, I can see a dashboard showing compliance status**
   - Overview: vehicles due soon (red/amber/green)
   - List view with filters
   - Upcoming items (next 30 days)

8. **As a fleet manager, I can see an audit log of all actions**
   - Who did what, when
   - Vehicle changes, checklist completions, KM entries
   - Exportable (CSV)

### Database Schema (Supabase)

```sql
-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin', -- admin, viewer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  rego TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  vehicle_type TEXT, -- truck, prime_mover, trailer, ute, van, other
  status TEXT DEFAULT 'active', -- active, inactive, sold
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Items
CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- rego, service, insurance, roadworthy, custom
  item_name TEXT NOT NULL,
  due_date DATE,
  due_kms INTEGER, -- for service items
  completed_date DATE,
  completed_kms INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KM Logs
CREATE TABLE km_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  log_date DATE NOT NULL,
  odometer INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-Start Checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  items JSONB NOT NULL, -- array of {label, required}
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Submissions
CREATE TABLE checklist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES checklists(id),
  user_id UUID REFERENCES users(id),
  responses JSONB NOT NULL, -- {item_label: {checked: bool, notes: string}}
  passed BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- vehicle_created, compliance_updated, checklist_submitted, etc
  entity_type TEXT, -- vehicle, compliance_item, checklist, etc
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  reminder_days INTEGER[] DEFAULT '{30, 14, 7, 1}',
  daily_summary BOOLEAN DEFAULT TRUE,
  summary_time TIME DEFAULT '07:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their org's data)
CREATE POLICY "Users can view own org" ON users
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own org vehicles" ON vehicles
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Add similar policies for other tables...
```

### Pages / Routes

```
/                     → Dashboard (compliance overview)
/login                → Login page
/register             → Registration (creates org + admin user)
/vehicles             → Vehicle list
/vehicles/[id]        → Vehicle detail (compliance, KM history, checklists)
/vehicles/new         → Add vehicle form
/checklists           → Checklist templates
/checklists/submit    → Submit checklist for a vehicle
/reports              → Compliance reports, audit log
/settings             → Org settings, notification preferences
```

### API Endpoints (Supabase Edge Functions or Next.js API routes)

- `POST /api/auth/register` — Create org + user
- `GET /api/vehicles` — List vehicles
- `POST /api/vehicles` — Create vehicle
- `GET /api/vehicles/[id]` — Get vehicle with compliance items
- `PATCH /api/vehicles/[id]` — Update vehicle
- `POST /api/vehicles/[id]/km` — Log KM entry
- `GET /api/compliance/due` — Get items due in next X days
- `POST /api/checklists/submit` — Submit checklist
- `GET /api/audit` — Get audit log

### Cron Jobs (Supabase scheduled functions)

1. **Daily compliance check (6am AEST)**
   - Find items due in reminder windows
   - Queue emails via Resend
   - Log notifications sent

---

## Phase 2: Growth (Future)

- Driver mobile app (React Native)
- Push notifications
- Driver license/cert tracking
- Rest break location finder (NHVR API)
- KM enforcement (block log off without entry)
- Cost-per-km calculator
- Job profitability analysis
- Monthly PDF reports

---

## Phase 3: Scale (Future)

- Fuel card integration (Shell API)
- GPS tracking (OBD-II dongle option)
- Quarterly business assessments (AI-generated)
- Photo upload → OCR → compliance marking
- Dangerous goods cert tracking

---

## Out of Scope (Don't Build)

- Payroll / wages tracking
- Tax invoice management
- Super / leave provisions
- Full EWD (partner with existing provider instead)

---

## Design Notes

- Clean, minimal UI — transport operators aren't tech-savvy
- Mobile-responsive (most checks done on phone)
- Colour coding: Red (overdue), Amber (due soon), Green (OK)
- Dark mode optional
- Australian date format (DD/MM/YYYY)
- Timezone: Australia/Sydney default, configurable

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://kobbsdvuradwpmjgkhbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
RESEND_API_KEY=<resend key>
```

---

*Last updated: 17 Mar 2026*
