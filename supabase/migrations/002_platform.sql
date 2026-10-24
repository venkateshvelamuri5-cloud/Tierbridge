-- Daily brief platform: subscribers, jobs, news, briefs, affiliates, sponsors,
-- click tracking and scam reports. Only the server (service role) touches
-- these tables, so RLS is on everywhere with no policies.

-- Subscribers: extend the waitlist so it can receive the brief.
alter table public.waitlist
  add column if not exists status text not null default 'active' check (status in ('active', 'unsubscribed')),
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz;
create unique index if not exists waitlist_unsubscribe_token_idx on public.waitlist (unsubscribe_token);

-- Company job boards the pipeline reads (public Greenhouse, Lever or Ashby boards).
create table if not exists public.job_sources (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('greenhouse', 'lever', 'ashby')),
  board text not null,
  company text not null,
  active boolean not null default true,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (provider, board)
);

create table if not exists public.jobs (
  id bigint generated always as identity primary key,
  source_key text unique,
  title text not null,
  company text not null,
  location text not null default '',
  url text not null,
  branches text[] not null default '{}',
  tags text[] not null default '{}',
  salary text,
  status text not null default 'pending' check (status in ('pending', 'live', 'closed', 'rejected')),
  featured_until timestamptz,
  origin text not null default 'pipeline' check (origin in ('pipeline', 'admin')),
  first_seen timestamptz not null default now(),
  last_checked timestamptz not null default now()
);
create index if not exists jobs_status_idx on public.jobs (status, last_checked desc);

create table if not exists public.news_items (
  id bigint generated always as identity primary key,
  url text not null unique,
  title text not null,
  source text not null,
  snippet text not null default '',
  feed_branch text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now()
);
create index if not exists news_items_branch_idx on public.news_items (feed_branch, fetched_at desc);

create table if not exists public.affiliate_offers (
  id bigint generated always as identity primary key,
  program text not null,
  title text not null,
  url text not null,
  skill_tags text[] not null default '{}',
  branches text[] not null default '{}',
  price_note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id bigint generated always as identity primary key,
  name text not null,
  branch text not null,
  message text not null,
  url text not null,
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.briefs (
  id bigint generated always as identity primary key,
  branch text not null check (branch in ('ECE', 'MECH', 'CIVIL', 'CSE')),
  brief_date date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'skipped')),
  subject text not null,
  intro text not null default '',
  skill jsonb not null,
  news jsonb not null default '[]',
  job_ids bigint[] not null default '{}',
  affiliate_offer_id bigint references public.affiliate_offers (id) on delete set null,
  sponsor_id bigint references public.sponsors (id) on delete set null,
  scam_note text not null default '',
  recipients integer,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (branch, brief_date)
);

create table if not exists public.clicks (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('job', 'news', 'skill', 'affiliate', 'sponsor')),
  target text not null,
  brief_id bigint references public.briefs (id) on delete set null,
  branch text,
  created_at timestamptz not null default now()
);
create index if not exists clicks_created_idx on public.clicks (created_at desc);

create table if not exists public.scam_reports (
  id bigint generated always as identity primary key,
  description text not null,
  url text,
  reporter_email text,
  status text not null default 'new' check (status in ('new', 'published', 'dismissed')),
  public_note text,
  created_at timestamptz not null default now()
);

alter table public.job_sources enable row level security;
alter table public.jobs enable row level security;
alter table public.news_items enable row level security;
alter table public.affiliate_offers enable row level security;
alter table public.sponsors enable row level security;
alter table public.briefs enable row level security;
alter table public.clicks enable row level security;
alter table public.scam_reports enable row level security;
