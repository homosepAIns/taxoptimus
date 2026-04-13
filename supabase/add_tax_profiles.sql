-- Creates the tax_profiles table for extended Irish tax details
-- Run this in the Supabase SQL editor

create table if not exists tax_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references auth.users(id) on delete cascade not null,
  employment_type             text not null default 'PAYE',
  remote_working_days         int  not null default 0,
  annual_wfh_utility_costs    numeric not null default 0,
  annual_rent_paid            numeric not null default 0,
  qualifying_health_expenses  numeric not null default 0,
  bik                         numeric not null default 0,
  employer_health_premium     numeric not null default 0,
  created_at                  timestamptz default now()
);

alter table tax_profiles enable row level security;

create policy "Users can manage own tax profiles"
  on tax_profiles for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
