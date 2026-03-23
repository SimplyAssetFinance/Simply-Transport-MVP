# Simply Transport — Admin Panel Specification

## Overview

Internal admin dashboard for Simply Transport platform owner to manage all aspects of the system. Separate from client-facing MVP but uses same database.

**Access:** Super admin only (aaron@simplyassetfinance.com.au)
**Route:** `/admin` (protected by admin role check)

---

## Features

### 1. Dashboard Overview
- Total organizations (active/inactive)
- Total users
- Total vehicles tracked
- New signups (last 7/30 days)
- Compliance alerts across all clients
- Revenue metrics (when payments enabled)
- System health status

### 2. Organization Management
- List all organizations with search/filter
- View organization details
- Edit organization info
- Activate/deactivate organizations
- Delete organization (with confirmation + data retention options)
- View all users in organization
- View all vehicles in organization
- Impersonate organization (view as client)

### 3. User Management
- List all users with search/filter
- View user details
- Edit user info
- Reset password (send reset email)
- Force password reset on next login
- Activate/deactivate users
- Delete users
- View user activity/audit log
- Change user role (admin/viewer)
- Move user to different organization

### 4. Vehicle Management
- List all vehicles across all organizations
- Search by rego, VIN, type
- View/edit vehicle details
- View compliance status
- Bulk operations (export CSV)

### 5. Fuel & TGP Data Management
- **TGP Data:**
  - View current TGP prices by provider/location
  - Manual entry/override prices
  - Import from CSV/Excel
  - View price history
  - Trigger manual scrape
  - Configure scrape schedules
  - View scrape logs/errors
- **Retail Pricing:**
  - Same as above for retail board prices
- **Provider Configuration:**
  - Enable/disable providers
  - Configure scrape URLs
  - Set scrape frequency
  - API key management

### 6. Consent & Legal
- View all consent records
- Download signed PDFs
- Track consent versions
- View marketing consent breakdown
- Export for compliance audits

### 7. Notifications & Communications
- View all sent notifications
- Send broadcast message to all users
- Send message to specific organization
- Email templates management
- View email delivery status

### 8. Audit & Logs
- Full audit log (all user actions)
- Filter by user/organization/action type
- Export logs
- System logs (errors, scrape failures)

### 9. Settings
- Platform settings (name, logo, etc.)
- Email configuration
- Notification defaults
- Feature flags
- Maintenance mode toggle

### 10. Revenue & Billing (Stripe Integration)
- **Subscription Management:**
  - View all subscriptions (active, cancelled, past due)
  - Subscription plans management (create/edit/archive plans)
  - Trial management (extend trials, convert to paid)
  - Upgrade/downgrade subscriptions on behalf of clients
- **Invoice Management:**
  - View all invoices
  - Invoice history per organization
  - Download invoice PDFs
  - Manual invoice creation
  - Refund processing
- **Payment Monitoring:**
  - Failed payment alerts
  - Retry failed payments
  - Payment method issues
  - Dunning management (automated retry schedule)
- **Promo Codes & Discounts:**
  - Create promo codes (percentage or fixed)
  - Set validity periods
  - Usage limits (per code, per customer)
  - Track redemptions
- **Revenue Dashboard:**
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Churn rate (monthly/annual)
  - LTV (Lifetime Value)
  - Revenue by plan
  - Revenue growth chart
  - Upcoming renewals

### 11. Client Health & CRM
- **Client Notes:**
  - Add internal notes to any organization
  - Note history with timestamps
  - Pin important notes
  - Tag notes (support, billing, feedback, etc.)
- **Health Score:**
  - Calculated from: login frequency, feature usage, compliance actions, support tickets
  - Visual health indicator (green/amber/red)
  - Churn risk prediction
  - Alert when health score drops
- **Activity Tracking:**
  - Last login per user
  - Last login per organization
  - Feature usage heatmap
  - Inactivity alerts (no login in X days)
- **Incomplete Signups:**
  - Users who started but didn't finish onboarding
  - Registration date
  - Last step reached
  - Follow-up status
- **Follow-up Reminders:**
  - Create follow-up tasks for any org/user
  - Due date + assignee
  - Snooze/complete actions
  - Dashboard widget for pending follow-ups

### 12. Support & Tickets
- **Ticket System:**
  - View all tickets (open, in progress, resolved, closed)
  - Create ticket on behalf of client
  - Reply to tickets
  - Internal notes (not visible to client)
  - Priority levels (low, medium, high, urgent)
  - Categorization (billing, technical, feature request, bug)
- **Assignment:**
  - Assign to team member
  - Reassign tickets
  - View tickets by assignee
  - Unassigned tickets queue
- **Canned Responses:**
  - Create reusable response templates
  - Categorize by ticket type
  - Quick insert into replies
  - Variables ({{name}}, {{company}}, etc.)
- **Ticket Linking:**
  - Link tickets to organizations
  - Link tickets to users
  - View ticket history per client
- **SLA Tracking:**
  - First response time target
  - Resolution time target
  - SLA breach alerts

### 13. Analytics & Insights
- **Feature Usage:**
  - Most used features
  - Least used features
  - Feature adoption rate over time
  - Feature usage by plan tier
- **User Journey:**
  - Signup to first vehicle added
  - Signup to first checklist submitted
  - Drop-off points in onboarding
  - Time to value metrics
- **Compliance Metrics:**
  - Average compliance alert response time
  - Percentage of alerts actioned
  - Overdue items by client
  - Compliance health across all clients
- **Engagement Reports:**
  - Daily/weekly/monthly active users
  - Session duration
  - Pages per session
  - Mobile vs desktop usage

### 14. Security & Access
- **Two-Factor Authentication (2FA):**
  - Mandatory for all admin accounts
  - TOTP (Google Authenticator, Authy)
  - Backup codes generation
  - 2FA enforcement settings
- **Session Management:**
  - View all active admin sessions
  - Revoke individual sessions
  - Force logout all sessions
  - Session location (IP, device, browser)
- **Failed Login Tracking:**
  - Track failed login attempts
  - Auto-lockout after X failures
  - Unlock accounts manually
  - IP-based blocking
- **Suspicious Activity Alerts:**
  - Login from new location/device
  - Multiple failed attempts
  - Bulk data exports
  - Unusual admin actions
  - Email alerts for critical events

### 15. Operational
- **Maintenance Windows:**
  - Schedule maintenance with start/end time
  - Auto-notification to all users (email + in-app banner)
  - Configurable maintenance page
  - Early warning notifications (24h, 1h before)
- **Database Status:**
  - Backup status (last backup, next scheduled)
  - Backup history
  - Manual backup trigger
  - Database size metrics
  - Table row counts
- **API Management (Future):**
  - Rate limiting dashboard
  - API key management
  - Usage by endpoint
  - Error rate monitoring
  - Throttled requests log

### 16. White-Label Settings (Per Organization)
- **Custom Branding:**
  - Logo upload (header, favicon)
  - Primary/secondary colors
  - Custom domain mapping (fleet.clientcompany.com)
  - Email from address customization
- **Feature Toggles:**
  - Enable/disable features per org
  - Beta feature access
  - Plan-specific feature gates
- **Custom Documents:**
  - Upload custom T&Cs per org
  - Custom compliance checklists
  - Custom email templates

### 17. Referral & Growth
- **Referral Tracking:**
  - Referral codes per organization
  - Track referral signups
  - Referral rewards (credit, discount)
  - Referral leaderboard
- **Demo Account Management:**
  - Create demo accounts with sample data
  - Demo expiry settings
  - Convert demo to paid
  - Demo usage analytics
- **Partner Management:**
  - Partner accounts (resellers, affiliates)
  - Partner commission tracking
  - Partner dashboard access

---

## Database Schema Additions

```sql
-- Admin users (separate from regular users for security)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin', -- super_admin, admin, support
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin audit log (separate from user audit)
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL, -- user_edited, org_deleted, password_reset, etc.
  target_type TEXT, -- user, organization, vehicle, etc.
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TGP Data (for manual management)
CREATE TABLE tgp_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- viva, bp, ampol, united, aip
  location TEXT NOT NULL, -- sydney, melbourne, brisbane, etc.
  terminal TEXT, -- specific terminal name
  product TEXT NOT NULL, -- ulp, pulp, diesel, premium_diesel
  price_cpl DECIMAL(10,2) NOT NULL,
  price_ex_gst DECIMAL(10,2),
  effective_date DATE NOT NULL,
  effective_time TIME,
  source TEXT, -- scrape, manual, import
  scrape_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, location, terminal, product, effective_date)
);

-- TGP Scrape Configuration
CREATE TABLE tgp_scrape_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  scrape_url TEXT NOT NULL,
  scrape_method TEXT DEFAULT 'html', -- html, api, pdf
  is_enabled BOOLEAN DEFAULT TRUE,
  scrape_frequency TEXT DEFAULT 'daily', -- hourly, daily, weekly
  last_scrape_at TIMESTAMPTZ,
  last_scrape_status TEXT, -- success, failed, partial
  last_error TEXT,
  config JSONB, -- provider-specific config (selectors, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TGP Scrape Logs
CREATE TABLE tgp_scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  status TEXT NOT NULL, -- started, success, failed, partial
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retail Board Prices
CREATE TABLE retail_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL, -- shell, caltex, bp, etc.
  station_name TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT NOT NULL,
  postcode TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  product TEXT NOT NULL,
  price_cpl DECIMAL(10,2) NOT NULL,
  last_updated TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings (key-value store)
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcast Messages
CREATE TABLE broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT DEFAULT 'all', -- all, organization, user
  target_id UUID,
  sent_by UUID REFERENCES admin_users(id),
  sent_at TIMESTAMPTZ,
  delivery_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tgp_prices_lookup ON tgp_prices(provider, location, effective_date);
CREATE INDEX idx_tgp_prices_date ON tgp_prices(effective_date DESC);
CREATE INDEX idx_retail_prices_location ON retail_prices(state, suburb);
CREATE INDEX idx_admin_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_target ON admin_audit_logs(target_type, target_id);

-- =====================================================
-- BILLING & SUBSCRIPTIONS
-- =====================================================

-- Subscription Plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stripe_price_id TEXT UNIQUE,
  price_cents INTEGER NOT NULL,
  billing_interval TEXT DEFAULT 'month', -- month, year
  trial_days INTEGER DEFAULT 14,
  features JSONB, -- { "max_vehicles": 10, "max_users": 5, ... }
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'trialing', -- trialing, active, past_due, canceled, unpaid
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (synced from Stripe)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'aud',
  status TEXT, -- draft, open, paid, uncollectible, void
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL, -- percent, fixed
  discount_value INTEGER NOT NULL, -- percentage or cents
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  max_redemptions INTEGER,
  redemption_count INTEGER DEFAULT 0,
  applies_to_plans UUID[], -- null = all plans
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Code Redemptions
CREATE TABLE promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id),
  organization_id UUID REFERENCES organizations(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENT HEALTH & CRM
-- =====================================================

-- Client Notes
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_users(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  tags TEXT[], -- ['support', 'billing', 'feedback']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Scores (calculated daily)
CREATE TABLE health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, -- 0-100
  components JSONB, -- { login_score, usage_score, compliance_score, support_score }
  risk_level TEXT, -- low, medium, high
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Tracking
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up Reminders
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES admin_users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, snoozed
  snoozed_until DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incomplete Signups
CREATE TABLE incomplete_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  last_step TEXT, -- registration, email_verify, onboarding, payment
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  follow_up_status TEXT DEFAULT 'pending', -- pending, contacted, converted, abandoned
  notes TEXT
);

-- =====================================================
-- SUPPORT & TICKETS
-- =====================================================

-- Support Tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES admin_users(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, in_progress, waiting, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  category TEXT, -- billing, technical, feature_request, bug, general
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- user, admin
  sender_id UUID, -- user_id or admin_id
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- internal notes not visible to client
  attachments JSONB, -- [{ name, url, size }]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canned Responses
CREATE TABLE canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables TEXT[], -- ['name', 'company', 'ticket_number']
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECURITY
-- =====================================================

-- Admin 2FA
ALTER TABLE admin_users ADD COLUMN totp_secret TEXT;
ALTER TABLE admin_users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN backup_codes TEXT[];

-- Admin Sessions
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed Login Attempts
CREATE TABLE failed_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  reason TEXT, -- invalid_password, invalid_email, account_locked, 2fa_failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Alerts
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  alert_type TEXT NOT NULL, -- new_device, failed_login, suspicious_activity, bulk_export
  details JSONB,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHITE-LABEL
-- =====================================================

-- Organization Branding
CREATE TABLE organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT, -- hex
  secondary_color TEXT,
  custom_domain TEXT,
  custom_email_from TEXT,
  custom_terms_url TEXT,
  feature_overrides JSONB, -- enable/disable specific features
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REFERRALS & PARTNERS
-- =====================================================

-- Referral Codes
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  code TEXT UNIQUE NOT NULL,
  reward_type TEXT DEFAULT 'credit', -- credit, discount, free_month
  reward_value INTEGER, -- cents or percentage
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Conversions
CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES referral_codes(id),
  referred_organization_id UUID REFERENCES organizations(id),
  reward_issued BOOLEAN DEFAULT FALSE,
  reward_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Accounts
CREATE TABLE demo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  converted_at TIMESTAMPTZ,
  sample_data_loaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  partner_type TEXT DEFAULT 'affiliate', -- affiliate, reseller, white_label
  commission_percent INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Commissions
CREATE TABLE partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  organization_id UUID REFERENCES organizations(id),
  invoice_id UUID REFERENCES invoices(id),
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MAINTENANCE & OPS
-- =====================================================

-- Scheduled Maintenance
CREATE TABLE maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  notification_sent_24h BOOLEAN DEFAULT FALSE,
  notification_sent_1h BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database Backups Log
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- automatic, manual
  status TEXT NOT NULL, -- started, completed, failed
  size_bytes BIGINT,
  storage_location TEXT,
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional indexes
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_health_scores_org ON health_scores(organization_id);
CREATE INDEX idx_user_activity_user ON user_activity(user_id);
CREATE INDEX idx_user_activity_org ON user_activity(organization_id);
CREATE INDEX idx_tickets_org ON support_tickets(organization_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX idx_failed_logins_email ON failed_logins(email);
CREATE INDEX idx_failed_logins_ip ON failed_logins(ip_address);
```

---

## Page Structure

```
/admin                          → Dashboard overview
/admin/login                    → Admin login (separate from client login)

/admin/organizations            → Organization list
/admin/organizations/[id]       → Organization detail
/admin/organizations/[id]/edit  → Edit organization

/admin/users                    → User list (all users)
/admin/users/[id]               → User detail
/admin/users/[id]/edit          → Edit user
/admin/users/[id]/reset-password → Reset password

/admin/vehicles                 → Vehicle list (all vehicles)
/admin/vehicles/[id]            → Vehicle detail

/admin/fuel                     → Fuel data dashboard
/admin/fuel/tgp                 → TGP management
/admin/fuel/tgp/manual          → Manual TGP entry
/admin/fuel/tgp/import          → Import TGP from CSV
/admin/fuel/tgp/config          → Scrape configuration
/admin/fuel/tgp/logs            → Scrape logs
/admin/fuel/retail              → Retail prices management

/admin/consent                  → Consent records
/admin/consent/[id]             → View/download consent PDF

/admin/notifications            → Notification management
/admin/notifications/broadcast  → Send broadcast

/admin/audit                    → Audit logs
/admin/settings                 → System settings

/admin/billing                  → Billing dashboard
/admin/billing/subscriptions    → All subscriptions
/admin/billing/invoices         → All invoices
/admin/billing/promo-codes      → Promo code management
/admin/billing/revenue          → Revenue dashboard (MRR, churn, LTV)

/admin/crm                      → CRM dashboard
/admin/crm/health               → Client health scores
/admin/crm/incomplete           → Incomplete signups
/admin/crm/follow-ups           → Follow-up reminders

/admin/support                  → Support dashboard
/admin/support/tickets          → All tickets
/admin/support/tickets/[id]     → Ticket detail + replies
/admin/support/canned           → Canned responses

/admin/analytics                → Analytics dashboard
/admin/analytics/features       → Feature usage
/admin/analytics/journeys       → User journeys
/admin/analytics/engagement     → Engagement reports

/admin/security                 → Security dashboard
/admin/security/sessions        → Active admin sessions
/admin/security/failed-logins   → Failed login attempts
/admin/security/alerts          → Security alerts
/admin/security/2fa             → 2FA management

/admin/operations               → Operations dashboard
/admin/operations/maintenance   → Maintenance windows
/admin/operations/backups       → Backup status/history

/admin/white-label              → White-label settings
/admin/white-label/[org_id]     → Per-org branding

/admin/referrals                → Referral dashboard
/admin/referrals/codes          → Referral codes
/admin/referrals/conversions    → Conversion tracking

/admin/partners                 → Partner management
/admin/partners/[id]            → Partner detail

/admin/demos                    → Demo accounts
```

---

## API Endpoints

### Auth
```
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/auth/me
```

### Organizations
```
GET    /api/admin/organizations
GET    /api/admin/organizations/[id]
PATCH  /api/admin/organizations/[id]
DELETE /api/admin/organizations/[id]
POST   /api/admin/organizations/[id]/activate
POST   /api/admin/organizations/[id]/deactivate
```

### Users
```
GET    /api/admin/users
GET    /api/admin/users/[id]
PATCH  /api/admin/users/[id]
DELETE /api/admin/users/[id]
POST   /api/admin/users/[id]/reset-password
POST   /api/admin/users/[id]/force-password-reset
POST   /api/admin/users/[id]/activate
POST   /api/admin/users/[id]/deactivate
```

### Vehicles
```
GET    /api/admin/vehicles
GET    /api/admin/vehicles/[id]
PATCH  /api/admin/vehicles/[id]
GET    /api/admin/vehicles/export  → CSV export
```

### TGP Data
```
GET    /api/admin/tgp
GET    /api/admin/tgp/providers
GET    /api/admin/tgp/history
POST   /api/admin/tgp/manual       → Manual price entry
POST   /api/admin/tgp/import       → CSV import
POST   /api/admin/tgp/scrape       → Trigger manual scrape
GET    /api/admin/tgp/config
PATCH  /api/admin/tgp/config/[provider]
GET    /api/admin/tgp/logs
```

### Retail Prices
```
GET    /api/admin/retail
POST   /api/admin/retail/import
GET    /api/admin/retail/export
```

### Consent
```
GET    /api/admin/consent
GET    /api/admin/consent/[id]
GET    /api/admin/consent/[id]/pdf → Download PDF
GET    /api/admin/consent/export   → Export all for audit
```

### Notifications
```
GET    /api/admin/notifications
POST   /api/admin/notifications/broadcast
GET    /api/admin/notifications/stats
```

### Audit
```
GET    /api/admin/audit
GET    /api/admin/audit/export
```

### Settings
```
GET    /api/admin/settings
PATCH  /api/admin/settings
POST   /api/admin/settings/maintenance
```

### Billing & Subscriptions
```
GET    /api/admin/billing/stats         → Revenue dashboard stats
GET    /api/admin/subscriptions
GET    /api/admin/subscriptions/[id]
PATCH  /api/admin/subscriptions/[id]    → Update/cancel
POST   /api/admin/subscriptions/[id]/extend-trial
GET    /api/admin/invoices
GET    /api/admin/invoices/[id]
POST   /api/admin/invoices/[id]/refund
GET    /api/admin/promo-codes
POST   /api/admin/promo-codes
PATCH  /api/admin/promo-codes/[id]
DELETE /api/admin/promo-codes/[id]
```

### CRM & Client Health
```
GET    /api/admin/health-scores
GET    /api/admin/health-scores/[org_id]
GET    /api/admin/health-scores/at-risk  → High churn risk clients
GET    /api/admin/client-notes/[org_id]
POST   /api/admin/client-notes/[org_id]
PATCH  /api/admin/client-notes/[id]
DELETE /api/admin/client-notes/[id]
GET    /api/admin/follow-ups
POST   /api/admin/follow-ups
PATCH  /api/admin/follow-ups/[id]
GET    /api/admin/incomplete-signups
PATCH  /api/admin/incomplete-signups/[id]
```

### Support & Tickets
```
GET    /api/admin/tickets
GET    /api/admin/tickets/[id]
POST   /api/admin/tickets              → Create on behalf of client
PATCH  /api/admin/tickets/[id]         → Update status, assign, etc.
POST   /api/admin/tickets/[id]/reply
GET    /api/admin/canned-responses
POST   /api/admin/canned-responses
PATCH  /api/admin/canned-responses/[id]
DELETE /api/admin/canned-responses/[id]
```

### Analytics
```
GET    /api/admin/analytics/features
GET    /api/admin/analytics/journeys
GET    /api/admin/analytics/engagement
GET    /api/admin/analytics/compliance
```

### Security
```
GET    /api/admin/security/sessions
DELETE /api/admin/security/sessions/[id]  → Revoke session
POST   /api/admin/security/sessions/revoke-all
GET    /api/admin/security/failed-logins
GET    /api/admin/security/alerts
PATCH  /api/admin/security/alerts/[id]/acknowledge
POST   /api/admin/auth/2fa/enable
POST   /api/admin/auth/2fa/verify
POST   /api/admin/auth/2fa/disable
GET    /api/admin/auth/2fa/backup-codes
```

### Operations
```
GET    /api/admin/maintenance
POST   /api/admin/maintenance
PATCH  /api/admin/maintenance/[id]
DELETE /api/admin/maintenance/[id]
GET    /api/admin/backups
POST   /api/admin/backups/trigger       → Manual backup
```

### White-Label
```
GET    /api/admin/white-label/[org_id]
PATCH  /api/admin/white-label/[org_id]
POST   /api/admin/white-label/[org_id]/logo  → Upload logo
```

### Referrals & Partners
```
GET    /api/admin/referrals
GET    /api/admin/referrals/codes
POST   /api/admin/referrals/codes
PATCH  /api/admin/referrals/codes/[id]
GET    /api/admin/referrals/conversions
GET    /api/admin/partners
GET    /api/admin/partners/[id]
POST   /api/admin/partners
PATCH  /api/admin/partners/[id]
GET    /api/admin/partners/[id]/commissions
POST   /api/admin/partners/[id]/commissions/pay
```

### Demo Accounts
```
GET    /api/admin/demos
POST   /api/admin/demos               → Create demo with sample data
PATCH  /api/admin/demos/[id]/extend
POST   /api/admin/demos/[id]/convert  → Convert to paid
DELETE /api/admin/demos/[id]
```

---

## Admin Dashboard Components

### Dashboard Stats Card
```tsx
interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number; // percentage change
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <p className={change >= 0 ? "text-green-600" : "text-red-600"}>
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>
    </div>
  );
}
```

### Data Table with Actions
```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: boolean;
  searchable?: boolean;
}
```

### TGP Manual Entry Form
```tsx
export function TGPManualEntryForm() {
  const [formData, setFormData] = useState({
    provider: "",
    location: "",
    terminal: "",
    product: "diesel",
    price_cpl: "",
    effective_date: new Date().toISOString().split("T")[0]
  });

  return (
    <form>
      <select name="provider">
        <option value="viva">Viva Energy (Shell)</option>
        <option value="bp">BP</option>
        <option value="ampol">Ampol</option>
        <option value="united">United</option>
        <option value="caltex">Caltex</option>
        <option value="mobil">Mobil</option>
      </select>
      
      <select name="location">
        <option value="sydney">Sydney</option>
        <option value="melbourne">Melbourne</option>
        <option value="brisbane">Brisbane</option>
        <option value="adelaide">Adelaide</option>
        <option value="perth">Perth</option>
        <option value="darwin">Darwin</option>
      </select>
      
      <input name="terminal" placeholder="Terminal name (optional)" />
      
      <select name="product">
        <option value="ulp">ULP</option>
        <option value="pulp">PULP</option>
        <option value="diesel">Diesel</option>
        <option value="premium_diesel">Premium Diesel</option>
      </select>
      
      <input 
        name="price_cpl" 
        type="number" 
        step="0.01" 
        placeholder="Price (cpl inc GST)" 
      />
      
      <input name="effective_date" type="date" />
      
      <button type="submit">Add Price</button>
    </form>
  );
}
```

### Password Reset Function
```ts
// app/api/admin/users/[id]/reset-password/route.ts

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Verify admin auth
  const adminUser = await verifyAdminAuth(request);
  if (!adminUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for admin ops
  );

  // Get user
  const { data: user } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", params.id)
    .single();

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Generate password reset link via Supabase Auth
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: user.email
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Send reset email
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Simply Transport <noreply@simplytransport.com.au>",
    to: user.email,
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset</h1>
      <p>Hi ${user.full_name},</p>
      <p>A password reset has been requested for your Simply Transport account.</p>
      <p>Click the link below to set a new password:</p>
      <a href="${data.properties.action_link}">Reset Password</a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });

  // Log admin action
  await supabase.from("admin_audit_logs").insert({
    admin_id: adminUser.id,
    action: "password_reset_sent",
    target_type: "user",
    target_id: params.id,
    details: { email: user.email }
  });

  return Response.json({ success: true, email: user.email });
}
```

---

## Security Considerations

### 1. Separate Admin Authentication
- Admin users stored in separate `admin_users` table
- Different login endpoint (`/admin/login`)
- Stronger password requirements
- Session timeout after 30 minutes of inactivity
- IP allowlist option for super admin

### 2. Role-Based Access
```ts
type AdminRole = "super_admin" | "admin" | "support";

const permissions = {
  super_admin: ["*"], // All permissions
  admin: [
    "view_organizations", "edit_organizations",
    "view_users", "edit_users", "reset_passwords",
    "view_vehicles",
    "manage_tgp", "manage_retail",
    "view_consent",
    "view_audit"
  ],
  support: [
    "view_organizations",
    "view_users", "reset_passwords",
    "view_vehicles",
    "view_consent"
  ]
};
```

### 3. Audit Everything
Every admin action logged with:
- Admin user ID
- Action type
- Target entity
- Before/after values (for edits)
- IP address
- Timestamp

### 4. Sensitive Actions Require Confirmation
- Delete organization → Type organization name to confirm
- Delete user → Confirmation modal
- Broadcast message → Preview before send
- Maintenance mode → Countdown timer

---

## Admin Middleware

```ts
// middleware.ts (add to existing)

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Admin routes
  if (path.startsWith("/admin")) {
    // Allow login page
    if (path === "/admin/login") return NextResponse.next();
    
    // Check admin session
    const adminToken = req.cookies.get("admin_session");
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    
    // Verify admin token
    const isValid = await verifyAdminToken(adminToken.value);
    if (!isValid) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
```

---

## Initial Admin Setup

Run once to create super admin:

```ts
// scripts/create-admin.ts

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSuperAdmin() {
  const email = "aaron@simplyassetfinance.com.au";
  const password = process.argv[2]; // Pass as CLI arg
  
  if (!password) {
    console.error("Usage: npx ts-node scripts/create-admin.ts <password>");
    process.exit(1);
  }
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email,
      password_hash: passwordHash,
      full_name: "Aaron",
      role: "super_admin",
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  
  console.log("Super admin created:", data.email);
}

createSuperAdmin();
```

---

## Environment Variables

```
# Add to .env.local
ADMIN_SESSION_SECRET=<random 64 char string>
ADMIN_SESSION_EXPIRY=1800 # 30 minutes in seconds
ADMIN_IP_ALLOWLIST=  # Optional: comma-separated IPs
```

---

## Files to Create

```
simply-transport/
├── app/
│   └── admin/
│       ├── layout.tsx              # Admin layout (different from client)
│       ├── page.tsx                # Dashboard
│       ├── login/page.tsx          # Admin login
│       ├── organizations/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── edit/page.tsx
│       ├── users/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── edit/page.tsx
│       │       └── reset-password/page.tsx
│       ├── vehicles/
│       │   └── page.tsx
│       ├── fuel/
│       │   ├── page.tsx
│       │   ├── tgp/
│       │   │   ├── page.tsx
│       │   │   ├── manual/page.tsx
│       │   │   ├── import/page.tsx
│       │   │   ├── config/page.tsx
│       │   │   └── logs/page.tsx
│       │   └── retail/page.tsx
│       ├── consent/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── notifications/
│       │   ├── page.tsx
│       │   └── broadcast/page.tsx
│       ├── audit/page.tsx
│       └── settings/page.tsx
├── components/
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminSidebar.tsx
│       ├── StatsCard.tsx
│       ├── DataTable.tsx
│       ├── TGPManualEntryForm.tsx
│       ├── TGPImportForm.tsx
│       ├── PasswordResetModal.tsx
│       ├── ConfirmDeleteModal.tsx
│       └── BroadcastForm.tsx
├── lib/
│   └── admin/
│       ├── auth.ts
│       ├── permissions.ts
│       └── audit.ts
└── scripts/
    └── create-admin.ts
```

---

## Testing Checklist

- [ ] Admin login works separately from client login
- [ ] Non-admin users cannot access /admin routes
- [ ] Organization CRUD works
- [ ] User CRUD works  
- [ ] Password reset sends email
- [ ] TGP manual entry saves correctly
- [ ] TGP CSV import works
- [ ] Scrape trigger works
- [ ] Audit log records all actions
- [ ] Consent PDF download works
- [ ] Broadcast message sends to all users
- [ ] Settings save correctly
- [ ] Maintenance mode blocks client access

### Billing & Subscriptions
- [ ] Revenue dashboard shows accurate MRR/ARR
- [ ] Can view/manage all subscriptions
- [ ] Trial extension works
- [ ] Promo code creation/redemption works
- [ ] Refund processing works
- [ ] Failed payment alerts appear

### CRM & Client Health
- [ ] Health scores calculate correctly
- [ ] At-risk clients flagged
- [ ] Client notes CRUD works
- [ ] Follow-up reminders work
- [ ] Incomplete signups tracked

### Support & Tickets
- [ ] Ticket creation/assignment works
- [ ] Reply thread works
- [ ] Internal notes hidden from client
- [ ] Canned responses work
- [ ] SLA tracking accurate

### Analytics
- [ ] Feature usage stats populate
- [ ] User journey tracking works
- [ ] Engagement metrics accurate

### Security
- [ ] 2FA enrollment works
- [ ] 2FA login flow works
- [ ] Session list shows all active sessions
- [ ] Session revocation works
- [ ] Failed logins tracked
- [ ] Security alerts generated

### Operations
- [ ] Maintenance window scheduling works
- [ ] Auto-notifications sent (24h, 1h before)
- [ ] Maintenance mode activates on schedule
- [ ] Backup status visible
- [ ] Manual backup trigger works

### White-Label
- [ ] Per-org branding saves correctly
- [ ] Logo upload works
- [ ] Custom colors apply
- [ ] Feature toggles work per org

### Referrals & Partners
- [ ] Referral code generation works
- [ ] Referral tracking works
- [ ] Partner commission tracking works
- [ ] Demo account creation works
- [ ] Demo conversion works

---

*Last updated: 18 Mar 2026*
