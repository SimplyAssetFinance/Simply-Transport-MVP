-- Organizations table (one row per client account)
CREATE TABLE IF NOT EXISTS organizations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  admin_user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','essentials','fleet_pro','enterprise')),
  trial_ends_at          timestamptz DEFAULT (now() + interval '30 days'),
  tgp_addon              boolean NOT NULL DEFAULT false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- TGP per-vehicle toggle
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tgp_enabled boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_owner_select" ON organizations;
DROP POLICY IF EXISTS "org_owner_update" ON organizations;
CREATE POLICY "org_owner_select" ON organizations FOR SELECT USING (admin_user_id = auth.uid());
CREATE POLICY "org_owner_update" ON organizations FOR UPDATE USING (admin_user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS organizations_admin_user_id_idx ON organizations(admin_user_id);
