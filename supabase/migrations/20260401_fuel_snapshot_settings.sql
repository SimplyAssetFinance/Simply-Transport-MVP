-- 2026-04-01 — Fuel snapshot settings and snapshot storage

-- User fuel settings table
CREATE TABLE IF NOT EXISTS user_fuel_settings (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fuel_cards              jsonb DEFAULT '[]' NOT NULL,
  snapshot_frequency_hours int DEFAULT 24 NOT NULL,
  updated_at              timestamptz DEFAULT NOW()
);

ALTER TABLE user_fuel_settings
  ADD COLUMN IF NOT EXISTS fuel_cards jsonb DEFAULT '[]' NOT NULL;
ALTER TABLE user_fuel_settings
  ADD COLUMN IF NOT EXISTS snapshot_frequency_hours int DEFAULT 24 NOT NULL;
ALTER TABLE user_fuel_settings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

DROP POLICY IF EXISTS "Users manage own user_fuel_settings" ON user_fuel_settings;
CREATE POLICY "Users manage own user_fuel_settings"
  ON user_fuel_settings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT ALL ON user_fuel_settings TO authenticated;

-- Fuel price snapshots table
CREATE TABLE IF NOT EXISTS fuel_price_snapshots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at       timestamptz NOT NULL DEFAULT NOW(),
  date              date NOT NULL,
  terminal          text NOT NULL,
  shell_viva        numeric(6,2),
  bp                numeric(6,2),
  ampol             numeric(6,2),
  ior               numeric(6,2),
  cheapest_provider text,
  spread            numeric(5,2)
);

DROP POLICY IF EXISTS "Auth users read fuel_price_snapshots" ON fuel_price_snapshots;
CREATE POLICY "Auth users read fuel_price_snapshots"
  ON fuel_price_snapshots FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role manages fuel_price_snapshots" ON fuel_price_snapshots;
CREATE POLICY "Service role manages fuel_price_snapshots"
  ON fuel_price_snapshots FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

GRANT SELECT ON fuel_price_snapshots TO authenticated;
GRANT ALL ON fuel_price_snapshots TO service_role;
