-- ============================================================
-- Simply Transport MVP — Phase 1 Features Migration
-- Run this in Supabase SQL Editor (project: kobbsdvuradwpmjgkhbc)
-- ============================================================

-- ─────────────────────────────────────────
-- Add prime_mover to vehicle_type
-- ─────────────────────────────────────────

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_vehicle_type_check
  CHECK (vehicle_type IN ('truck','prime_mover','trailer','ute','van','other'));

-- ─────────────────────────────────────────
-- KM Logs
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS km_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  odometer    INT         NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE km_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own km_logs"
  ON km_logs FOR ALL
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT ALL ON km_logs TO authenticated;

-- ─────────────────────────────────────────
-- Checklists (templates)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  items       JSONB       NOT NULL DEFAULT '[]',  -- [{label: string, required: boolean}]
  is_default  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checklists"
  ON checklists FOR ALL
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT ALL ON checklists TO authenticated;

-- ─────────────────────────────────────────
-- Checklist Submissions
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_submissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID        REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  checklist_id  UUID        REFERENCES checklists(id) ON DELETE SET NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  responses     JSONB       NOT NULL DEFAULT '{}',  -- {item_label: {checked: bool, notes: string}}
  passed        BOOLEAN,
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checklist_submissions"
  ON checklist_submissions FOR ALL
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT ALL ON checklist_submissions TO authenticated;

-- ─────────────────────────────────────────
-- Audit Logs
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,   -- vehicle_created, km_logged, checklist_submitted, etc.
  entity_type  TEXT,                   -- vehicle, checklist, km_log, document, maintenance
  entity_id    UUID,
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audit_logs"
  ON audit_logs FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users insert own audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- ─────────────────────────────────────────
-- Notification Settings
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id         UUID      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_days   INT[]     DEFAULT '{30,14,7,1}',
  daily_summary   BOOLEAN   DEFAULT TRUE,
  email_enabled   BOOLEAN   DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification_settings"
  ON notification_settings FOR ALL
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT ALL ON notification_settings TO authenticated;
