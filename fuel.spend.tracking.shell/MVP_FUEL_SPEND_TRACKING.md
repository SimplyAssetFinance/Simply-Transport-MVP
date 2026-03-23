# MVP Feature: Fuel Spend Tracking

## Overview

Allow clients to upload fuel card transaction data (CSV export from Shell Card Online or other providers) and display spend analytics on their dashboard.

**Location in UI:**
- **Upload:** Settings > Fuel Card > Import Transactions
- **Display:** Dashboard — between "Operating Costs" tile and "Compliance Alerts" tile

---

## User Flow

### 1. CSV Upload (Settings Tab)

```
Settings > Fuel Card > Import Transactions

┌─────────────────────────────────────────────────────────────────────┐
│  Import Fuel Transactions                                           │
│                                                                     │
│  Upload your fuel card transaction export (CSV or XLSX)             │
│                                                                     │
│  Supported providers:                                               │
│  • Shell Card Online                                                │
│  • BP Plus                                                          │
│  • Ampol Card                                                       │
│  • Caltex StarCard                                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │         Drag & drop CSV/XLSX file here                       │   │
│  │              or click to browse                               │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ℹ️  How to export from Shell Card Online →                        │
│                                                                     │
│  Previous imports:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📄 shell_transactions_feb2026.csv    │ 15 Mar │ 847 rows │ ✓ │  │
│  │ 📄 shell_transactions_jan2026.csv    │ 12 Feb │ 923 rows │ ✓ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Discount Settings                                                  │
│  ─────────────────                                                  │
│  Card Type: [ Shell Card          ▼ ]                              │
│  Discount Tier: [ Truckstop Discount (-6.0 cpl) ▼ ]                │
│                                                                     │
│  ℹ️  Used to calculate your savings vs standard pump price         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. CSV Parser

**Shell Card Online Export Format (expected columns):**
| Column | Description | Example |
|--------|-------------|---------|
| Transaction Date | Date of purchase | 15/03/2026 |
| Card Number | Last 4 digits or full | ****1234 |
| Driver Name | Optional | John Smith |
| Vehicle Rego | Optional | ABC123 |
| Site Name | Service station name | Shell Coles Express Parramatta |
| Site Address | Full address | 123 Church St, Parramatta NSW |
| Product | Fuel type | Diesel |
| Quantity (L) | Litres purchased | 120.5 |
| Unit Price (cpl) | Price per litre | 276.9 |
| Total ($) | Transaction total | $333.76 |
| GST ($) | GST component | $30.34 |

**Parser should:**
- Auto-detect provider format (Shell, BP, Ampol, Caltex)
- Validate required columns exist
- Handle date format variations (DD/MM/YYYY, YYYY-MM-DD)
- Skip non-diesel products (or flag for review)
- Deduplicate if same file uploaded twice
- Map to internal schema

---

## Dashboard Display

### Fuel Spend Tile

**Position:** Below "Operating Costs" tile, above "Compliance Alerts" tile

```
┌─────────────────────────────────────────────────────────────────────┐
│  Fuel Spend                                          [30d] [60d] [90d]
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Total Spend        Litres Purchased       Avg Price/L              │
│  $14,832.50         5,247 L               $2.83                    │
│                                                                     │
│  You Saved: $314.82 (Truckstop Discount)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │     $6k ┤                                    ╭─╮              │   │
│  │         │                              ╭─────╯ │              │   │
│  │     $4k ┤        ╭────╮          ╭─────╯       │              │   │
│  │         │   ╭────╯    ╰────╮╭────╯             │              │   │
│  │     $2k ┤───╯              ╰╯                  ╰───           │   │
│  │         │                                                     │   │
│  │      $0 ┼────────────────────────────────────────────────    │   │
│  │           Feb        Mar         Apr         May              │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Top 5 Sites (by spend)                                            │
│  ────────────────────────                                          │
│  1. Shell Coles Express Parramatta     $2,847.20    18 visits      │
│  2. Shell Truckstop Eastern Creek      $2,156.80    12 visits      │
│  3. Liberty M5 Moorebank               $1,923.40    15 visits      │
│  4. Shell Coles Express Blacktown      $1,456.90    11 visits      │
│  5. BP Truck Stop Prestons             $1,234.50     8 visits      │
│                                                                     │
│  [View Full Report →]                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Metric | Calculation |
|--------|-------------|
| **Total Spend** | Sum of all transaction totals for period |
| **Litres Purchased** | Sum of all quantities for period |
| **Avg Price/L** | Total Spend ÷ Litres Purchased |
| **You Saved** | Litres × Discount Rate (e.g., 5247L × $0.06 = $314.82) |
| **Top 5 Sites** | Group by site, sum spend, sort descending, limit 5 |

### Time Period Selector

```
[30d] [60d] [90d]
```

- **30 days:** Last 30 calendar days from today
- **60 days:** Last 60 calendar days
- **90 days:** Last 90 calendar days (default)

All metrics and chart update based on selection.

### Line Chart

- **X-axis:** Time (weekly buckets for 30d, bi-weekly for 60d/90d)
- **Y-axis:** Spend in AUD
- **Data points:** Sum of transactions per time bucket
- **Tooltip:** Shows exact $ amount on hover

---

## Savings Calculation

### Inputs
- **Litres purchased:** From transaction data
- **Discount rate:** From user's Fuel Card settings (e.g., -6.0 cpl for Truckstop Discount)

### Formula
```
Savings = Total Litres × (Discount Rate ÷ 100)

Example:
5,247 L × $0.06/L = $314.82 saved
```

### Display
```
You Saved: $314.82 (Truckstop Discount)
```

If no discount configured:
```
You Saved: Configure your discount tier in Settings to see savings
```

---

## Database Schema

### `fuel_transactions` Table

```sql
CREATE TABLE fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  import_id UUID REFERENCES fuel_imports(id),
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  card_number TEXT,
  driver_name TEXT,
  vehicle_rego TEXT,
  
  -- Site details
  site_name TEXT NOT NULL,
  site_address TEXT,
  site_suburb TEXT,
  site_state TEXT,
  site_postcode TEXT,
  
  -- Product details
  product TEXT DEFAULT 'Diesel',
  quantity_litres DECIMAL(10, 2) NOT NULL,
  unit_price_cpl DECIMAL(10, 2) NOT NULL,
  total_aud DECIMAL(10, 2) NOT NULL,
  gst_aud DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(organization_id, transaction_date, card_number, site_name, total_aud)
);

-- Index for dashboard queries
CREATE INDEX idx_fuel_transactions_org_date 
  ON fuel_transactions(organization_id, transaction_date DESC);

-- RLS
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org transactions" ON fuel_transactions
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

### `fuel_imports` Table

```sql
CREATE TABLE fuel_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  
  filename TEXT NOT NULL,
  provider TEXT, -- 'shell', 'bp', 'ampol', 'caltex'
  row_count INTEGER,
  status TEXT DEFAULT 'processing', -- 'processing', 'complete', 'error'
  error_message TEXT,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE fuel_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org imports" ON fuel_imports
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

### `fuel_card_settings` Table

```sql
CREATE TABLE fuel_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
  
  card_provider TEXT, -- 'shell', 'bp', 'ampol', 'caltex'
  discount_tier TEXT, -- 'truckstop', 'national', 'standard'
  discount_cpl DECIMAL(4, 2), -- e.g., 6.00 for -6.0 cpl
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fuel_card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org settings" ON fuel_card_settings
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

---

## API Endpoints

### Upload CSV
```
POST /api/fuel/import
Content-Type: multipart/form-data

Body:
- file: CSV/XLSX file
- provider: (optional) 'shell' | 'bp' | 'ampol' | 'caltex'

Response:
{
  "import_id": "uuid",
  "status": "processing",
  "rows_detected": 847
}
```

### Get Import Status
```
GET /api/fuel/import/{import_id}

Response:
{
  "import_id": "uuid",
  "status": "complete",
  "rows_imported": 847,
  "rows_skipped": 3,
  "skipped_reasons": ["duplicate", "invalid_date", "missing_amount"]
}
```

### Get Fuel Spend Summary
```
GET /api/fuel/summary?days=30

Response:
{
  "period_start": "2026-02-21",
  "period_end": "2026-03-23",
  "total_spend_aud": 14832.50,
  "total_litres": 5247.0,
  "avg_price_cpl": 282.7,
  "transaction_count": 87,
  "savings_aud": 314.82,
  "discount_tier": "Truckstop Discount",
  "discount_cpl": 6.0
}
```

### Get Spend Chart Data
```
GET /api/fuel/chart?days=30

Response:
{
  "buckets": [
    {"period": "2026-02-24", "spend_aud": 4521.30},
    {"period": "2026-03-03", "spend_aud": 3892.40},
    {"period": "2026-03-10", "spend_aud": 2987.60},
    {"period": "2026-03-17", "spend_aud": 3431.20}
  ]
}
```

### Get Top Sites
```
GET /api/fuel/top-sites?days=30&limit=5

Response:
{
  "sites": [
    {
      "site_name": "Shell Coles Express Parramatta",
      "total_spend_aud": 2847.20,
      "visit_count": 18,
      "total_litres": 1023.5
    },
    ...
  ]
}
```

### Update Fuel Card Settings
```
PATCH /api/fuel/settings

Body:
{
  "card_provider": "shell",
  "discount_tier": "truckstop",
  "discount_cpl": 6.0
}
```

---

## Help Content

### How to Export from Shell Card Online

```
1. Log in to Shell Card Online (shellcardonline.shell.com.au)
2. Go to Reports > Transaction Report
3. Select date range (recommended: last 3 months)
4. Choose format: CSV or Excel
5. Click Download
6. Upload the file here
```

Include similar instructions for BP Plus, Ampol Card, Caltex StarCard.

---

## Error Handling

| Error | User Message |
|-------|--------------|
| Invalid file format | "Please upload a CSV or Excel file" |
| Missing required columns | "File is missing required columns: Transaction Date, Total ($)" |
| No transactions found | "No valid transactions found in file. Check the format matches your fuel card provider." |
| Duplicate import | "These transactions have already been imported" |
| Parse error | "Could not read file. Please check it's not corrupted and try again." |

---

## Future Enhancement (Phase 2)

> **Site Suggestion Emails**
> 
> Analyse client's transaction data against the National Truckstop Network to identify sites where they could save more based on their card provider's discount tiers.
> 
> Example email:
> ```
> You fuelled at BP Truck Stop Prestons 8 times last month ($1,234.50).
> 
> There's a Shell Truckstop just 2.3km away at Eastern Creek where you'd 
> get your Truckstop Discount (-6.0 cpl) instead of standard pricing.
> 
> Potential savings: $74.07/month based on your usage.
> ```
> 
> **Requirements:**
> - Compare transaction sites against truckstop network CSV
> - Calculate distance between used sites and discount sites
> - Calculate potential savings based on volume + discount difference
> - Send weekly/monthly digest email via Resend
> - Respect notification preferences in Settings

*This feature saved to Notion for Phase 2 planning.*

---

## Technical Notes

- Use Papa Parse (papaparse.com) for CSV parsing in browser
- Use SheetJS (sheetjs.com) for Excel parsing
- Chart library: Recharts (recharts.org) — matches existing dashboard
- Date handling: date-fns with Australian locale

---

*Last updated: 23 March 2026*
