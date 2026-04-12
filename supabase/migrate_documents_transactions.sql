-- Run this in your Supabase SQL editor if documents/transactions tables don't exist

create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  file_name    text not null,
  file_size    bigint not null default 0,
  file_type    text not null default '',
  storage_path text not null default '',
  status       text not null default 'processing' check (status in ('processing','extracted','error')),
  uploaded_at  timestamptz not null default now()
);

create table if not exists transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  document_id        uuid references documents(id) on delete set null,
  merchant           text not null default '',
  amount             numeric(12,2) not null default 0,
  category           text not null default 'Other',
  transaction_date   date not null default current_date,
  description        text not null default '',
  is_vat_applicable  boolean not null default false,
  vat_amount         numeric(12,2),
  geocoded_location  text,
  created_at         timestamptz not null default now()
);

-- Row Level Security
alter table documents    enable row level security;
alter table transactions enable row level security;

create policy "Users see own documents"    on documents    for all using (auth.uid() = user_id);
create policy "Users see own transactions" on transactions for all using (auth.uid() = user_id);
