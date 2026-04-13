-- Adds calc_result storage and unique-per-user constraint to tax_profiles
-- Run this in the Supabase SQL editor after add_tax_profiles.sql

alter table tax_profiles
  add column if not exists calc_result jsonb;

-- Ensure only one tax profile row per user (so upsert works cleanly)
alter table tax_profiles
  drop constraint if exists tax_profiles_user_id_key;

alter table tax_profiles
  add constraint tax_profiles_user_id_key unique (user_id);
