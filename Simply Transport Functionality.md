# Simply Transport Functionality

This document captures the functionality of the current Simply Transport Solutions site without any implementation details.

## Purpose

Provide a clear, implementation-agnostic feature list for the new version of the product.

## Users and Access

- User registration and login
- Secure authentication for fleet managers and administrators
- Password recovery and reset flow
- Role-aware access to fleet data and settings

## Fleet and Vehicle Management

- Add, edit, and remove vehicles in a fleet
- Store vehicle details: registration, make, model, year, VIN, type, status
- Track each vehicle separately for compliance and service
- Vehicle detail view with all associated records
- New vehicle creation workflow

## Driver Management

- Add, edit, and remove drivers
- Assign drivers to vehicles or view driver details
- Individual driver detail pages
- Driver list and filter view

## Compliance Tracking

- Track key compliance dates per vehicle
  - registration expiry
  - insurance expiry
  - service due date
  - custom compliance items
- Display upcoming compliance items and overdue items
- Visual compliance status indicators for priority
- Compliance summary dashboards and status cards

## Checklists and Inspections

- View checklist templates and standard item sets
- Complete pre-start or vehicle inspection checklists
- Record checklist responses with pass/fail and notes
- Store checklist submissions per vehicle

## Documents and Records

- Upload and store documents associated with vehicles and drivers
- View documents in a centralized documents section
- Document management for compliance evidence and records

## Fuel Pricing and Spend Visibility

- Fuel pricing dashboard for TGP pricing comparison
- Compare prices from major providers across terminals
- Fuel station lookup and terminal-based fuel pricing
- Fuel pricing map or locator for nearby stations
- Fuel import and fuel settings management
- Automatic fuel price snapshots taken on a set schedule and stored for historical analysis

## Dashboard and Notifications

- Main dashboard overview of fleet health and compliance
- Upcoming due items and alerts
- Notifications about expiring compliance items
- Notification settings to control reminders
- Settings to manage fuel import and fuel-related preferences

## Reporting

- Fleet reports and summary reports
- Compliance reporting and historical activity
- Audit log or change history reporting
- Export or view report summaries

## Settings and Administration

- Organization and account settings
- Notification preferences and reminder configuration
- Fuel import and fuel settings controls
- Fuel price snapshot configuration under settings, including snapshot frequency in hours
- Access to billing or subscription-related settings if needed

## Supporting Functionality

- Data validation for vehicle, driver, and compliance entries
- Search, filter, and sort across vehicles, drivers, and reports
- Responsive user experience for desktop workflows
- Persistent, user-specific data across sessions

## Functional Boundaries

- This product is designed as a fleet management and compliance platform for small-to-medium transport operators
- It focuses on vehicle compliance, driver management, fuel pricing visibility, and operational reporting
- It does not require a driver mobile app or telematics hardware in the first release

---

This file is intentionally focused on feature-level behavior and user-facing flows, not on technology or UI implementation details.