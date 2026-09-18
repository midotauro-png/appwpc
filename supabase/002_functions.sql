-- Women Impact — helper functions, triggers and views

-- ── Member id sequence (WI-000123) ───────────────────────────────────────────
create sequence if not exists public.member_id_seq start 1000;

create or replace function public.set_member_id()
returns trigger
language plpgsql
as $$
begin
  if new.member_id is null then
    new.member_id := 'WI-' || lpad(nextval('public.member_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_member_id on public.profiles;
create trigger profiles_set_member_id
  before insert on public.profiles
  for each row execute function public.set_member_id();

-- ── Keep updated_at fresh ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- ── Create a profile automatically on sign-up ────────────────────────────────
-- Sign-up metadata (first_name, last_name, phone, country, city, membership_level)
-- is passed through supabase.auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, country, city, membership_level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'city',
    'free'           -- paid levels are only granted by an admin
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Access helpers (used by RLS, so security definer + stable) ───────────────
create or replace function public.current_rank()
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select ml.rank
       from public.profiles p
       join public.membership_levels ml on ml.key = p.membership_level
      where p.id = auth.uid()
        and p.membership_status = 'active'),
    0);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.level_rank(level_key text)
returns int
language sql stable
as $$
  select coalesce((select rank from public.membership_levels where key = level_key), 0);
$$;

-- Can the current member see this event? (basic details are visible to everyone
-- signed in; registration is what is gated — see 003_rls.sql)
create or replace function public.can_access_event(event_row public.events)
returns boolean
language sql stable
as $$
  select public.is_admin() or public.current_rank() >= public.level_rank(event_row.required_membership);
$$;

-- Is the feature switched on at all? An admin turning a feature off closes it
-- for every level, including members who would otherwise rank high enough.
create or replace function public.feature_enabled(feature text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select f.is_enabled from public.feature_permissions f where f.feature_key = feature),
    true);
$$;

-- Feature gate used by the app and enforced server-side where it matters.
create or replace function public.has_feature(feature text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.feature_permissions f
     where f.feature_key = feature
       and f.is_enabled
       and public.current_rank() >= public.level_rank(f.min_level)
  );
$$;

-- ── Registration entry point ─────────────────────────────────────────────────
-- Free members (and anyone below the event's required level) create a *pending*
-- request; eligible members are approved immediately. Capacity is enforced here,
-- not in the client.
create or replace function public.request_event_registration(p_event_id uuid, p_guests int default 0, p_note text default null)
returns public.event_registrations
language plpgsql security definer set search_path = public
as $$
declare
  v_event   public.events;
  v_taken   int;
  v_status  text;
  v_row     public.event_registrations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.feature_enabled('events_register') then
    raise exception 'Event registration is currently unavailable';
  end if;

  select * into v_event from public.events where id = p_event_id and status = 'published';
  if not found then
    raise exception 'Event not available';
  end if;

  select * into v_row
    from public.event_registrations
   where user_id = auth.uid() and event_id = p_event_id;

  if found and v_row.status = 'declined' then
    raise exception 'This registration request was declined';
  end if;

  if v_event.registration_deadline is not null and v_event.registration_deadline < current_date then
    raise exception 'Registration for this event has closed';
  end if;

  select count(*) into v_taken
    from public.event_registrations
   where event_id = p_event_id and status = 'approved';

  if v_event.capacity is not null and v_taken >= v_event.capacity then
    raise exception 'This event is full';
  end if;

  v_status := case
    when public.current_rank() >= public.level_rank(v_event.required_membership) then 'approved'
    else 'pending'
  end;

  insert into public.event_registrations (user_id, event_id, status, guests, note)
  values (auth.uid(), p_event_id, v_status, greatest(coalesce(p_guests, 0), 0), p_note)
  on conflict (user_id, event_id) do update
    set status = excluded.status, guests = excluded.guests, note = excluded.note
  returning * into v_row;

  return v_row;
end;
$$;

-- ── Admin dashboard statistics ───────────────────────────────────────────────
-- A view would bypass RLS for every caller, so stats come from an admin-only
-- security definer function instead.
drop view if exists public.admin_stats;

create or replace function public.admin_stats()
returns table (
  total_members bigint,
  free_members bigint,
  bronze_members bigint,
  silver_members bigint,
  golden_members bigint,
  new_members_this_month bigint,
  event_registrations bigint,
  pending_requests bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where membership_level = 'free'),
    (select count(*) from public.profiles where membership_level = 'bronze'),
    (select count(*) from public.profiles where membership_level = 'silver'),
    (select count(*) from public.profiles where membership_level = 'golden'),
    (select count(*) from public.profiles where created_at >= date_trunc('month', now())),
    (select count(*) from public.event_registrations),
    (select count(*) from public.event_registrations where status = 'pending');
end;
$$;

-- ── Admin member removal ─────────────────────────────────────────────────────
-- Deleting the profile alone would leave the auth user behind, so removal goes
-- through auth.users (profiles cascade from it).
create or replace function public.admin_delete_member(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- ── Account deletion (guideline 5.1.1) ───────────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
