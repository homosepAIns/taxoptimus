-- Comprehensive update to tax_profiles to match backend UserProfile and Investments schemas
-- This migration adds all missing fields required for full tax calculation and optimization.

ALTER TABLE public.tax_profiles 
-- Basic Profile Extension
ADD COLUMN IF NOT EXISTS age integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS marital_status text DEFAULT 'Single',
ADD COLUMN IF NOT EXISTS medical_card boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_year integer DEFAULT 2026,

-- Additional Income Streams
ADD COLUMN IF NOT EXISTS second_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rent_a_room_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS micro_generation_income numeric DEFAULT 0,

-- Life Circumstance Credits (Booleans)
ADD COLUMN IF NOT EXISTS is_blind boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_incapacitated_child boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claims_home_carer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claims_single_child_carer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claims_dependent_relative boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS widowed_years_since integer DEFAULT -1,

-- Additional Reliefs & Expenses
ADD COLUMN IF NOT EXISTS qualifying_tuition_fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS flat_rate_expense numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nursing_home_fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS employee_health_insurance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_tax_credits numeric DEFAULT 0,

-- Ensure calc_result exists for storing the engine's output
ADD COLUMN IF NOT EXISTS calc_result jsonb;
