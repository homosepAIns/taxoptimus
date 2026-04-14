-- ============================================================
-- Migration: update income_profiles table
-- Run this in Supabase SQL Editor ONLY if you already ran
-- schema.sql and the old income_profiles table exists.
-- If you are running schema.sql fresh, skip this file.
-- ============================================================

-- Drop old table and recreate with new columns
-- (no prod data yet, so drop+recreate is safe)
drop table if exists public.income_profiles;

create table public.income_profiles (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references public.profiles(id) on delete cascade not null unique,
  -- Inputs collected in the landing-page chat
  gross_income            numeric(10,2) not null,
  tax_status              text not null check (tax_status in ('single','married-one','married-two','one-parent')),
  age                     integer not null check (age between 16 and 120),
  has_medical_card        boolean not null default false,
  -- Calculated deductions (2024 Irish tax rules)
  prsi_annual             numeric(10,2),
  usc_annual              numeric(10,2),
  income_tax_annual       numeric(10,2),
  net_monthly             numeric(10,2),
  -- Optional follow-up (pension optimisation path)
  pension_monthly         numeric(10,2),
  potential_annual_saving numeric(10,2),
  created_at              timestamptz default now()
);

alter table public.income_profiles enable row level security;

create policy "Users manage own income profiles" on public.income_profiles
  for all using (auth.uid() = user_id);
