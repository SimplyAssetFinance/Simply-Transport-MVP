# MVP Feature: Driver Compliance & Reports

## Overview
Track driver compliance items (licenses, medical certificates, training) with the same framework as vehicle compliance. Generate compliance reports showing driver status across the fleet.

---

## Driver Management

### Driver List View
Display all drivers with compliance status indicators.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Drivers                                           [+ Add Driver]  [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Status Filter: [All ▼]  Search: [________________]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Name              License #       License Expiry    Status                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🟢 John Smith      NSW 12345678   15 Mar 2027       OK                     │
│  🟡 Sarah Jones     VIC 87654321   28 Mar 2026       Due This Month         │
│  🔴 Mike Wilson     QLD 11223344   05 Mar 2026       Overdue                │
│  🟢 Emma Brown      NSW 99887766   01 Dec 2026       OK                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Colour | Condition |
|--------|--------|-----------|
| **OK** | 🟢 Green | All compliance items valid for 30+ days |
| **Due This Month** | 🟡 Yellow | Any item expiring within 30 days |
| **Overdue** | 🔴 Red | Any item expired |

---

## Driver Profile

### Basic Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Driver Details                                              [Edit] [Delete]│
├─────────────────────────────────────────────────────────────────────────────┤
│  First Name:        John                                                    │
│  Last Name:         Smith                                                   │
│  Date of Birth:     15/06/1985                                              │
│  Mobile:            0412 345 678                                            │
│  Email:             john.smith@example.com                                  │
│  Emergency Contact: Jane Smith (Partner) - 0423 456 789                     │
│  Employee ID:       EMP-001 (optional)                                      │
│  Start Date:        01/03/2024                                              │
│  Status:            Active / Inactive                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Driver Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| First Name | Text | ✓ | |
| Last Name | Text | ✓ | |
| Date of Birth | Date | | For age verification |
| Mobile | Phone | ✓ | Primary contact |
| Email | Email | | For notifications |
| Emergency Contact Name | Text | | |
| Emergency Contact Phone | Phone | | |
| Emergency Contact Relationship | Text | | |
| Employee ID | Text | | Internal reference |
| Start Date | Date | | Employment start |
| Status | Select | ✓ | Active / Inactive |
| Notes | Text (long) | | General notes |

---

## Compliance Items

### Driver Compliance Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Compliance Items                                        [+ Add Item]       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Item                    Expiry          Status      Document               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🟢 Driver's License     15 Mar 2027     OK          📄 View                │
│  🟡 Medical Certificate  28 Mar 2026     Due Soon    📄 View                │
│  🟢 Fatigue Training     01 Sep 2026     OK          📄 View                │
│  🔴 Dangerous Goods      05 Mar 2026     Overdue     ⚠️ Missing             │
│  🟢 Forklift License     N/A             No Expiry   📄 View                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standard Compliance Item Types

| Item Type | Typical Validity | Notes |
|-----------|------------------|-------|
| Driver's License (HR/HC/MC/Multi) | 1-10 years | State-issued |
| Medical Certificate | 1-2 years | Required for heavy vehicle |
| Fatigue Management (Basic/Advanced) | 3 years | NHVR requirement |
| Dangerous Goods License | 5 years | If transporting DG |
| Forklift License | No expiry | If required |
| First Aid Certificate | 3 years | Company policy |
| Work Diary Training | N/A | One-time certification |
| Chain of Responsibility Training | As required | Company specific |
| Custom Item | User-defined | Flexible |

### Compliance Item Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Item Type | Select/Text | ✓ | From list or custom |
| License/Cert Number | Text | | Reference number |
| Issue Date | Date | | When issued |
| Expiry Date | Date | | Leave blank for no expiry |
| Issuing Authority | Text | | e.g., RMS, NHVR |
| Reminder Days | Number | | Days before to remind (default: 30, 14, 7) |
| Notes | Text | | Additional info |
| Document | File | | Upload PDF/image |

---

## Document Upload

### Document Storage

Each driver can have multiple documents attached:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Documents                                              [+ Upload Document] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Name                         Type              Uploaded        Actions     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  📄 License_Front.jpg         Driver's License  15 Jan 2026     👁️ 🗑️       │
│  📄 License_Back.jpg          Driver's License  15 Jan 2026     👁️ 🗑️       │
│  📄 Medical_Certificate.pdf   Medical Cert      20 Feb 2026     👁️ 🗑️       │
│  📄 Fatigue_Training.pdf      Training Cert     01 Sep 2023     👁️ 🗑️       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Upload Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Upload Document                                                        [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Document Type:  [Driver's License ▼]                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │              Drag & drop file here or click to browse               │   │
│  │                                                                     │   │
│  │              Supported: PDF, JPG, PNG (max 10MB)                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Link to Compliance Item: [Medical Certificate - expires 28 Mar 2026 ▼]    │
│                                                                             │
│                                           [Cancel]  [Upload]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Document Types

- Driver's License (front/back)
- Medical Certificate
- Training Certificates
- Dangerous Goods License
- Forklift License
- First Aid Certificate
- Employment Contract
- Induction Records
- Performance Reviews
- Other

---

## Driver Compliance Reports

### 1. Fleet Driver Summary Report

Overview of all drivers and their compliance status.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DRIVER COMPLIANCE SUMMARY                              Generated: 20 Mar 26│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Total Drivers: 12                                                          │
│  ────────────────                                                           │
│  🟢 Compliant:        8 (67%)                                               │
│  🟡 Due This Month:   2 (17%)                                               │
│  🔴 Overdue:          2 (16%)                                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ITEMS REQUIRING ATTENTION                                                  │
│  ─────────────────────────                                                  │
│                                                                             │
│  OVERDUE:                                                                   │
│  • Mike Wilson — Dangerous Goods License (expired 05 Mar 2026)              │
│  • Tom Davis — Medical Certificate (expired 10 Mar 2026)                    │
│                                                                             │
│  DUE THIS MONTH:                                                            │
│  • Sarah Jones — Driver's License (expires 28 Mar 2026)                     │
│  • Emma Brown — Fatigue Training (expires 30 Mar 2026)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Individual Driver Report

Detailed compliance report for a single driver.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DRIVER COMPLIANCE REPORT                               Generated: 20 Mar 26│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Driver: John Smith                                                         │
│  Employee ID: EMP-001                                                       │
│  Status: 🟢 COMPLIANT                                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMPLIANCE ITEMS                                                           │
│  ─────────────────                                                          │
│                                                                             │
│  ✓ Driver's License (HC)                                                    │
│    License #: NSW 12345678                                                  │
│    Expiry: 15 Mar 2027 (360 days remaining)                                 │
│    Document: ✓ Uploaded                                                     │
│                                                                             │
│  ✓ Medical Certificate                                                      │
│    Expiry: 01 Dec 2026 (256 days remaining)                                 │
│    Document: ✓ Uploaded                                                     │
│                                                                             │
│  ✓ Fatigue Management (Basic)                                               │
│    Cert #: FM-2024-12345                                                    │
│    Expiry: 01 Sep 2026 (165 days remaining)                                 │
│    Document: ✓ Uploaded                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  DOCUMENTS ON FILE: 5                                                       │
│  ─────────────────────                                                      │
│  • License_Front.jpg (15 Jan 2026)                                          │
│  • License_Back.jpg (15 Jan 2026)                                           │
│  • Medical_Certificate.pdf (20 Feb 2026)                                    │
│  • Fatigue_Training.pdf (01 Sep 2023)                                       │
│  • Employment_Contract.pdf (01 Mar 2024)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Expiry Calendar Report

Shows all upcoming expirations across the fleet.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DRIVER COMPLIANCE CALENDAR — March/April 2026          Generated: 20 Mar 26│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MARCH 2026                                                                 │
│  ──────────                                                                 │
│  05 Mar  🔴 Mike Wilson — Dangerous Goods License (OVERDUE)                 │
│  10 Mar  🔴 Tom Davis — Medical Certificate (OVERDUE)                       │
│  28 Mar  🟡 Sarah Jones — Driver's License                                  │
│  30 Mar  🟡 Emma Brown — Fatigue Training                                   │
│                                                                             │
│  APRIL 2026                                                                 │
│  ──────────                                                                 │
│  15 Apr  🟡 Chris Lee — Medical Certificate                                 │
│  22 Apr  🟡 Jane Miller — First Aid Certificate                             │
│                                                                             │
│  MAY 2026                                                                   │
│  ─────────                                                                  │
│  No items expiring                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Supabase Tables

```sql
-- Drivers table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  mobile TEXT NOT NULL,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  employee_id TEXT,
  start_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver compliance items
CREATE TABLE driver_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL,
  license_number TEXT,
  issue_date DATE,
  expiry_date DATE,  -- NULL = no expiry
  issuing_authority TEXT,
  reminder_days INTEGER[] DEFAULT '{30, 14, 7}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver documents
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  compliance_item_id UUID REFERENCES driver_compliance_items(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- Supabase Storage path
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_drivers_org ON drivers(organization_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_driver_compliance_expiry ON driver_compliance_items(expiry_date);
CREATE INDEX idx_driver_documents_driver ON driver_documents(driver_id);
```

### TypeScript Types

```typescript
interface Driver {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  mobile: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employeeId?: string;
  startDate?: Date;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed
  fullName: string;  // `${firstName} ${lastName}`
  complianceStatus: 'ok' | 'due_this_month' | 'overdue';
}

interface DriverComplianceItem {
  id: string;
  driverId: string;
  itemType: string;
  licenseNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;  // null = no expiry
  issuingAuthority?: string;
  reminderDays: number[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed
  status: 'ok' | 'due_soon' | 'overdue' | 'no_expiry';
  daysRemaining?: number;
}

interface DriverDocument {
  id: string;
  driverId: string;
  complianceItemId?: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

type ComplianceItemType = 
  | "Driver's License"
  | "Medical Certificate"
  | "Fatigue Management (Basic)"
  | "Fatigue Management (Advanced)"
  | "Dangerous Goods License"
  | "Forklift License"
  | "First Aid Certificate"
  | "Work Diary Training"
  | "Chain of Responsibility"
  | "Custom";
```

---

## Email Reminders

### Driver Compliance Reminders

Same framework as vehicle compliance:

```
Subject: ⚠️ Driver License Expiring — John Smith (28 days)

Hi [Fleet Manager],

The following driver compliance item is expiring soon:

Driver: John Smith
Item: Driver's License (HC)
License #: NSW 12345678
Expiry Date: 15 April 2026
Days Remaining: 28

Action Required: Please ensure renewal is in progress.

[View Driver] [View All Expiring Items]

---
Simply Transport
```

### Reminder Schedule

| Days Before | Alert Level |
|-------------|-------------|
| 30 days | Yellow — first reminder |
| 14 days | Yellow — second reminder |
| 7 days | Orange — urgent |
| 0 days (day of) | Red — expires today |
| Overdue | Red — daily until resolved |

---

## Dashboard Widget

### Driver Compliance Summary Card

```
┌─────────────────────────────────────┐
│  👤 Driver Compliance               │
├─────────────────────────────────────┤
│                                     │
│  12 Drivers                         │
│                                     │
│  🟢 8   Compliant                   │
│  🟡 2   Due This Month              │
│  🔴 2   Overdue                     │
│                                     │
│  [View All Drivers →]               │
└─────────────────────────────────────┘
```

---

## Testing Checklist

### Driver Management
- [ ] Can add new driver with required fields
- [ ] Can edit existing driver details
- [ ] Can deactivate/reactivate driver
- [ ] Can delete driver (with confirmation)
- [ ] Driver list shows correct status colours
- [ ] Search/filter works correctly
- [ ] Inactive drivers can be hidden/shown

### Compliance Items
- [ ] Can add compliance item to driver
- [ ] Can set item with no expiry date
- [ ] Status calculates correctly (OK/Due/Overdue)
- [ ] Can edit/delete compliance items
- [ ] Custom item types can be added

### Document Upload
- [ ] Can upload PDF documents
- [ ] Can upload JPG/PNG images
- [ ] File size limit enforced (10MB)
- [ ] Can link document to compliance item
- [ ] Can view uploaded documents
- [ ] Can delete documents
- [ ] Documents stored in Supabase Storage

### Reports
- [ ] Fleet summary report generates correctly
- [ ] Individual driver report shows all items
- [ ] Expiry calendar shows correct dates
- [ ] Reports can be exported (PDF/CSV)

### Reminders
- [ ] Email reminders sent at 30/14/7/0 days
- [ ] Overdue items send daily reminders
- [ ] Reminder preferences configurable

---

## Summary

| Feature | Location | Details |
|---------|----------|---------|
| Driver list view | /drivers | All drivers with status indicators |
| Driver profile | /drivers/[id] | Full details + compliance items |
| Compliance tracking | Driver profile | License, medical, training expiries |
| Document upload | Driver profile | PDF/image upload to Supabase Storage |
| Fleet summary report | /reports/drivers | Overview of all driver compliance |
| Individual report | /reports/drivers/[id] | Single driver detailed report |
| Expiry calendar | /reports/drivers/calendar | Upcoming expirations |
| Dashboard widget | /dashboard | Summary card with counts |
| Email reminders | Background job | 30/14/7/0 day notifications |
