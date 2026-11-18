-- =====================================================================
-- Tierbridge society platform: database setup
-- Everything lives in the `tb` schema, apart from Swarna Sai Nivas's
-- original tables in `public`. Run once in Supabase → SQL Editor, then
-- add `tb` to Settings → API → Exposed schemas.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists tb;
grant usage on schema tb to anon, authenticated;

-- ---------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------

create table tb.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  name    text
);

create table tb.templates (
  id          text primary key,
  name        text not null,
  description text not null,
  layout      jsonb not null,
  sort        int not null default 100
);

create table tb.leads (
  id           uuid primary key default gen_random_uuid(),
  society_name text not null check (length(trim(society_name)) between 2 and 120),
  city         text not null check (length(trim(city)) between 2 and 80),
  flats        int not null check (flats between 2 and 5000),
  role         text,
  name         text not null check (length(trim(name)) between 2 and 80),
  mobile       text not null check (length(regexp_replace(mobile, '\D', '', 'g')) between 10 and 13),
  email        text,
  status       text not null default 'new' check (status in ('new','contacted','onboarded','not_interested')),
  note         text,
  created_at   timestamptz not null default now()
);

create table tb.platform_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      uuid,
  society_id uuid,
  action     text not null,
  summary    text not null,
  details    jsonb
);

-- ---------------------------------------------------------------------
-- Societies and their buildings
-- ---------------------------------------------------------------------

create table tb.societies (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name             text not null,
  city             text not null,
  address          text,
  template_id      text references tb.templates,
  upi_id           text,
  payee_name       text,
  qr_path          text,
  opening_balance  numeric(12,2) not null default 0,
  start_month      date not null default date_trunc('month', now())::date check (extract(day from start_month) = 1),
  due_day          int not null default 10 check (due_day between 1 and 28),
  phone_visibility text not null default 'all' check (phone_visibility in ('all','admins')),
  status           text not null default 'trial' check (status in ('trial','active','read_only','cancelled')),
  trial_ends_on    date not null default (current_date + 30),
  paid_until       date,
  created_at       timestamptz not null default now(),
  created_by       uuid
);

create table tb.blocks (
  id         uuid primary key default gen_random_uuid(),
  society_id uuid not null references tb.societies on delete cascade,
  name       text not null,
  sort       int not null default 0
);

create table tb.unit_plans (
  id         uuid primary key default gen_random_uuid(),
  society_id uuid not null references tb.societies on delete cascade,
  name       text not null,
  area_sqft  int,
  unique (society_id, name)
);

create table tb.units (
  id         uuid primary key default gen_random_uuid(),
  society_id uuid not null references tb.societies on delete cascade,
  block_id   uuid not null references tb.blocks on delete cascade,
  floor      int not null,
  number     text not null,
  plan_id    uuid references tb.unit_plans on delete set null,
  has_tenant boolean not null default false,
  unique (society_id, number)
);
create index on tb.units (society_id);

-- One row per login. A login belongs to one society, and to one flat as
-- its owner or tenant. Admin is a role an owner holds.
create table tb.members (
  user_id              uuid primary key references auth.users on delete cascade,
  society_id           uuid not null references tb.societies on delete cascade,
  unit_id              uuid not null references tb.units on delete cascade,
  role                 text not null check (role in ('owner','tenant')),
  login_id             text not null,
  is_admin             boolean not null default false,
  full_name            text,
  phone                text,
  must_change_password boolean not null default true,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  unique (society_id, login_id),
  check (not is_admin or role = 'owner')
);
create index on tb.members (society_id);

-- ---------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------

-- Maintenance per month. plan_id null = every flat; a row with a plan
-- overrides it for flats of that plan.
create table tb.rates (
  id             uuid primary key default gen_random_uuid(),
  society_id     uuid not null references tb.societies on delete cascade,
  plan_id        uuid references tb.unit_plans on delete cascade,
  effective_from date not null check (extract(day from effective_from) = 1),
  amount         numeric(10,2) not null check (amount > 0)
);
create unique index rates_one_per_month on tb.rates (society_id, coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from);

create table tb.payments (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references tb.societies on delete cascade,
  unit_id         uuid not null references tb.units on delete cascade,
  month           date not null check (extract(day from month) = 1),
  amount          numeric(10,2) not null check (amount > 0),
  method          text not null check (method in ('upi','cash','bank')),
  utr             text,
  paid_on         date not null,
  screenshot_path text,
  note            text,
  status          text not null default 'marked' check (status in ('marked','verified','rejected')),
  marked_by       uuid,
  marked_at       timestamptz not null default now(),
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  review_note     text,
  unique (unit_id, month),
  check (method = 'cash' or length(trim(coalesce(utr,''))) >= 6)
);
create index on tb.payments (society_id, month);

create table tb.expenses (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references tb.societies on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  category     text not null,
  amount       numeric(12,2) not null check (amount > 0),
  spent_on     date not null,
  paid_by      text,
  bill_path    text,
  notes        text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_by uuid,
  submitted_at timestamptz not null default now(),
  reviewed_by  uuid,
  reviewed_at  timestamptz,
  review_note  text
);
create index on tb.expenses (society_id, spent_on);

-- ---------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------

create table tb.notices (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references tb.societies on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  body            text not null default '',
  attachment_path text,
  pinned          boolean not null default false,
  expires_on      date,
  created_by      uuid,
  created_at      timestamptz not null default now()
);
create index on tb.notices (society_id, created_at desc);

create table tb.notice_reads (
  notice_id uuid not null references tb.notices on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  read_at   timestamptz not null default now(),
  primary key (notice_id, user_id)
);

create table tb.tickets (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references tb.societies on delete cascade,
  unit_id     uuid references tb.units on delete set null,
  kind        text not null check (kind in ('issue','grievance')),
  category    text not null,
  title       text not null check (length(trim(title)) > 0),
  body        text not null default '',
  photo_path  text,
  anonymous   boolean not null default false,
  status      text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on tb.tickets (society_id, created_at desc);

create table tb.ticket_updates (
  id         bigserial primary key,
  ticket_id  uuid not null references tb.tickets on delete cascade,
  society_id uuid not null references tb.societies on delete cascade,
  author     uuid,
  body       text not null default '',
  new_status text,
  created_at timestamptz not null default now()
);

-- Who raised an anonymous grievance. Readable only by that person.
create table tb.ticket_owners (
  ticket_id uuid primary key references tb.tickets on delete cascade,
  user_id   uuid not null references auth.users on delete cascade
);

create function tb.owns_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = tb as $$
  select exists (select 1 from tb.tickets t where t.id = p_ticket and t.created_by = auth.uid())
      or exists (select 1 from tb.ticket_owners o where o.ticket_id = p_ticket and o.user_id = auth.uid())
$$;

create table tb.activity_log (
  id         bigserial primary key,
  society_id uuid not null references tb.societies on delete cascade,
  at         timestamptz not null default now(),
  actor      uuid,
  actor_name text not null,
  action     text not null,
  summary    text not null,
  entity     text,
  entity_id  text,
  details    jsonb
);
create index on tb.activity_log (society_id, at desc);

create table tb.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  society_id     uuid not null references tb.societies on delete cascade,
  price_per_flat numeric(10,2) not null default 50 check (price_per_flat >= 0),
  discount_pct   numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  fixed_amount   numeric(12,2) check (fixed_amount >= 0),
  term_years     int not null default 1 check (term_years between 1 and 5),
  starts_on      date not null default current_date,
  ends_on        date not null,
  flats          int not null,
  amount_due     numeric(12,2) not null,
  amount_paid    numeric(12,2),
  payment_ref    text,
  paid_on        date,
  status         text not null default 'pending' check (status in ('pending','paid','cancelled')),
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);
create index on tb.subscriptions (society_id, created_at desc);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create function tb.is_platform_admin() returns boolean
language sql stable security definer set search_path = tb as $$
  select exists (select 1 from tb.platform_admins where user_id = auth.uid())
$$;

create function tb.is_member(soc uuid) returns boolean
language sql stable security definer set search_path = tb as $$
  select tb.is_platform_admin()
      or exists (select 1 from tb.members where user_id = auth.uid() and society_id = soc and active)
$$;

create function tb.is_soc_admin(soc uuid) returns boolean
language sql stable security definer set search_path = tb as $$
  select tb.is_platform_admin()
      or exists (select 1 from tb.members where user_id = auth.uid() and society_id = soc and active and is_admin)
$$;

create function tb.my_unit() returns uuid
language sql stable security definer set search_path = tb as $$
  select unit_id from tb.members where user_id = auth.uid() and active
$$;

create function tb.actor_label() returns text
language sql stable security definer set search_path = tb as $$
  select coalesce(
    (select login_id || coalesce(' (' || nullif(trim(full_name), '') || ')', '') from tb.members where user_id = auth.uid()),
    (select 'Tierbridge admin' where tb.is_platform_admin()),
    'System')
$$;

create function tb.inr(n numeric) returns text language sql immutable as $$
  select '₹' || case when n = trunc(n) then to_char(n, 'FM99,99,99,990') else to_char(n, 'FM99,99,99,990.00') end
$$;

create function tb.log(p_society uuid, p_action text, p_summary text, p_entity text, p_entity_id text, p_details jsonb default null)
returns void language sql security definer set search_path = tb as $$
  insert into tb.activity_log (society_id, actor, actor_name, action, summary, entity, entity_id, details)
  values (p_society, auth.uid(), tb.actor_label(), p_action, p_summary, p_entity, p_entity_id, p_details)
$$;

create function tb.plog(p_society uuid, p_action text, p_summary text, p_details jsonb default null)
returns void language sql security definer set search_path = tb as $$
  insert into tb.platform_log (actor, society_id, action, summary, details)
  values (auth.uid(), p_society, p_action, p_summary, p_details)
$$;

-- A society can be changed only while its trial runs or its subscription is paid.
create function tb.is_writable(soc uuid) returns boolean
language sql stable security definer set search_path = tb as $$
  select coalesce((select case
      when status = 'active' then coalesce(paid_until, current_date) >= current_date
      when status = 'trial'  then trial_ends_on >= current_date
      else false end from tb.societies where id = soc), false)
$$;

create function tb.require_writable(soc uuid) returns void
language plpgsql stable security definer set search_path = tb as $$
begin
  if auth.uid() is not null and not tb.is_platform_admin() and not tb.is_writable(soc) then
    raise exception 'This society is read-only until its subscription is renewed. An admin can upgrade from Settings.';
  end if;
end $$;

create function tb.rate_for(p_unit uuid, m date) returns numeric
language sql stable security definer set search_path = tb as $$
  select r.amount from tb.rates r join tb.units u on u.society_id = r.society_id
   where u.id = p_unit and r.effective_from <= date_trunc('month', m)::date
     and (r.plan_id is null or r.plan_id = u.plan_id)
   order by (r.plan_id is not null) desc, r.effective_from desc limit 1
$$;

create function tb.unit_label(p_unit uuid) returns text
language sql stable security definer set search_path = tb as $$
  select 'Flat ' || number from tb.units where id = p_unit
$$;

revoke execute on function tb.log(uuid,text,text,text,text,jsonb), tb.plog(uuid,text,text,jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Public lookups (no sign-in needed)
-- ---------------------------------------------------------------------

create function tb.society_public(p_slug text)
returns table (id uuid, slug text, name text, city text, flats bigint)
language sql stable security definer set search_path = tb as $$
  select s.id, s.slug, s.name, s.city, (select count(*) from tb.units u where u.society_id = s.id)
    from tb.societies s where s.slug = lower(p_slug) and s.status <> 'cancelled'
$$;

create function tb.search_societies(q text)
returns table (slug text, name text, city text, flats bigint)
language sql stable security definer set search_path = tb as $$
  select s.slug, s.name, s.city, (select count(*) from tb.units u where u.society_id = s.id)
    from tb.societies s
   where s.status <> 'cancelled' and length(trim(q)) >= 2
     and (s.name ilike '%' || trim(q) || '%' or s.city ilike '%' || trim(q) || '%')
   order by s.name limit 10
$$;

grant execute on function tb.society_public(text), tb.search_societies(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Payments: rules and log
-- ---------------------------------------------------------------------

create function tb.payments_before() returns trigger
language plpgsql security definer set search_path = tb as $$
declare adm boolean;
begin
  new.society_id := (select society_id from tb.units where id = new.unit_id);
  adm := tb.is_soc_admin(new.society_id);
  perform tb.require_writable(new.society_id);
  new.month := date_trunc('month', new.month)::date;
  new.utr := nullif(trim(coalesce(new.utr, '')), '');
  if tg_op = 'UPDATE' and (new.unit_id <> old.unit_id or new.month <> old.month) then
    raise exception 'The flat and month of a payment cannot be changed';
  end if;
  if not adm then
    if new.unit_id is distinct from tb.my_unit() then raise exception 'You can only mark payments for your own flat'; end if;
    if tg_op = 'UPDATE' and old.status = 'verified' then raise exception 'This payment is already verified. Ask an admin to change it.'; end if;
    new.status := 'marked'; new.amount := tb.rate_for(new.unit_id, new.month);
    new.marked_by := auth.uid(); new.marked_at := now();
    new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
  else
    if new.amount is null then new.amount := tb.rate_for(new.unit_id, new.month); end if;
    if tg_op = 'INSERT' then
      new.marked_by := auth.uid(); new.marked_at := now();
      if new.status <> 'marked' then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
    else
      new.marked_by := old.marked_by; new.marked_at := old.marked_at;
      if new.status is distinct from old.status then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
    end if;
  end if;
  if new.amount is null then
    raise exception 'No maintenance amount is set for %. An admin must add it in Settings.', to_char(new.month, 'Mon YYYY');
  end if;
  return new;
end $$;
create trigger payments_before before insert or update on tb.payments for each row execute function tb.payments_before();

create function tb.payments_after() returns trigger
language plpgsql security definer set search_path = tb as $$
declare
  label text := tb.unit_label(new.unit_id) || ', ' || to_char(new.month, 'Mon YYYY');
  how text := case new.method when 'cash' then 'cash' when 'bank' then 'bank transfer' else 'UPI' end || coalesce(', ref ' || new.utr, '');
  act text; msg text;
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'marked_at') = (to_jsonb(old) - 'marked_at') then return new; end if;
  if tg_op = 'INSERT' and new.status = 'verified' then act := 'payment_recorded'; msg := 'Recorded ' || label || ' as paid: ' || tb.inr(new.amount) || ' by ' || how;
  elsif tg_op = 'INSERT' then act := 'payment_marked'; msg := 'Marked ' || label || ' as paid: ' || tb.inr(new.amount) || ' by ' || how || ' on ' || to_char(new.paid_on, 'DD Mon YYYY');
  elsif new.status is distinct from old.status and new.status = 'verified' then act := 'payment_verified'; msg := 'Verified payment for ' || label;
  elsif new.status is distinct from old.status and new.status = 'rejected' then act := 'payment_rejected'; msg := 'Marked ' || label || ' as NOT paid' || coalesce(' — ' || new.review_note, '');
  elsif new.status is distinct from old.status then act := 'payment_marked'; msg := 'Re-marked ' || label || ' as paid: ' || tb.inr(new.amount) || ' by ' || how;
  else act := 'payment_edited'; msg := 'Edited payment for ' || label || ': ' || tb.inr(new.amount) || ' by ' || how;
  end if;
  perform tb.log(new.society_id, act, msg, 'payment', new.id::text,
    jsonb_build_object('before', case when tg_op = 'UPDATE' then to_jsonb(old) end, 'after', to_jsonb(new)));
  return new;
end $$;
create trigger payments_after after insert or update on tb.payments for each row execute function tb.payments_after();

-- ---------------------------------------------------------------------
-- Expenses: rules and log
-- ---------------------------------------------------------------------

create function tb.expenses_before() returns trigger
language plpgsql security definer set search_path = tb as $$
declare adm boolean := tb.is_soc_admin(new.society_id);
begin
  perform tb.require_writable(new.society_id);
  if tg_op = 'INSERT' then
    new.submitted_by := auth.uid(); new.submitted_at := now();
    if adm then
      if new.bill_path is null then raise exception 'A photo of the bill or receipt is required for every expense an admin adds'; end if;
      new.status := 'approved'; new.reviewed_by := auth.uid(); new.reviewed_at := now();
    else
      new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
    end if;
  else
    if not adm then raise exception 'Only admins can change expenses'; end if;
    if new.society_id <> old.society_id then raise exception 'An expense cannot move to another society'; end if;
    new.submitted_by := old.submitted_by; new.submitted_at := old.submitted_at;
    if new.status is distinct from old.status then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger expenses_before before insert or update on tb.expenses for each row execute function tb.expenses_before();

create function tb.expenses_after() returns trigger
language plpgsql security definer set search_path = tb as $$
declare label text := new.title || ' (' || tb.inr(new.amount) || ', ' || new.category || ')'; act text; msg text;
begin
  if tg_op = 'INSERT' and new.status = 'approved' then act := 'expense_added'; msg := 'Added expense ' || label;
  elsif tg_op = 'INSERT' then act := 'expense_submitted'; msg := 'Submitted expense for approval: ' || label;
  elsif new.status is distinct from old.status and new.status = 'approved' then act := 'expense_approved'; msg := 'Approved expense ' || label;
  elsif new.status is distinct from old.status and new.status = 'rejected' then act := 'expense_rejected'; msg := 'Rejected expense ' || label || coalesce(' — ' || new.review_note, '');
  else act := 'expense_edited'; msg := 'Edited expense ' || label || case when new.amount <> old.amount then ' (amount was ' || tb.inr(old.amount) || ')' else '' end;
  end if;
  perform tb.log(new.society_id, act, msg, 'expense', new.id::text,
    jsonb_build_object('before', case when tg_op = 'UPDATE' then to_jsonb(old) end, 'after', to_jsonb(new)));
  return new;
end $$;
create trigger expenses_after after insert or update on tb.expenses for each row execute function tb.expenses_after();

-- ---------------------------------------------------------------------
-- Notices and complaints
-- ---------------------------------------------------------------------

create function tb.notices_before() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  perform tb.require_writable(new.society_id);
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.created_at := now();
  else new.created_by := old.created_by; new.created_at := old.created_at; new.society_id := old.society_id; end if;
  return new;
end $$;
create trigger notices_before before insert or update on tb.notices for each row execute function tb.notices_before();

create function tb.notices_after() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if tg_op = 'DELETE' then perform tb.log(old.society_id, 'notice_removed', 'Removed notice "' || old.title || '"', 'notice', old.id::text); return old; end if;
  perform tb.log(new.society_id, case when tg_op = 'INSERT' then 'notice_posted' else 'notice_edited' end,
    case when tg_op = 'INSERT' then 'Posted notice "' else 'Edited notice "' end || new.title || '"', 'notice', new.id::text);
  return new;
end $$;
create trigger notices_after after insert or update or delete on tb.notices for each row execute function tb.notices_after();

create function tb.tickets_before() returns trigger
language plpgsql security definer set search_path = tb as $$
declare adm boolean := tb.is_soc_admin(new.society_id);
begin
  perform tb.require_writable(new.society_id);
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.created_at := now(); new.updated_at := now();
    new.unit_id := coalesce(tb.my_unit(), new.unit_id);
    new.status := 'open';
    if new.kind <> 'grievance' then new.anonymous := false; end if;
    if new.anonymous then new.created_by := null; new.unit_id := null; end if;
  else
    if new.society_id <> old.society_id or new.created_by is distinct from old.created_by or new.kind <> old.kind
       or new.anonymous <> old.anonymous or new.unit_id is distinct from old.unit_id then
      raise exception 'This complaint cannot be moved';
    end if;
    if not adm then
      if not tb.owns_ticket(old.id) then raise exception 'Only admins and the person who raised it can change a complaint'; end if;
      -- the person who raised it can only confirm it is fixed (closed) or reopen it
      if new.status not in ('closed','open') or new.title <> old.title or new.body <> old.body then
        raise exception 'You can close or reopen your complaint; admins update everything else';
      end if;
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger tickets_before before insert or update on tb.tickets for each row execute function tb.tickets_before();

create function tb.tickets_after() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if tg_op = 'INSERT' and new.anonymous then
    insert into tb.ticket_owners (ticket_id, user_id) values (new.id, auth.uid());
    insert into tb.activity_log (society_id, actor, actor_name, action, summary, entity, entity_id)
    values (new.society_id, null, 'Anonymous', 'ticket_raised', 'Raised a private grievance', 'ticket', new.id::text);
  elsif tg_op = 'INSERT' then
    perform tb.log(new.society_id, 'ticket_raised',
      case when new.kind = 'grievance' then 'Raised a private grievance' else 'Raised an issue: "' || new.title || '"' end, 'ticket', new.id::text);
  elsif new.status is distinct from old.status and new.anonymous and tb.owns_ticket(new.id) then
    insert into tb.ticket_updates (ticket_id, society_id, author, new_status) values (new.id, new.society_id, null, new.status);
    insert into tb.activity_log (society_id, actor, actor_name, action, summary, entity, entity_id)
    values (new.society_id, null, 'Anonymous', 'ticket_status', 'Grievance is now ' || replace(new.status, '_', ' '), 'ticket', new.id::text);
  elsif new.status is distinct from old.status then
    insert into tb.ticket_updates (ticket_id, society_id, author, new_status) values (new.id, new.society_id, auth.uid(), new.status);
    perform tb.log(new.society_id, 'ticket_status',
      case when new.kind = 'grievance' then 'Grievance' else 'Issue "' || new.title || '"' end || ' is now ' || replace(new.status, '_', ' '), 'ticket', new.id::text);
  end if;
  return new;
end $$;
create trigger tickets_after after insert or update on tb.tickets for each row execute function tb.tickets_after();

create function tb.ticket_updates_before() returns trigger
language plpgsql security definer set search_path = tb as $$
declare t tb.tickets;
begin
  select * into t from tb.tickets where id = new.ticket_id;
  new.society_id := t.society_id; new.author := auth.uid(); new.created_at := now();
  if new.new_status is not null and current_setting('tb.internal', true) is distinct from 'on' then new.new_status := null; end if;
  perform tb.require_writable(t.society_id);
  if not (tb.is_soc_admin(t.society_id) or tb.owns_ticket(t.id) or (t.kind = 'issue' and tb.is_member(t.society_id))) then
    raise exception 'You cannot reply to this complaint';
  end if;
  if t.anonymous and tb.owns_ticket(t.id) then new.author := null; end if;
  return new;
end $$;
-- Status rows come from the tickets trigger, which runs as the table owner.
create trigger ticket_updates_before before insert on tb.ticket_updates for each row
when (pg_trigger_depth() = 0) execute function tb.ticket_updates_before();

-- ---------------------------------------------------------------------
-- Members, units, societies, rates: guards and log
-- ---------------------------------------------------------------------

create function tb.members_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if new.user_id <> old.user_id or new.society_id <> old.society_id or new.unit_id <> old.unit_id
     or new.role <> old.role or new.login_id <> old.login_id then
    raise exception 'Login IDs, flats and roles cannot be changed';
  end if;
  if new.is_admin <> old.is_admin then
    if not tb.is_soc_admin(old.society_id) then raise exception 'Only admins can change admin roles'; end if;
    if new.is_admin and new.role <> 'owner' then raise exception 'Only owner logins can be admins'; end if;
    perform tb.log(old.society_id, case when new.is_admin then 'admin_added' else 'admin_removed' end,
      case when new.is_admin then 'Made ' || new.login_id || ' an admin' else 'Removed admin role from ' || new.login_id end, 'member', new.user_id::text);
  end if;
  if new.active <> old.active then
    if not tb.is_soc_admin(old.society_id) then raise exception 'Only admins can turn logins on or off'; end if;
    perform tb.log(old.society_id, 'login_' || case when new.active then 'enabled' else 'disabled' end,
      case when new.active then 'Turned on login ' else 'Turned off login ' end || new.login_id, 'member', new.user_id::text);
  end if;
  if new.must_change_password = false and old.must_change_password = true then
    if auth.uid() is distinct from old.user_id then raise exception 'Only the person can confirm their own password'; end if;
    perform tb.log(old.society_id, 'password_changed', new.login_id || ' set a new password', 'member', new.user_id::text);
  end if;
  if (new.full_name is distinct from old.full_name or new.phone is distinct from old.phone)
     and auth.uid() is distinct from old.user_id and not tb.is_soc_admin(old.society_id) then
    raise exception 'You can only change your own details';
  end if;
  return new;
end $$;
create trigger members_guard before update on tb.members for each row execute function tb.members_guard();

create function tb.units_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if new.society_id <> old.society_id or new.block_id <> old.block_id or new.number <> old.number or new.floor <> old.floor then
    if auth.uid() is not null and not tb.is_platform_admin() then raise exception 'Only Tierbridge can change a flat''s number or position'; end if;
  end if;
  if new.plan_id is distinct from old.plan_id and not tb.is_soc_admin(old.society_id) then
    raise exception 'Only admins can change a flat''s plan';
  end if;
  if new.has_tenant is distinct from old.has_tenant then
    perform tb.log(old.society_id, 'tenancy_changed', 'Flat ' || new.number || case when new.has_tenant then ' now has a tenant' else ' is now owner-occupied' end, 'unit', new.id::text);
  end if;
  return new;
end $$;
create trigger units_guard before update on tb.units for each row execute function tb.units_guard();

create function tb.societies_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
declare changes text[] := '{}';
begin
  if auth.uid() is not null and not tb.is_platform_admin() then
    if new.slug <> old.slug or new.status <> old.status or new.trial_ends_on <> old.trial_ends_on
       or new.paid_until is distinct from old.paid_until or new.template_id is distinct from old.template_id then
      raise exception 'Only Tierbridge can change the web address, plan or trial';
    end if;
    perform tb.require_writable(old.id);
  end if;
  if new.name            is distinct from old.name            then changes := changes || ('name to "' || new.name || '"'); end if;
  if new.upi_id          is distinct from old.upi_id          then changes := changes || ('UPI ID to ' || coalesce(new.upi_id, '(none)')); end if;
  if new.payee_name      is distinct from old.payee_name      then changes := changes || ('payee name to ' || coalesce(new.payee_name, '(none)')); end if;
  if new.qr_path         is distinct from old.qr_path         then changes := changes || 'the UPI QR code'::text; end if;
  if new.opening_balance is distinct from old.opening_balance then changes := changes || ('opening balance to ' || tb.inr(new.opening_balance)); end if;
  if new.start_month     is distinct from old.start_month     then changes := changes || ('start month to ' || to_char(new.start_month, 'Mon YYYY')); end if;
  if new.due_day         is distinct from old.due_day         then changes := changes || ('due day to ' || new.due_day); end if;
  if new.phone_visibility is distinct from old.phone_visibility then changes := changes || ('phone numbers visible to ' || case when new.phone_visibility = 'all' then 'all residents' else 'admins only' end); end if;
  if array_length(changes, 1) > 0 then
    perform tb.log(old.id, 'settings_changed', 'Changed ' || array_to_string(changes, ', '), 'society', old.id::text);
  end if;
  return new;
end $$;
create trigger societies_guard before update on tb.societies for each row execute function tb.societies_guard();

create function tb.rates_after() returns trigger
language plpgsql security definer set search_path = tb as $$
declare r tb.rates := case when tg_op = 'DELETE' then old else new end; plan text;
begin
  perform tb.require_writable(r.society_id);
  select ' for ' || name || ' flats' into plan from tb.unit_plans where id = r.plan_id;
  perform tb.log(r.society_id, case when tg_op = 'DELETE' then 'rate_removed' else 'rate_set' end,
    case when tg_op = 'DELETE' then 'Removed maintenance ' else 'Set monthly maintenance to ' end || tb.inr(r.amount) || coalesce(plan, '') || ' from ' || to_char(r.effective_from, 'Mon YYYY'),
    'rate', r.id::text);
  return r;
end $$;
create trigger rates_after after insert or update or delete on tb.rates for each row execute function tb.rates_after();

-- ---------------------------------------------------------------------
-- Directory: residents see names (and phones, when the society allows)
-- ---------------------------------------------------------------------

create function tb.directory(p_society uuid)
returns table (user_id uuid, unit_id uuid, unit_number text, role text, login_id text, is_admin boolean,
               full_name text, phone text, active boolean, signed_in boolean)
language sql stable security definer set search_path = tb as $$
  select m.user_id, m.unit_id, u.number, m.role, m.login_id, m.is_admin, m.full_name,
         case when s.phone_visibility = 'all' or tb.is_soc_admin(p_society) or m.user_id = auth.uid() then m.phone end,
         m.active, not m.must_change_password
    from tb.members m join tb.units u on u.id = m.unit_id join tb.societies s on s.id = m.society_id
   where m.society_id = p_society and tb.is_member(p_society)
   order by u.floor, u.number, m.role
$$;
grant execute on function tb.directory(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Creating logins
-- ---------------------------------------------------------------------

create function tb.login_email(p_slug text, p_login text) returns text
language sql immutable as $$ select lower(p_login) || '@' || p_slug || '.tierbridge-login.example.com' $$;

create function tb.make_auth_user(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = tb, extensions, auth as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  return uid;
end $$;
revoke execute on function tb.make_auth_user(text, text) from public, anon, authenticated;

-- Creates an owner and a tenant login for every flat that lacks one.
-- p_mode 'same': the temporary password is the login ID. 'random': a random one each.
create function tb.create_logins(p_society uuid, p_mode text default 'same')
returns table (login_id text, unit_number text, role text, temp_password text)
language plpgsql security definer set search_path = tb, extensions as $$
declare s tb.societies; u record; r text; lid text; pw text; uid uuid; n int := 0;
begin
  if not tb.is_soc_admin(p_society) then raise exception 'Only admins can create logins'; end if;
  perform tb.require_writable(p_society);
  select * into s from tb.societies where id = p_society;
  for u in select * from tb.units where society_id = p_society order by floor, number loop
    foreach r in array array['owner','tenant'] loop
      lid := lower(u.number) || '-' || r;
      continue when exists (select 1 from tb.members m where m.society_id = p_society and m.login_id = lid);
      pw := case when p_mode = 'random'
                 then substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1lI', 'abcdxyzk'), 1, 4) || '-' ||
                      substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1lI', 'mnpqrstu'), 1, 4)
                 else lid end;
      uid := tb.make_auth_user(tb.login_email(s.slug, lid), pw);
      insert into tb.members (user_id, society_id, unit_id, role, login_id) values (uid, p_society, u.id, r, lid);
      n := n + 1;
      login_id := lid; unit_number := u.number; role := r; temp_password := pw;
      return next;
    end loop;
  end loop;
  perform tb.log(p_society, 'logins_created', 'Created ' || n || ' logins (' || case when p_mode = 'random' then 'random' else 'login ID as' end || ' temporary passwords)', 'society', p_society::text);
end $$;
grant execute on function tb.create_logins(uuid, text) to authenticated;

create function tb.reset_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = tb, extensions, auth as $$
declare me tb.members; t tb.members;
begin
  select * into t from tb.members where user_id = p_user;
  if t.user_id is null then raise exception 'No such login'; end if;
  select * into me from tb.members where user_id = auth.uid();
  if not (tb.is_soc_admin(t.society_id)
          or (me.role = 'owner' and t.role = 'tenant' and me.unit_id = t.unit_id)) then
    raise exception 'Not allowed';
  end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
  update tb.members set must_change_password = true where user_id = p_user;
  perform tb.log(t.society_id, 'password_reset', 'Reset the password for ' || t.login_id, 'member', p_user::text);
end $$;
grant execute on function tb.reset_password(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Creating a society from a template (Tierbridge admins)
-- layout: {"plans":[{"name":"2BHK","area":1100}],
--          "blocks":[{"name":"Main","floors":5,"start":1,"perFloor":3,"prefix":"","plans":["2BHK"],
--                     "top":{"floor":6,"count":2,"plans":["3BHK penthouse"]}}]}
-- ---------------------------------------------------------------------

create function tb.create_society(p_name text, p_slug text, p_city text, p_template text, p_layout jsonb,
                                  p_trial_days int default 30, p_amount numeric default null)
returns uuid
language plpgsql security definer set search_path = tb as $$
declare sid uuid; b jsonb; bid uuid; pl jsonb; f int; i int; plans text[]; num text; floors int; start int; per int; pre text; k int := 0; t jsonb;
begin
  if not tb.is_platform_admin() then raise exception 'Only Tierbridge admins can create societies'; end if;
  insert into tb.societies (name, slug, city, template_id, trial_ends_on, created_by)
  values (trim(p_name), lower(trim(p_slug)), trim(p_city), p_template, current_date + p_trial_days, auth.uid()) returning id into sid;
  for pl in select * from jsonb_array_elements(coalesce(p_layout->'plans', '[]')) loop
    insert into tb.unit_plans (society_id, name, area_sqft) values (sid, pl->>'name', nullif(pl->>'area','')::int);
  end loop;
  for b in select * from jsonb_array_elements(p_layout->'blocks') loop
    insert into tb.blocks (society_id, name, sort) values (sid, b->>'name', k) returning id into bid;
    k := k + 1;
    floors := (b->>'floors')::int; start := coalesce((b->>'start')::int, 1); per := (b->>'perFloor')::int; pre := coalesce(b->>'prefix', '');
    plans := array(select jsonb_array_elements_text(coalesce(b->'plans', '[]')));
    for f in start .. start + floors - 1 loop
      for i in 1 .. per loop
        num := pre || case when f = 0 then 'G' || lpad(i::text, 2, '0') else f::text || lpad(i::text, 2, '0') end;
        insert into tb.units (society_id, block_id, floor, number, plan_id)
        values (sid, bid, f, num, (select id from tb.unit_plans where society_id = sid and name = plans[1 + (i - 1) % greatest(array_length(plans, 1), 1)]));
      end loop;
    end loop;
    t := b->'top';
    if t is not null then
      plans := array(select jsonb_array_elements_text(coalesce(t->'plans', '[]')));
      for i in 1 .. (t->>'count')::int loop
        num := pre || (t->>'floor') || lpad(i::text, 2, '0');
        insert into tb.units (society_id, block_id, floor, number, plan_id)
        values (sid, bid, (t->>'floor')::int, num, (select id from tb.unit_plans where society_id = sid and name = plans[1 + (i - 1) % greatest(array_length(plans, 1), 1)]));
      end loop;
    end if;
  end loop;
  if p_amount is not null then
    insert into tb.rates (society_id, effective_from, amount) values (sid, date_trunc('month', now())::date, p_amount);
  end if;
  perform tb.plog(sid, 'society_created', 'Created ' || p_name || ' (' || (select count(*) from tb.units where society_id = sid) || ' flats, template ' || coalesce(p_template, 'custom') || ')');
  perform tb.log(sid, 'society_created', 'Created the society with ' || (select count(*) from tb.units where society_id = sid) || ' flats', 'society', sid::text);
  return sid;
end $$;
grant execute on function tb.create_society(text, text, text, text, jsonb, int, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- Tierbridge console
-- ---------------------------------------------------------------------

create function tb.platform_overview()
returns table (id uuid, slug text, name text, city text, status text, trial_ends_on date, paid_until date, created_at timestamptz,
               template_id text, flats bigint, logins bigint, signed_in bigint, payments_30d bigint, expenses_30d bigint,
               last_activity timestamptz, admin_names text, admin_phones text, price_per_flat numeric, discount_pct numeric,
               fixed_amount numeric, term_years int, sub_status text, sub_note text)
language sql stable security definer set search_path = tb as $$
  select s.id, s.slug, s.name, s.city,
         case when s.status = 'trial' and s.trial_ends_on < current_date then 'read_only'
              when s.status = 'active' and s.paid_until < current_date then 'read_only' else s.status end,
         s.trial_ends_on, s.paid_until, s.created_at, s.template_id,
         (select count(*) from tb.units u where u.society_id = s.id),
         (select count(*) from tb.members m where m.society_id = s.id),
         (select count(*) from tb.members m where m.society_id = s.id and not m.must_change_password),
         (select count(*) from tb.payments p where p.society_id = s.id and p.marked_at > now() - interval '30 days'),
         (select count(*) from tb.expenses e where e.society_id = s.id and e.submitted_at > now() - interval '30 days'),
         (select max(a.at) from tb.activity_log a where a.society_id = s.id and a.actor is not null and not exists (select 1 from tb.platform_admins pa where pa.user_id = a.actor)),
         (select string_agg(coalesce(m.full_name, m.login_id), ', ') from tb.members m where m.society_id = s.id and m.is_admin),
         (select string_agg(m.phone, ', ') from tb.members m where m.society_id = s.id and m.is_admin and m.phone is not null),
         sub.price_per_flat, sub.discount_pct, sub.fixed_amount, sub.term_years, sub.status, sub.note
    from tb.societies s
    left join lateral (select * from tb.subscriptions x where x.society_id = s.id and x.status <> 'cancelled' order by x.created_at desc limit 1) sub on true
   where tb.is_platform_admin()
   order by s.created_at desc
$$;
grant execute on function tb.platform_overview() to authenticated;

create function tb.extend_trial(p_society uuid, p_days int, p_reason text) returns void
language plpgsql security definer set search_path = tb as $$
begin
  if not tb.is_platform_admin() then raise exception 'Not allowed'; end if;
  update tb.societies set trial_ends_on = greatest(trial_ends_on, current_date) + p_days,
         status = case when status in ('trial','read_only') then 'trial' else status end
   where id = p_society;
  perform tb.plog(p_society, 'trial_extended', 'Extended the trial by ' || p_days || ' days' || coalesce(': ' || nullif(trim(p_reason), ''), ''));
end $$;
grant execute on function tb.extend_trial(uuid, int, text) to authenticated;

-- Agree a price (standard ₹50 per flat per year, a discount, or a fixed yearly amount) and term.
create function tb.set_subscription(p_society uuid, p_price_per_flat numeric, p_discount_pct numeric, p_fixed_amount numeric,
                                    p_term_years int, p_note text) returns uuid
language plpgsql security definer set search_path = tb as $$
declare n int; due numeric; sid uuid; start date;
begin
  if not tb.is_platform_admin() then raise exception 'Not allowed'; end if;
  select count(*) into n from tb.units where society_id = p_society;
  due := coalesce(p_fixed_amount, round(n * p_price_per_flat * (1 - coalesce(p_discount_pct, 0) / 100.0), 2)) * p_term_years;
  select greatest(current_date, coalesce(paid_until + 1, trial_ends_on + 1, current_date)) into start from tb.societies where id = p_society;
  update tb.subscriptions set status = 'cancelled' where society_id = p_society and status = 'pending';
  insert into tb.subscriptions (society_id, price_per_flat, discount_pct, fixed_amount, term_years, starts_on, ends_on, flats, amount_due, note, created_by)
  values (p_society, p_price_per_flat, coalesce(p_discount_pct, 0), p_fixed_amount, p_term_years, start, (start + make_interval(years => p_term_years))::date - 1, n, due, p_note, auth.uid())
  returning id into sid;
  perform tb.plog(p_society, 'price_set', 'Set the subscription to ' || tb.inr(due) || ' for ' || p_term_years || ' year(s)' || coalesce(': ' || nullif(trim(p_note), ''), ''));
  return sid;
end $$;
grant execute on function tb.set_subscription(uuid, numeric, numeric, numeric, int, text) to authenticated;

create function tb.record_subscription_payment(p_subscription uuid, p_amount numeric, p_ref text, p_paid_on date) returns void
language plpgsql security definer set search_path = tb as $$
declare x tb.subscriptions;
begin
  if not tb.is_platform_admin() then raise exception 'Not allowed'; end if;
  update tb.subscriptions set status = 'paid', amount_paid = p_amount, payment_ref = p_ref, paid_on = p_paid_on
   where id = p_subscription returning * into x;
  update tb.societies set status = 'active', paid_until = greatest(coalesce(paid_until, x.ends_on), x.ends_on) where id = x.society_id;
  perform tb.plog(x.society_id, 'payment_received', 'Received ' || tb.inr(p_amount) || coalesce(', ref ' || p_ref, '') || '; paid until ' || to_char(x.ends_on, 'DD Mon YYYY'));
end $$;
grant execute on function tb.record_subscription_payment(uuid, numeric, text, date) to authenticated;

-- Society admins see what they owe and what they have paid.
create function tb.my_subscription(p_society uuid)
returns table (status text, trial_ends_on date, paid_until date, flats bigint, standard_amount numeric,
               pending_amount numeric, pending_term int, pending_note text)
language sql stable security definer set search_path = tb as $$
  select s.status, s.trial_ends_on, s.paid_until, (select count(*) from tb.units u where u.society_id = s.id),
         (select count(*) from tb.units u where u.society_id = s.id) * 50.0,
         x.amount_due, x.term_years, x.note
    from tb.societies s
    left join lateral (select * from tb.subscriptions y where y.society_id = s.id and y.status = 'pending' order by y.created_at desc limit 1) x on true
   where s.id = p_society and tb.is_soc_admin(p_society)
$$;
grant execute on function tb.my_subscription(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table tb.platform_admins enable row level security;
alter table tb.templates       enable row level security;
alter table tb.leads           enable row level security;
alter table tb.platform_log    enable row level security;
alter table tb.societies       enable row level security;
alter table tb.blocks          enable row level security;
alter table tb.unit_plans      enable row level security;
alter table tb.units           enable row level security;
alter table tb.members         enable row level security;
alter table tb.rates           enable row level security;
alter table tb.payments        enable row level security;
alter table tb.expenses        enable row level security;
alter table tb.notices         enable row level security;
alter table tb.notice_reads    enable row level security;
alter table tb.tickets         enable row level security;
alter table tb.ticket_updates  enable row level security;
alter table tb.activity_log    enable row level security;
alter table tb.subscriptions   enable row level security;

grant select on all tables in schema tb to authenticated;
grant insert on tb.leads to anon, authenticated;
grant insert, update, delete on tb.templates, tb.leads to authenticated;
grant update on tb.societies, tb.units, tb.members to authenticated;
grant insert, update on tb.unit_plans to authenticated;
grant insert, update, delete on tb.rates, tb.notices to authenticated;
grant insert, update on tb.payments, tb.expenses, tb.tickets to authenticated;
grant insert on tb.notice_reads, tb.ticket_updates to authenticated;
grant usage on all sequences in schema tb to authenticated;

create policy "platform admins see themselves" on tb.platform_admins for select to authenticated using (user_id = auth.uid());

create policy "anyone signed in reads templates" on tb.templates for select to authenticated using (true);
create policy "platform admins manage templates" on tb.templates for all to authenticated using (tb.is_platform_admin()) with check (tb.is_platform_admin());

create policy "anyone registers interest" on tb.leads for insert to anon, authenticated
  with check (status = 'new' and note is null);
create policy "platform admins read leads" on tb.leads for select to authenticated using (tb.is_platform_admin());
create policy "platform admins update leads" on tb.leads for update to authenticated using (tb.is_platform_admin()) with check (tb.is_platform_admin());

create policy "platform admins read platform log" on tb.platform_log for select to authenticated using (tb.is_platform_admin());

create policy "members read their society" on tb.societies for select to authenticated using (tb.is_member(id));
create policy "admins edit their society" on tb.societies for update to authenticated using (tb.is_soc_admin(id)) with check (tb.is_soc_admin(id));

create policy "members read blocks" on tb.blocks for select to authenticated using (tb.is_member(society_id));
create policy "members read plans" on tb.unit_plans for select to authenticated using (tb.is_member(society_id));
create policy "admins add plans" on tb.unit_plans for insert to authenticated with check (tb.is_soc_admin(society_id));
create policy "admins edit plans" on tb.unit_plans for update to authenticated using (tb.is_soc_admin(society_id)) with check (tb.is_soc_admin(society_id));

create policy "members read flats" on tb.units for select to authenticated using (tb.is_member(society_id));
create policy "owners and admins edit flats" on tb.units for update to authenticated
  using (tb.is_soc_admin(society_id) or exists (select 1 from tb.members m where m.user_id = auth.uid() and m.unit_id = units.id and m.role = 'owner' and m.active))
  with check (tb.is_soc_admin(society_id) or exists (select 1 from tb.members m where m.user_id = auth.uid() and m.unit_id = units.id and m.role = 'owner' and m.active));

create policy "self and admins read logins" on tb.members for select to authenticated
  using (user_id = auth.uid() or tb.is_soc_admin(society_id));
create policy "self and admins edit logins" on tb.members for update to authenticated
  using (user_id = auth.uid() or tb.is_soc_admin(society_id)) with check (user_id = auth.uid() or tb.is_soc_admin(society_id));

create policy "members read rates" on tb.rates for select to authenticated using (tb.is_member(society_id));
create policy "admins add rates" on tb.rates for insert to authenticated with check (tb.is_soc_admin(society_id));
create policy "admins edit rates" on tb.rates for update to authenticated using (tb.is_soc_admin(society_id)) with check (tb.is_soc_admin(society_id));
create policy "admins remove rates" on tb.rates for delete to authenticated using (tb.is_soc_admin(society_id));

create policy "members read payments" on tb.payments for select to authenticated using (tb.is_member(society_id));
create policy "own flat or admin adds payment" on tb.payments for insert to authenticated
  with check (tb.is_soc_admin(society_id) or unit_id = tb.my_unit());
create policy "own flat or admin edits payment" on tb.payments for update to authenticated
  using (tb.is_soc_admin(society_id) or unit_id = tb.my_unit()) with check (tb.is_soc_admin(society_id) or unit_id = tb.my_unit());

create policy "members read expenses" on tb.expenses for select to authenticated using (tb.is_member(society_id));
create policy "members submit expenses" on tb.expenses for insert to authenticated with check (tb.is_member(society_id));
create policy "admins edit expenses" on tb.expenses for update to authenticated using (tb.is_soc_admin(society_id)) with check (tb.is_soc_admin(society_id));

create policy "members read notices" on tb.notices for select to authenticated using (tb.is_member(society_id));
create policy "admins post notices" on tb.notices for insert to authenticated with check (tb.is_soc_admin(society_id));
create policy "admins edit notices" on tb.notices for update to authenticated using (tb.is_soc_admin(society_id)) with check (tb.is_soc_admin(society_id));
create policy "admins remove notices" on tb.notices for delete to authenticated using (tb.is_soc_admin(society_id));

create policy "read receipts: self and admins" on tb.notice_reads for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from tb.notices n where n.id = notice_id and tb.is_soc_admin(n.society_id)));
create policy "members mark notices read" on tb.notice_reads for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from tb.notices n where n.id = notice_id and tb.is_member(n.society_id)));

-- Issues are visible to every resident; grievances only to admins and the person who raised them.
create policy "members read complaints" on tb.tickets for select to authenticated
  using (tb.is_member(society_id) and (kind = 'issue' or tb.is_soc_admin(society_id) or tb.owns_ticket(id)));
create policy "members raise complaints" on tb.tickets for insert to authenticated with check (tb.is_member(society_id));
create policy "raiser or admin updates complaints" on tb.tickets for update to authenticated
  using (tb.owns_ticket(id) or tb.is_soc_admin(society_id)) with check (tb.owns_ticket(id) or tb.is_soc_admin(society_id));
alter table tb.ticket_owners enable row level security;
create policy "raisers see their own anonymous grievances" on tb.ticket_owners for select to authenticated using (user_id = auth.uid());

create policy "read complaint replies" on tb.ticket_updates for select to authenticated
  using (exists (select 1 from tb.tickets t where t.id = ticket_id and tb.is_member(t.society_id)
                 and (t.kind = 'issue' or tb.is_soc_admin(t.society_id) or tb.owns_ticket(t.id))));
create policy "reply to complaints" on tb.ticket_updates for insert to authenticated
  with check (exists (select 1 from tb.tickets t where t.id = ticket_id and tb.is_member(t.society_id)));

create policy "admins read activity" on tb.activity_log for select to authenticated using (tb.is_soc_admin(society_id));

create policy "platform admins read subscriptions" on tb.subscriptions for select to authenticated using (tb.is_platform_admin());

-- Anonymous grievances: hide who raised them from everyone but Tierbridge.
create function tb.complaints(p_society uuid)
returns table (id uuid, kind text, category text, title text, body text, photo_path text, status text, anonymous boolean,
               unit_number text, raised_by text, mine boolean, created_at timestamptz, updated_at timestamptz, replies bigint)
language sql stable security definer set search_path = tb as $$
  select t.id, t.kind, t.category, t.title, t.body, t.photo_path, t.status, t.anonymous,
         u.number,
         case when t.anonymous then case when tb.owns_ticket(t.id) then 'You (anonymous to others)' else 'Anonymous' end
              else coalesce(m.login_id || coalesce(' (' || nullif(trim(m.full_name), '') || ')', ''), 'A resident') end,
         tb.owns_ticket(t.id), t.created_at, t.updated_at,
         (select count(*) from tb.ticket_updates x where x.ticket_id = t.id and x.body <> '')
    from tb.tickets t left join tb.units u on u.id = t.unit_id left join tb.members m on m.user_id = t.created_by
   where t.society_id = p_society and tb.is_member(p_society)
     and (t.kind = 'issue' or tb.is_soc_admin(p_society) or tb.owns_ticket(t.id))
   order by (t.status in ('open','in_progress')) desc, t.updated_at desc
$$;
grant execute on function tb.complaints(uuid) to authenticated;

create function tb.complaint_thread(p_ticket uuid)
returns table (id bigint, author text, body text, new_status text, created_at timestamptz)
language sql stable security definer set search_path = tb as $$
  select x.id,
         case when x.author is null then 'Anonymous'
              when exists (select 1 from tb.platform_admins pa where pa.user_id = x.author) then 'Tierbridge'
              else coalesce((select login_id || coalesce(' (' || nullif(trim(full_name), '') || ')', '') from tb.members where user_id = x.author), 'A resident') end,
         x.body, x.new_status, x.created_at
    from tb.ticket_updates x join tb.tickets t on t.id = x.ticket_id
   where x.ticket_id = p_ticket and tb.is_member(t.society_id)
     and (t.kind = 'issue' or tb.is_soc_admin(t.society_id) or tb.owns_ticket(t.id))
   order by x.created_at
$$;
grant execute on function tb.complaint_thread(uuid) to authenticated;

-- Names for "marked by", "added by" and similar, without exposing phone numbers.
create function tb.names(p_society uuid)
returns table (user_id uuid, label text)
language sql stable security definer set search_path = tb as $$
  select m.user_id, m.login_id || coalesce(' (' || nullif(trim(m.full_name), '') || ')', '')
    from tb.members m where m.society_id = p_society and tb.is_member(p_society)
  union all
  select pa.user_id, 'Tierbridge' from tb.platform_admins pa where tb.is_member(p_society)
$$;
grant execute on function tb.names(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Files: bills, screenshots, notices, complaint photos, QR codes.
-- Stored under <society id>/..., readable by that society's members.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tb-files', 'tb-files', false, 8388608,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

create function tb.file_society(p_name text) returns uuid
language sql immutable as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p_name, '/', 1)::uuid end
$$;

create policy "tb members view files" on storage.objects for select to authenticated
  using (bucket_id = 'tb-files' and tb.is_member(tb.file_society(name)));
create policy "tb members upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'tb-files' and tb.is_member(tb.file_society(name)) and tb.is_writable(tb.file_society(name)));

-- ---------------------------------------------------------------------
-- Building templates
-- ---------------------------------------------------------------------

insert into tb.templates (id, name, description, sort, layout) values
('swarna-sai-nivas', 'Swarna Sai Nivas', '1 block, 5 floors, 3 flats per floor, flats 101 to 503', 1,
 '{"plans":[{"name":"2BHK","area":1100}],"blocks":[{"name":"Main","floors":5,"start":1,"perFloor":3,"plans":["2BHK"]}]}'),
('walkup-4x2', 'Small walk-up', 'Stilt parking + 4 floors, 2 flats per floor', 2,
 '{"plans":[{"name":"2BHK","area":1100},{"name":"3BHK","area":1450}],"blocks":[{"name":"Main","floors":4,"start":1,"perFloor":2,"plans":["2BHK","3BHK"]}]}'),
('stilt5-2', 'Stilt + 5, two per floor', 'Stilt parking + 5 floors, 2 flats per floor', 3,
 '{"plans":[{"name":"3BHK","area":1450}],"blocks":[{"name":"Main","floors":5,"start":1,"perFloor":2,"plans":["3BHK"]}]}'),
('stilt5-4', 'Stilt + 5, four per floor', 'Stilt parking + 5 floors, 4 flats per floor', 4,
 '{"plans":[{"name":"2BHK","area":1100}],"blocks":[{"name":"Main","floors":5,"start":1,"perFloor":4,"plans":["2BHK"]}]}'),
('stilt5-6', 'Stilt + 5, six per floor', 'Stilt parking + 5 floors, 6 flats per floor', 5,
 '{"plans":[{"name":"2BHK","area":1100},{"name":"1BHK","area":650}],"blocks":[{"name":"Main","floors":5,"start":1,"perFloor":6,"plans":["2BHK","2BHK","1BHK"]}]}'),
('stilt5-penthouse', 'Stilt + 5 with penthouses', 'Stilt parking + 5 floors, 4 flats per floor, 2 penthouses on top', 6,
 '{"plans":[{"name":"2BHK","area":1100},{"name":"3BHK penthouse","area":2000}],"blocks":[{"name":"Main","floors":5,"start":1,"perFloor":4,"plans":["2BHK"],"top":{"floor":6,"count":2,"plans":["3BHK penthouse"]}}]}'),
('independent-g3', 'Independent floors', 'Ground + 3 floors, 1 flat per floor', 7,
 '{"plans":[{"name":"3BHK","area":1450}],"blocks":[{"name":"Main","floors":4,"start":0,"perFloor":1,"plans":["3BHK"]}]}'),
('twin-blocks', 'Twin blocks', 'Blocks A and B, stilt + 5 floors each, 4 flats per floor', 8,
 '{"plans":[{"name":"2BHK","area":1100},{"name":"3BHK","area":1450}],"blocks":[{"name":"Block A","prefix":"A-","floors":5,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]},{"name":"Block B","prefix":"B-","floors":5,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]}]}'),
('highrise-14', 'Single high-rise tower', '14 floors, 4 flats per floor', 9,
 '{"plans":[{"name":"2BHK","area":1150},{"name":"3BHK","area":1550}],"blocks":[{"name":"Tower","floors":14,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]}]}'),
('gated-4x10', 'Gated community', '4 towers, 10 floors each, 4 flats per floor', 10,
 '{"plans":[{"name":"2BHK","area":1150},{"name":"3BHK","area":1550}],"blocks":[{"name":"Tower 1","prefix":"T1-","floors":10,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]},{"name":"Tower 2","prefix":"T2-","floors":10,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]},{"name":"Tower 3","prefix":"T3-","floors":10,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]},{"name":"Tower 4","prefix":"T4-","floors":10,"start":1,"perFloor":4,"plans":["2BHK","3BHK"]}]}');
