-- Fix savings_goals FK: reference auth.users directly instead of public.profiles
-- Same fix that was applied to documents and transactions tables

alter table public.savings_goals
  drop constraint savings_goals_user_id_fkey;

alter table public.savings_goals
  add constraint savings_goals_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
