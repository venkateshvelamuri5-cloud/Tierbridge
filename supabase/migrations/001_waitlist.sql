-- Waitlist for the daily brief. Only the server (service role) reads or writes it.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  branch text not null check (branch in ('CSE','IT','ECE','MECH','CIVIL','BCA','MCA')),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
-- No policies on purpose: the anon and authenticated roles get no access.
