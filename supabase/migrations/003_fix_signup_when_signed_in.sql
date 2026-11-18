-- =====================================================================
-- Fix: starting a free month failed with "Only the person can confirm
-- their own password" when the browser was already signed in to another
-- Tierbridge login. Sign-up now marks its own changes as system changes.
-- =====================================================================

create or replace function tb.members_guard() returns trigger
language plpgsql security definer set search_path = tb as $$
begin
  if auth.uid() is null or current_setting('tb.system', true) = 'on' then return new; end if;
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

  -- Everything below is set up by Tierbridge itself, whoever is signed in.
  perform set_config('tb.system', 'on', true);

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

  perform set_config('tb.system', 'off', true);
  slug := lower(trim(p_slug)); login_id := me.login_id;
  return next;
end $$;
grant execute on function tb.self_signup(text,text,text,text,jsonb,text,text,text,text,text) to anon, authenticated;
