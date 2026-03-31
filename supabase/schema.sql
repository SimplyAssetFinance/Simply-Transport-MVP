-- ============================================================
-- Simply Transport MVP — Database Schema
-- Run this in Supabase SQL Editor (project: kobbsdvuradwpmjgkhbc)
-- ============================================================

-- ─────────────────────────────────────────
-- Clean slate
-- ─────────────────────────────────────────

drop table if exists fuel_price_snapshots cascade;
drop table if exists user_fuel_settings cascade;
drop table if exists tgp_prices cascade;
drop table if exists vehicles cascade;

-- ─────────────────────────────────────────
-- Vehicles
-- ─────────────────────────────────────────

create table vehicles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  nickname              text not null,
  registration_plate    text not null,
  make                  text,
  model                 text,
  year                  int,
  vehicle_type          text check (vehicle_type in ('truck','trailer','ute','van','other')),
  rego_state            text,
  rego_expiry           date,
  insurance_expiry      date,
  insurance_provider    text,
  next_service_date     date,
  service_interval_km   int,
  current_odometer      int,
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table vehicles enable row level security;

create policy "Users manage own vehicles"
  on vehicles for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────
-- TGP Prices
-- ─────────────────────────────────────────

create table tgp_prices (
  id                 uuid primary key default gen_random_uuid(),
  date               date not null,
  terminal           text not null,
  shell_viva         numeric(6,2),
  bp                 numeric(6,2),
  ampol              numeric(6,2),
  cheapest_provider  text,
  spread             numeric(5,2),
  created_at         timestamptz default now(),
  unique (date, terminal)
);

alter table tgp_prices enable row level security;

create policy "Auth users read tgp_prices"
  on tgp_prices for select
  using ((select auth.role()) = 'authenticated');

create policy "Service role manages tgp_prices"
  on tgp_prices for all
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- ─────────────────────────────────────────
-- User Fuel Settings
-- ─────────────────────────────────────────

create table user_fuel_settings (
  user_id                  uuid primary key references auth.users(id) on delete cascade not null,
  fuel_cards               jsonb default '[]' not null,
  snapshot_frequency_hours int default 24 not null,
  updated_at               timestamptz default now()
);

alter table user_fuel_settings enable row level security;

create policy "Users manage own user_fuel_settings"
  on user_fuel_settings for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant all on user_fuel_settings to authenticated;

-- ─────────────────────────────────────────
-- Fuel Price Snapshots
-- ─────────────────────────────────────────

create table fuel_price_snapshots (
  id                uuid primary key default gen_random_uuid(),
  snapshot_at       timestamptz not null default now(),
  date              date not null,
  terminal          text not null,
  shell_viva        numeric(6,2),
  bp                numeric(6,2),
  ampol             numeric(6,2),
  ior               numeric(6,2),
  cheapest_provider text,
  spread            numeric(5,2)
);

alter table fuel_price_snapshots enable row level security;

create policy "Auth users read fuel_price_snapshots"
  on fuel_price_snapshots for select
  using ((select auth.role()) = 'authenticated');

create policy "Service role manages fuel_price_snapshots"
  on fuel_price_snapshots for all
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

grant select on fuel_price_snapshots to authenticated;
grant all on fuel_price_snapshots to service_role;

-- ─────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant all    on vehicles    to authenticated;
grant select on tgp_prices  to authenticated;
grant all    on tgp_prices  to service_role;
