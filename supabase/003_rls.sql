-- Women Impact — row level security.
-- Membership access is enforced here, never only in the UI.

alter table public.membership_levels   enable row level security;
alter table public.feature_permissions enable row level security;
alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.event_registrations enable row level security;
alter table public.notifications       enable row level security;
alter table public.notification_reads  enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.upgrade_requests    enable row level security;

-- ── Reference data: readable by everyone, writable by admins ────────────────
drop policy if exists levels_read on public.membership_levels;
create policy levels_read on public.membership_levels for select using (true);
drop policy if exists levels_admin on public.membership_levels;
create policy levels_admin on public.membership_levels for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists features_read on public.feature_permissions;
create policy features_read on public.feature_permissions for select using (true);
drop policy if exists features_admin on public.feature_permissions;
create policy features_admin on public.feature_permissions for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Profiles ─────────────────────────────────────────────────────────────────
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Member directory: only for levels allowed by the `directory` feature gate.
drop policy if exists profiles_directory_read on public.profiles;
create policy profiles_directory_read on public.profiles for select
  using (public.has_feature('directory') and membership_status = 'active');

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- Members must not be able to promote themselves: membership columns are
-- writable only by admins.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql as $$
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin')) then
    new.membership_level  := old.membership_level;
    new.membership_status := old.membership_status;
    new.membership_expiry := old.membership_expiry;
    new.is_admin          := old.is_admin;
    new.member_id         := old.member_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ── Events ───────────────────────────────────────────────────────────────────
-- Everyone signed in sees published events (free members need to see what they
-- can request); admins see drafts too.
drop policy if exists events_read on public.events;
create policy events_read on public.events for select
  using (status = 'published' or public.is_admin());

drop policy if exists events_admin on public.events;
create policy events_admin on public.events for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Registrations ────────────────────────────────────────────────────────────
drop policy if exists registrations_self_read on public.event_registrations;
create policy registrations_self_read on public.event_registrations for select
  using (user_id = auth.uid() or public.is_admin());

-- Inserts go through request_event_registration(); direct inserts may only be
-- for yourself and are forced to 'pending' unless you are eligible.
drop policy if exists registrations_self_insert on public.event_registrations;
create policy registrations_self_insert on public.event_registrations for insert
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists registrations_self_cancel on public.event_registrations;
create policy registrations_self_cancel on public.event_registrations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('cancelled','pending'));

drop policy if exists registrations_admin on public.event_registrations;
create policy registrations_admin on public.event_registrations for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Notifications ────────────────────────────────────────────────────────────
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select
  using (
    public.is_admin()
    or target_user_id = auth.uid()
    or (target_user_id is null and (
          target_level is null
          or public.current_rank() >= public.level_rank(target_level)))
  );

drop policy if exists notifications_admin on public.notifications;
create policy notifications_admin on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reads_self on public.notification_reads;
create policy reads_self on public.notification_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Push tokens ──────────────────────────────────────────────────────────────
drop policy if exists tokens_self on public.push_tokens;
create policy tokens_self on public.push_tokens for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ── Upgrade requests ─────────────────────────────────────────────────────────
drop policy if exists upgrades_self on public.upgrade_requests;
create policy upgrades_self on public.upgrade_requests for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists upgrades_insert on public.upgrade_requests;
create policy upgrades_insert on public.upgrade_requests for insert
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists upgrades_admin on public.upgrade_requests;
create policy upgrades_admin on public.upgrade_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Storage ──────────────────────────────────────────────────────────────────
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id in ('avatars','event-images'));

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for insert
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists event_images_admin on storage.objects;
create policy event_images_admin on storage.objects for all
  using (bucket_id = 'event-images' and public.is_admin())
  with check (bucket_id = 'event-images' and public.is_admin());
