ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS eiis_max_willing numeric(10,2) DEFAULT 0;
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS deeds_max_willing numeric(10,2) DEFAULT 0;
