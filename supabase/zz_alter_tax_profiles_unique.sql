ALTER TABLE tax_profiles DROP CONSTRAINT IF EXISTS tax_profiles_user_id_key;
ALTER TABLE tax_profiles ADD CONSTRAINT tax_profiles_user_id_key UNIQUE (user_id);
