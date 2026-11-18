-- =====================================================================
-- Tierbridge: societies can sign themselves up for the free month,
-- and the Tierbridge team manages which templates they can pick from.
-- Run after 001_society_platform.sql.
-- =====================================================================

alter table tb.templates add column if not exists visible boolean not null default true;
alter table tb.templates add column if not exists updated_at timestamptz not null default now();

alter table tb.societies add column if not exists source text not null default 'console' check (source in ('console','self_signup'));
alter table tb.societies add column if not exists verified boolean not null default true;
alter table tb.societies add column if not exists contact_email text;

-- Only the Tierbridge team can change who checked a society.
create or replace function tb.societies_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
declare changes text[] := '{}';
begin
  if auth.uid() is not null and not tb.is_platform_admin() then
    if new.slug <> old.slug or new.status <> old.status or new.trial_ends_on <> old.trial_ends_on
       or new.paid_until is distinct from old.paid_until or new.template_id is distinct from old.template_id
       or new.verified <> old.verified or new.source <> old.source then
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
  if new.status is distinct from old.status and new.status = 'cancelled' then
    perform tb.plog(old.id, 'society_cancelled', 'Cancelled ' || old.name);
  end if;
  if new.verified and not old.verified then
    perform tb.plog(old.id, 'society_verified', 'Marked ' || old.name || ' as checked');
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Internal builders shared by the console and self sign-up
-- ---------------------------------------------------------------------

create or replace function tb._build_society(p_name text, p_slug text, p_city text, p_template text, p_layout jsonb,
                                              p_trial_days int, p_amount numeric, p_source text)
returns uuid
language plpgsql security definer set search_path = tb as $$
declare sid uuid; b jsonb; bid uuid; pl jsonb; f int; i int; plans text[]; num text; floors int; start int; per int; pre text; k int := 0; t jsonb; n int;
begin
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 60 then
    raise exception 'The web address can only use lowercase letters, numbers and single hyphens';
  end if;
  if p_slug in ('admin', 'start', 'api', 'login', 'signup', 'platform', 'www', 'help', 'about') then
    raise exception 'That web address is reserved. Try adding your area or city.';
  end if;
  if exists (select 1 from tb.societies where slug = p_slug) then
    raise exception 'The web address "%" is already taken. Try adding your area or city.', p_slug;
  end if;
  insert into tb.societies (name, slug, city, template_id, trial_ends_on, created_by, source, verified)
  values (trim(p_name), p_slug, trim(p_city), p_template, current_date + p_trial_days, auth.uid(), p_source, p_source = 'console')
  returning id into sid;
  for pl in select * from jsonb_array_elements(coalesce(p_layout->'plans', '[]')) loop
    insert into tb.unit_plans (society_id, name, area_sqft) values (sid, pl->>'name', nullif(pl->>'area','')::int)
    on conflict (society_id, name) do nothing;
  end loop;
  for b in select * from jsonb_array_elements(p_layout->'blocks') loop
    insert into tb.blocks (society_id, name, sort) values (sid, coalesce(nullif(b->>'name', ''), 'Main'), k) returning id into bid;
    k := k + 1;
    floors := (b->>'floors')::int; start := coalesce((b->>'start')::int, 1); per := (b->>'perFloor')::int; pre := coalesce(b->>'prefix', '');
    if floors < 1 or floors > 60 or per < 1 or per > 20 then raise exception 'Each block needs 1 to 60 floors and 1 to 20 flats per floor'; end if;
    plans := array(select jsonb_array_elements_text(coalesce(b->'plans', '[]')));
    for f in start .. start + floors - 1 loop
      for i in 1 .. per loop
        num := pre || case when f = 0 then 'G' || lpad(i::text, 2, '0') else f::text || lpad(i::text, 2, '0') end;
        insert into tb.units (society_id, block_id, floor, number, plan_id)
        values (sid, bid, f, num, (select id from tb.unit_plans where society_id = sid and name = plans[1 + (i - 1) % greatest(array_length(plans, 1), 1)]));
      end loop;
    end loop;
    t := b->'top';
    if t is not null and jsonb_typeof(t) = 'object' then
      plans := array(select jsonb_array_elements_text(coalesce(t->'plans', '[]')));
      for i in 1 .. (t->>'count')::int loop
        num := pre || (t->>'floor') || lpad(i::text, 2, '0');
        insert into tb.units (society_id, block_id, floor, number, plan_id)
        values (sid, bid, (t->>'floor')::int, num, (select id from tb.unit_plans where society_id = sid and name = plans[1 + (i - 1) % greatest(array_length(plans, 1), 1)]));
      end loop;
    end if;
  end loop;
  select count(*) into n from tb.units where society_id = sid;
  if n = 0 then raise exception 'The layout has no flats'; end if;
  if p_amount is not null then
    insert into tb.rates (society_id, effective_from, amount) values (sid, date_trunc('month', now())::date, p_amount);
  end if;
  perform tb.plog(sid, case when p_source = 'console' then 'society_created' else 'society_signed_up' end,
    case when p_source = 'console' then 'Created ' else 'Signed up ' end || p_name || ' (' || n || ' flats, template ' || coalesce(p_template, 'custom') || ')');
  perform tb.log(sid, 'society_created', 'Created the society with ' || n || ' flats', 'society', sid::text);
  return sid;
end $$;
revoke execute on function tb._build_society(text,text,text,text,jsonb,int,numeric,text) from public, anon, authenticated;

create or replace function tb._make_logins(p_society uuid, p_mode text)
returns table (login_id text, unit_number text, role text, temp_password text)
language plpgsql security definer set search_path = tb, extensions as $$
declare s tb.societies; u record; r text; lid text; pw text; uid uuid; n int := 0;
begin
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
revoke execute on function tb._make_logins(uuid, text) from public, anon, authenticated;

-- The console and admin versions keep their checks and call the builders.
create or replace function tb.create_society(p_name text, p_slug text, p_city text, p_template text, p_layout jsonb,
                                             p_trial_days int default 30, p_amount numeric default null)
returns uuid
language plpgsql security definer set search_path = tb as $$
begin
  if not tb.is_platform_admin() then raise exception 'Only Tierbridge admins can create societies'; end if;
  return tb._build_society(p_name, lower(trim(p_slug)), p_city, p_template, p_layout, p_trial_days, p_amount, 'console');
end $$;

create or replace function tb.create_logins(p_society uuid, p_mode text default 'same')
returns table (login_id text, unit_number text, role text, temp_password text)
language plpgsql security definer set search_path = tb as $$
begin
  if not tb.is_soc_admin(p_society) then raise exception 'Only admins can create logins'; end if;
  perform tb.require_writable(p_society);
  return query select * from tb._make_logins(p_society, p_mode);
end $$;

-- ---------------------------------------------------------------------
-- Templates people can pick from when they sign up
-- ---------------------------------------------------------------------

create or replace function tb.public_templates()
returns table (id text, name text, description text, layout jsonb, sort int)
language sql stable security definer set search_path = tb as $$
  select id, name, description, layout, sort from tb.templates where visible order by sort, name
$$;
grant execute on function tb.public_templates() to anon, authenticated;

create or replace function tb.templates_touch() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists templates_touch on tb.templates;
create trigger templates_touch before update on tb.templates for each row execute function tb.templates_touch();

create or replace function tb.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = tb as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and p_slug not in ('admin', 'start', 'api', 'login', 'signup', 'platform', 'www', 'help', 'about')
     and not exists (select 1 from tb.societies where slug = lower(p_slug))
$$;
grant execute on function tb.slug_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Self sign-up: a society owner creates their society and starts the free month.
-- Creates every flat's owner and tenant logins (password = login ID), and makes
-- the person signing up the admin, with the password they chose.
-- ---------------------------------------------------------------------

create or replace function tb.self_signup(p_name text, p_slug text, p_city text, p_template text, p_layout jsonb,
                                          p_my_flat text, p_password text, p_full_name text, p_phone text, p_email text default null)
returns table (slug text, login_id text)
language plpgsql security definer set search_path = tb, extensions, auth as $$
declare sid uuid; me tb.members; n int;
begin
  if length(trim(coalesce(p_name, ''))) < 3 or length(trim(coalesce(p_city, ''))) < 2 then raise exception 'Enter the society’s name and city'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Enter your name'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then raise exception 'Enter a 10-digit mobile number'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Choose a password of at least 8 characters'; end if;
  if (select count(*) from tb.societies where source = 'self_signup' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many sign-ups right now. Please try again in an hour, or register and we will set it up for you.';
  end if;
  if p_template is not null and not exists (select 1 from tb.templates where id = p_template and visible) then
    raise exception 'That building template is not available';
  end if;
  select sum((b->>'floors')::int * (b->>'perFloor')::int + coalesce((b->'top'->>'count')::int, 0)) into n from jsonb_array_elements(p_layout->'blocks') b;
  if n > 400 then raise exception 'For more than 400 flats, register and we will set it up with you'; end if;

  sid := tb._build_society(p_name, lower(trim(p_slug)), p_city, p_template, p_layout, 30, null, 'self_signup');
  update tb.societies set contact_email = nullif(trim(p_email), '') where id = sid;
  perform tb._make_logins(sid, 'same');

  select m.* into me from tb.members m join tb.units u on u.id = m.unit_id
   where m.society_id = sid and m.role = 'owner' and lower(u.number) = lower(trim(p_my_flat));
  if me.user_id is null then raise exception 'Flat % is not in this layout', p_my_flat; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = me.user_id;
  update tb.members set is_admin = true, must_change_password = false, full_name = trim(p_full_name), phone = trim(p_phone) where user_id = me.user_id;
  insert into tb.activity_log (society_id, actor, actor_name, action, summary, entity, entity_id)
  values (sid, me.user_id, me.login_id || ' (' || trim(p_full_name) || ')', 'society_signed_up', 'Signed up the society and became its first admin', 'society', sid::text);

  slug := lower(trim(p_slug)); login_id := me.login_id;
  return next;
end $$;
grant execute on function tb.self_signup(text,text,text,text,jsonb,text,text,text,text,text) to anon, authenticated;

-- The console shows how each society arrived and whether it has been checked.
drop function if exists tb.platform_overview();
create function tb.platform_overview()
returns table (id uuid, slug text, name text, city text, status text, trial_ends_on date, paid_until date, created_at timestamptz,
               template_id text, flats bigint, logins bigint, signed_in bigint, payments_30d bigint, expenses_30d bigint,
               last_activity timestamptz, admin_names text, admin_phones text, price_per_flat numeric, discount_pct numeric,
               fixed_amount numeric, term_years int, sub_status text, sub_note text, source text, verified boolean, contact_email text)
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
         sub.price_per_flat, sub.discount_pct, sub.fixed_amount, sub.term_years, sub.status, sub.note,
         s.source, s.verified, s.contact_email
    from tb.societies s
    left join lateral (select * from tb.subscriptions x where x.society_id = s.id and x.status <> 'cancelled' order by x.created_at desc limit 1) sub on true
   where tb.is_platform_admin()
   order by s.created_at desc
$$;
grant execute on function tb.platform_overview() to authenticated;

-- Sign-up runs without a signed-in user, inside tb.self_signup. Let the
-- database itself (no user) set up logins; people still go through every check.
create or replace function tb.members_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if auth.uid() is null then return new; end if;
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
