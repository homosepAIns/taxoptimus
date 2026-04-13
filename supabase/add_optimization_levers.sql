-- Add Optimization Levers and Preferences to tax_profiles
-- This script expands the profile to store investment choices and optimization targets.

ALTER TABLE public.tax_profiles 
ADD COLUMN IF NOT EXISTS required_liquid_cash numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pension_contribution numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS voucher_allocation numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cycle_to_work numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cycle_type text DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS cycle_to_work_mode text DEFAULT 'annual',
ADD COLUMN IF NOT EXISTS travel_pass numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS income_protection_premium numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS charitable_donations numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS eiis_investment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS deeds_of_covenant numeric DEFAULT 0,
-- Utility Weights (How much you value €1 in these buckets vs €1 cash)
ADD COLUMN IF NOT EXISTS weight_pension numeric DEFAULT 1.2,
ADD COLUMN IF NOT EXISTS weight_cycle numeric DEFAULT 0.85,
ADD COLUMN IF NOT EXISTS weight_travel numeric DEFAULT 0.95,
ADD COLUMN IF NOT EXISTS weight_ip numeric DEFAULT 0.0;
