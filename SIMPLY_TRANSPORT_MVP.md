# Simply Transport Solutions — MVP Build Spec

> **For use with Claude Code / Codex / AI coding agents**
> 
> This document contains complete specifications for building the Phase 1 MVP.
> Target: 30-day build to first paying customers.

---

## Project Overview

**Simply Transport Solutions** is a SaaS platform for Australian transport fleet operators.

**Target Users:**
- Owner-drivers (1-5 trucks)
- Small fleet operators (5-50 vehicles)
- Transport companies needing fuel cost visibility

**Core Value Proposition:**
1. Never miss a compliance deadline (rego, insurance, service)
2. Real-time fuel TGP pricing comparison (Shell vs BP vs Ampol)
3. Simple dashboard — not another complex telematics platform

**Pricing:** $29/month per fleet (unlimited vehicles in MVP)

---

## Tech Stack (Recommended)

```
Frontend:    Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
Backend:     Next.js API Routes (or separate Express/Fastify if preferred)
Database:    PostgreSQL (via Supabase or PlanetScale)
Auth:        NextAuth.js or Supabase Auth
Email/SMS:   Resend (email) + Twilio (SMS)
Hosting:     Vercel
Payments:    Stripe
```

**Alternative Stack (if preferred):**
```
Frontend:    React + Vite, TypeScript, Tailwind
Backend:     Node.js + Express
Database:    PostgreSQL + Prisma ORM
Hosting:     Railway or Render
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  abn VARCHAR(11),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Fleets Table
```sql
CREATE TABLE fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled
  subscription_id VARCHAR(255), -- Stripe subscription ID
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Vehicles Table
```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID REFERENCES fleets(id) ON DELETE CASCADE,
  
  -- Basic Info
  nickname VARCHAR(255), -- "Blue Kenworth", "Truck 1"
  registration_plate VARCHAR(20) NOT NULL,
  vin VARCHAR(17),
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  vehicle_type VARCHAR(50), -- truck, trailer, ute, van
  
  -- Compliance Dates
  rego_expiry DATE,
  rego_state VARCHAR(3), -- NSW, VIC, QLD, etc.
  insurance_expiry DATE,
  insurance_provider VARCHAR(255),
  next_service_date DATE,
  service_interval_km INTEGER,
  current_odometer INTEGER,
  last_odometer_update DATE,
  
  -- Optional
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Compliance Reminders Table
```sql
CREATE TABLE compliance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- rego, insurance, service
  due_date DATE NOT NULL,
  
  -- Notification tracking
  reminder_30_sent BOOLEAN DEFAULT false,
  reminder_14_sent BOOLEAN DEFAULT false,
  reminder_7_sent BOOLEAN DEFAULT false,
  reminder_1_sent BOOLEAN DEFAULT false,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### TGP Prices Table (Updated Daily)
```sql
CREATE TABLE tgp_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  terminal VARCHAR(100) NOT NULL, -- Sydney, Melbourne, Brisbane, etc.
  
  -- Prices in cents per litre (GST inclusive)
  shell_viva DECIMAL(6,2),
  bp DECIMAL(6,2),
  ampol DECIMAL(6,2),
  
  -- Calculated fields
  cheapest_provider VARCHAR(50),
  spread DECIMAL(6,2), -- difference between cheapest and most expensive
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date, terminal)
);
```

### Notification Log Table
```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  notification_type VARCHAR(50), -- email, sms
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50), -- sent, failed, pending
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register     - Create new account
POST   /api/auth/login        - Login
POST   /api/auth/logout       - Logout
POST   /api/auth/forgot       - Password reset request
POST   /api/auth/reset        - Password reset confirm
GET    /api/auth/me           - Get current user
```

### Fleet Management
```
GET    /api/fleet             - Get user's fleet
PUT    /api/fleet             - Update fleet details
GET    /api/fleet/stats       - Get fleet statistics
```

### Vehicle Management
```
GET    /api/vehicles          - List all vehicles
POST   /api/vehicles          - Add new vehicle
GET    /api/vehicles/:id      - Get vehicle details
PUT    /api/vehicles/:id      - Update vehicle
DELETE /api/vehicles/:id      - Delete vehicle (soft delete)
```

### Compliance
```
GET    /api/compliance/upcoming     - Get upcoming compliance items (next 30 days)
GET    /api/compliance/overdue      - Get overdue items
POST   /api/compliance/complete/:id - Mark item as completed
GET    /api/compliance/history      - Get compliance history
```

### TGP Pricing
```
GET    /api/tgp/latest        - Get latest TGP prices (all terminals)
GET    /api/tgp/terminal/:id  - Get prices for specific terminal
GET    /api/tgp/history       - Get historical prices (for charts)
GET    /api/tgp/compare       - Compare providers over time
```

### Notifications
```
GET    /api/notifications/preferences   - Get notification preferences
PUT    /api/notifications/preferences   - Update preferences
GET    /api/notifications/history       - Get notification history
```

### Billing (Stripe)
```
POST   /api/billing/checkout        - Create Stripe checkout session
POST   /api/billing/portal          - Create Stripe customer portal session
POST   /api/billing/webhook         - Stripe webhook handler
GET    /api/billing/subscription    - Get subscription status
```

---

## Frontend Pages & Components

### Pages Structure
```
/                           - Landing page (public)
/login                      - Login page
/register                   - Registration page
/forgot-password            - Password reset
/dashboard                  - Main dashboard (protected)
/vehicles                   - Vehicle list
/vehicles/new               - Add vehicle form
/vehicles/[id]              - Vehicle details/edit
/compliance                 - Compliance calendar view
/fuel-pricing               - TGP pricing dashboard
/settings                   - Account settings
/settings/notifications     - Notification preferences
/settings/billing           - Subscription management
```

### Dashboard Components

#### 1. Compliance Summary Card
```tsx
// Shows:
// - Items due in next 7 days (red)
// - Items due in next 30 days (yellow)
// - All clear status (green)

interface ComplianceSummary {
  overdue: number;
  dueThisWeek: number;
  dueThisMonth: number;
  nextItem: {
    vehicleName: string;
    type: 'rego' | 'insurance' | 'service';
    dueDate: Date;
  } | null;
}
```

#### 2. TGP Pricing Card
```tsx
// Shows:
// - Today's cheapest provider
// - Price comparison table (Shell, BP, Ampol)
// - Savings vs most expensive
// - Trend indicator (up/down from yesterday)

interface TGPSummary {
  date: string;
  cheapest: {
    provider: string;
    price: number;
    terminal: string;
  };
  terminals: {
    name: string;
    shell: number;
    bp: number;
    ampol: number;
    cheapest: string;
    spread: number;
  }[];
}
```

#### 3. Fleet Overview Card
```tsx
// Shows:
// - Total vehicles
// - Active vs inactive
// - Quick add button

interface FleetOverview {
  totalVehicles: number;
  activeVehicles: number;
  vehicleTypes: {
    type: string;
    count: number;
  }[];
}
```

#### 4. Recent Activity Feed
```tsx
// Shows:
// - Recent compliance completions
// - New vehicles added
// - Notifications sent

interface ActivityItem {
  id: string;
  type: 'compliance_due' | 'compliance_completed' | 'vehicle_added' | 'notification_sent';
  message: string;
  timestamp: Date;
  vehicleId?: string;
}
```

### Vehicle Form Fields
```tsx
interface VehicleFormData {
  // Required
  registrationPlate: string;
  
  // Optional but recommended
  nickname: string;
  make: string;
  model: string;
  year: number;
  vehicleType: 'truck' | 'trailer' | 'ute' | 'van' | 'other';
  
  // Compliance dates
  regoExpiry: Date | null;
  regoState: 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  insuranceExpiry: Date | null;
  insuranceProvider: string;
  nextServiceDate: Date | null;
  serviceIntervalKm: number;
  currentOdometer: number;
  
  // Optional
  vin: string;
  notes: string;
}
```

### TGP Pricing Page Components

#### Price Comparison Table
```tsx
// Columns: Terminal | Shell/Viva | BP | Ampol | Cheapest | Spread
// Rows: Sydney, Newcastle, Melbourne, Brisbane, Adelaide, Perth, Darwin

interface TGPTableRow {
  terminal: string;
  shellViva: number;
  bp: number;
  ampol: number;
  cheapest: string;
  spread: number;
  change: number; // vs yesterday
}
```

#### Historical Chart
```tsx
// Line chart showing price trends over time
// Options: 7 days, 30 days, 90 days
// Toggle providers on/off
// Select terminal

interface ChartDataPoint {
  date: string;
  shellViva: number;
  bp: number;
  ampol: number;
}
```

#### Site Mapping Tool (Future)
```tsx
// Interactive map showing fuel terminals
// Click terminal to see prices
// Filter by provider

// Note: Implement in Phase 1.5 or Phase 2
// For MVP, simple table view is sufficient
```

---

## External Integrations

### 1. Viva Energy TGP Scraper

**Source URL:** `https://www.vivaenergy.com.au/quick-links/terminal-gate-pricing`

**Scrape Schedule:** Daily at 6:00 AM AEST

**Implementation:**
```typescript
// Scrape Viva Energy TGP page
// Parse HTML table for diesel prices
// Store in database

interface VivaTGPData {
  date: string;
  terminal: string;
  dieselPrice: number; // cents per litre, GST exclusive
  dieselPriceIncGST: number; // calculated: price * 1.1
}

// Terminals to capture:
const TERMINALS = [
  'Sydney (Silverwater)',
  'Newcastle (Mayfield)',
  'Melbourne (Newport)',
  'Brisbane (Pinkenba)',
  'Adelaide (Birkenhead)',
  'Perth (Kwinana)',
  'Darwin'
];
```

**Cron Job (Node.js example):**
```typescript
import * as cheerio from 'cheerio';

async function scrapeVivaTGP() {
  const response = await fetch('https://www.vivaenergy.com.au/quick-links/terminal-gate-pricing');
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Parse table rows
  // Extract diesel prices
  // Convert to cents, add GST
  // Store in database
}
```

### 2. BP TGP (Alternative Source)

**Note:** Direct BP site is blocked by CloudFront. Use AIP (Australian Institute of Petroleum) as alternative:

**Source:** `https://www.aip.com.au/pricing/terminal-gate-prices`

**Or use FuelWatch WA for BP pricing:**
**Source:** `https://www.fuelwatch.wa.gov.au/`

### 3. Ampol TGP

**Source:** Check Ampol website or use AIP aggregate data

### 4. Email Service (Resend)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendComplianceReminder(
  email: string,
  vehicleName: string,
  reminderType: 'rego' | 'insurance' | 'service',
  dueDate: Date,
  daysUntil: number
) {
  await resend.emails.send({
    from: 'Simply Transport <reminders@simplytransport.com.au>',
    to: email,
    subject: `⚠️ ${vehicleName} - ${reminderType} due in ${daysUntil} days`,
    html: `
      <h2>Compliance Reminder</h2>
      <p><strong>Vehicle:</strong> ${vehicleName}</p>
      <p><strong>Type:</strong> ${reminderType}</p>
      <p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>
      <p><strong>Days Remaining:</strong> ${daysUntil}</p>
      <p>
        <a href="https://app.simplytransport.com.au/compliance">
          View in Dashboard
        </a>
      </p>
    `
  });
}
```

### 5. SMS Service (Twilio)

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMSReminder(
  phone: string,
  vehicleName: string,
  reminderType: string,
  daysUntil: number
) {
  await client.messages.create({
    body: `Simply Transport: ${vehicleName} ${reminderType} due in ${daysUntil} days. Check dashboard for details.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}
```

### 6. Stripe Integration

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
async function createCheckoutSession(userId: string, email: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_PRICE_ID, // $29/month price
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.APP_URL}/settings/billing?cancelled=true`,
    metadata: { userId },
  });
  
  return session;
}

// Webhook handler
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // Activate subscription
      break;
    case 'invoice.paid':
      // Renew subscription
      break;
    case 'invoice.payment_failed':
      // Handle failed payment
      break;
    case 'customer.subscription.deleted':
      // Cancel subscription
      break;
  }
}
```

---

## Compliance Reminder Logic

### Reminder Schedule
```typescript
const REMINDER_DAYS = [30, 14, 7, 1]; // Days before due date

// Run daily at 8:00 AM AEST
async function processComplianceReminders() {
  const today = new Date();
  
  for (const days of REMINDER_DAYS) {
    const targetDate = addDays(today, days);
    
    // Find all compliance items due on target date
    // that haven't had this reminder sent yet
    const items = await db.complianceReminders.findMany({
      where: {
        dueDate: targetDate,
        isCompleted: false,
        [`reminder_${days}_sent`]: false
      },
      include: {
        vehicle: {
          include: {
            fleet: {
              include: { user: true }
            }
          }
        }
      }
    });
    
    for (const item of items) {
      // Send email
      await sendComplianceReminder(
        item.vehicle.fleet.user.email,
        item.vehicle.nickname || item.vehicle.registrationPlate,
        item.reminderType,
        item.dueDate,
        days
      );
      
      // Optionally send SMS if phone number exists and SMS enabled
      if (item.vehicle.fleet.user.phone && item.vehicle.fleet.smsEnabled) {
        await sendSMSReminder(
          item.vehicle.fleet.user.phone,
          item.vehicle.nickname || item.vehicle.registrationPlate,
          item.reminderType,
          days
        );
      }
      
      // Mark reminder as sent
      await db.complianceReminders.update({
        where: { id: item.id },
        data: { [`reminder_${days}_sent`]: true }
      });
    }
  }
}
```

### Auto-generate Reminders on Vehicle Save
```typescript
async function createVehicle(data: VehicleFormData, fleetId: string) {
  const vehicle = await db.vehicles.create({
    data: {
      fleetId,
      ...data
    }
  });
  
  // Auto-create compliance reminders
  const reminders = [];
  
  if (data.regoExpiry) {
    reminders.push({
      vehicleId: vehicle.id,
      reminderType: 'rego',
      dueDate: data.regoExpiry
    });
  }
  
  if (data.insuranceExpiry) {
    reminders.push({
      vehicleId: vehicle.id,
      reminderType: 'insurance',
      dueDate: data.insuranceExpiry
    });
  }
  
  if (data.nextServiceDate) {
    reminders.push({
      vehicleId: vehicle.id,
      reminderType: 'service',
      dueDate: data.nextServiceDate
    });
  }
  
  await db.complianceReminders.createMany({ data: reminders });
  
  return vehicle;
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/simply_transport

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://app.simplytransport.com.au

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+61xxx

# App
APP_URL=https://app.simplytransport.com.au
```

---

## Implementation Order

### Week 1: Foundation
1. Project setup (Next.js, Tailwind, shadcn/ui)
2. Database schema + Prisma setup
3. Authentication (register, login, logout)
4. Basic layout + navigation

### Week 2: Core Features
1. Fleet management
2. Vehicle CRUD
3. Vehicle list + details pages
4. Add vehicle form with validation

### Week 3: Compliance + TGP
1. Compliance reminder system
2. Compliance dashboard view
3. TGP pricing page
4. TGP data scraper (Viva Energy)
5. Historical price chart

### Week 4: Polish + Launch
1. Email notifications (Resend)
2. SMS notifications (Twilio)
3. Stripe subscription integration
4. Landing page
5. Settings pages
6. Testing + bug fixes
7. Deploy to production

---

## UI/UX Guidelines

### Design Principles
1. **Simple over complex** — Fleet managers are busy, don't make them think
2. **Mobile-first** — Many users will check on phones
3. **Clear status indicators** — Red/Yellow/Green for compliance
4. **Scannable data** — Tables with clear columns, sortable
5. **Minimal clicks** — Common actions should be 1-2 clicks max

### Color Scheme
```css
/* Status colors */
--danger: #ef4444;    /* Red - Overdue/Critical */
--warning: #f59e0b;   /* Amber - Due soon */
--success: #22c55e;   /* Green - All clear */
--info: #3b82f6;      /* Blue - Informational */

/* Brand colors */
--primary: #1e40af;   /* Navy blue - Transport industry standard */
--secondary: #64748b; /* Slate gray */
```

### Key Screens Wireframes

#### Dashboard
```
┌─────────────────────────────────────────────────┐
│  Simply Transport                    [Settings] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ COMPLIANCE  │  │ FUEL PRICES │              │
│  │             │  │             │              │
│  │ 2 Due Soon  │  │ Shell $2.45 │              │
│  │ 1 Overdue   │  │ Cheapest    │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ FLEET       │  │ ACTIVITY    │              │
│  │             │  │             │              │
│  │ 12 Vehicles │  │ - Rego sent │              │
│  │ 11 Active   │  │ - New truck │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  [+ Add Vehicle]                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Vehicle List
```
┌─────────────────────────────────────────────────┐
│  Vehicles                          [+ Add New]  │
├─────────────────────────────────────────────────┤
│  Search: [___________]  Filter: [All Types ▼]   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │ 🚛 Blue Kenworth          NSW ABC-123   │    │
│  │    Rego: 15 Mar 2026 (3 days) ⚠️        │    │
│  │    Insurance: OK  Service: OK           │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │ 🚛 Truck 2                 VIC XYZ-789   │    │
│  │    Rego: OK  Insurance: OK  Service: OK │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Testing Checklist

### User Flows
- [ ] Register new account
- [ ] Login / Logout
- [ ] Add vehicle with all fields
- [ ] Add vehicle with minimum fields
- [ ] Edit vehicle
- [ ] Delete vehicle
- [ ] View compliance calendar
- [ ] Mark compliance item complete
- [ ] View TGP prices
- [ ] Update notification preferences
- [ ] Subscribe via Stripe
- [ ] Cancel subscription

### Compliance
- [ ] Reminder created when vehicle added
- [ ] Reminder sent at 30 days
- [ ] Reminder sent at 14 days
- [ ] Reminder sent at 7 days
- [ ] Reminder sent at 1 day
- [ ] Overdue items highlighted

### Responsive
- [ ] Dashboard works on mobile
- [ ] Vehicle form works on mobile
- [ ] Tables scroll horizontally on mobile

---

## Launch Checklist

- [ ] Domain configured (simplytransport.com.au)
- [ ] SSL certificate active
- [ ] Stripe live mode enabled
- [ ] Transactional emails tested
- [ ] SMS sending tested
- [ ] TGP scraper running daily
- [ ] Database backups configured
- [ ] Error monitoring (Sentry) configured
- [ ] Analytics (Plausible/Vercel) configured
- [ ] Terms of Service page
- [ ] Privacy Policy page

---

## Post-MVP Roadmap

**Phase 1.5 (Quick Wins):**
- Bulk vehicle import (CSV/Excel)
- PDF compliance report
- Dashboard widgets customisation

**Phase 2 (NHVR Permit Assistant):**
- Permit eligibility checker
- Application prep assistant
- NHVR API integration (when available)

**Phase 3 (Driver Platform):**
- Driver mobile app
- Mental health resources
- Partner deals (fuel, meals)

---

## Notes for AI Coding Agent

1. **Start with auth** — Get login/register working first
2. **Use Prisma** — Type-safe database access
3. **Use shadcn/ui** — Don't reinvent components
4. **Mobile-first CSS** — Tailwind's responsive utilities
5. **Error handling** — User-friendly error messages
6. **Loading states** — Skeleton loaders everywhere
7. **Optimistic updates** — Make UI feel fast

**Common Gotchas:**
- Australian phone numbers: +61 format
- ABN validation: 11 digits with specific checksum
- Dates: Use date-fns or dayjs, respect AEST timezone
- Currency: Display as $X.XX, store as cents in DB
- Rego plates: Different formats per state

---

*Document created: 14 March 2026*
*Version: 1.0*
*Author: Bubbles 🫧*
