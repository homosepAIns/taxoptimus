-- ============================================================
-- TaxOptimus — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users see own profile" on public.profiles
  for all using (auth.uid() = id);

-- Documents (uploaded files)
create table public.documents (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  file_name    text not null,
  file_size    integer,
  file_type    text,
  storage_path text,
  status       text default 'processing' check (status in ('processing', 'extracted', 'error')),
  uploaded_at  timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Users manage own documents" on public.documents
  for all using (auth.uid() = user_id);

-- Transactions (extracted from bank statements / receipts)
create table public.transactions (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  document_id        uuid references public.documents(id) on delete set null,
  merchant           text,
  amount             numeric(10,2) not null,
  category           text,
  transaction_date   date,
  description        text,
  is_vat_applicable  boolean default false,
  vat_amount         numeric(10,2),
  geocoded_location  text,
  created_at         timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id);

-- Budget buckets (spending categories with limits)
create table public.budget_buckets (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  name           text not null,
  color_hex      text,
  monthly_limit  numeric(10,2),
  created_at     timestamptz default now()
);
alter table public.budget_buckets enable row level security;
create policy "Users manage own budget buckets" on public.budget_buckets
  for all using (auth.uid() = user_id);

-- Savings goals
create table public.savings_goals (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  target_amount   numeric(10,2) not null,
  current_amount  numeric(10,2) default 0,
  target_date     date,
  created_at      timestamptz default now()
);
alter table public.savings_goals enable row level security;
create policy "Users manage own savings goals" on public.savings_goals
  for all using (auth.uid() = user_id);

-- Asset allocation calculations
create table public.asset_allocations (
  id                       uuid default gen_random_uuid() primary key,
  user_id                  uuid references public.profiles(id) on delete cascade not null,
  monthly_surplus          numeric(10,2),
  age                      integer,
  risk_tolerance           text check (risk_tolerance in ('low', 'balanced', 'high')),
  prsa_percentage          integer default 50,
  etf_percentage           integer default 30,
  prize_bonds_percentage   integer default 20,
  calculated_at            timestamptz default now()
);
alter table public.asset_allocations enable row level security;
create policy "Users manage own allocations" on public.asset_allocations
  for all using (auth.uid() = user_id);

-- Landing-page calculator results (saved when user logs in after chat)
create table public.income_profiles (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references public.profiles(id) on delete cascade not null unique,
  -- Inputs
  gross_income            numeric(10,2) not null,
  tax_status              text not null check (tax_status in ('single','married-one','married-two','one-parent')),
  age                     integer not null check (age between 16 and 120),
  has_medical_card        boolean not null default false,
  -- Calculated deductions
  prsi_annual             numeric(10,2),
  usc_annual              numeric(10,2),
  income_tax_annual       numeric(10,2),
  net_monthly             numeric(10,2),
  -- Optional follow-up
  pension_monthly         numeric(10,2),
  potential_annual_saving numeric(10,2),
  created_at              timestamptz default now()
);
alter table public.income_profiles enable row level security;
create policy "Users manage own income profiles" on public.income_profiles
  for all using (auth.uid() = user_id);

-- Storage bucket for uploaded files
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict do nothing;

create policy "Users upload own documents" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own documents" on storage.objects
  for select using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
