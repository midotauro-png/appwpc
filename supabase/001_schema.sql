-- Women Impact — membership platform schema
-- Run in Supabase SQL editor (order: 001 → 002 → 003 → 004).

create extension if not exists "pgcrypto";

-- ── Membership levels (admin editable, no app release needed) ────────────────
create table if not exists public.membership_levels (
  key          text primary key,                 -- free | bronze | silver | golden
  name         text not null,
  rank         int  not null unique,             -- higher = more access
  price_label  text,
  color        text,
  benefits     jsonb not null default '[]'::jsonb,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

-- ── Feature gates (admin editable) ───────────────────────────────────────────
create table if not exists public.feature_permissions (
  feature_key  text primary key,                 -- e.g. resources, directory, workshops
  label        text not null,
  min_level    text not null references public.membership_levels(key) on update cascade,
  is_enabled   boolean not null default true
);

-- ── Members ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  member_id         text unique,                 -- WI-000123, set by trigger
  first_name        text not null default '',
  last_name         text not null default '',
  email             text not null,
  phone             text,
  country           text,
  city              text,
  profile_photo     text,                        -- storage path in `avatars`
  membership_level  text not null default 'free'
                     references public.membership_levels(key) on update cascade,
  membership_status text not null default 'active'
                     check (membership_status in ('active','expired','suspended','pending')),
  membership_start  date not null default current_date,
  membership_expiry date,
  is_admin          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists profiles_level_idx  on public.profiles(membership_level);
create index if not exists profiles_status_idx on public.profiles(membership_status);

-- ── Events ───────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  image_url           text,
  event_date          date not null,
  start_time          time,
  end_time            time,
  location            text,
  maps_url            text,
  organizer           text default 'Women Impact Club',
  capacity            int,
  required_membership text not null default 'free'
                        references public.membership_levels(key) on update cascade,
  registration_deadline date,
  member_price        text,
  non_member_price    text,
  is_featured         boolean not null default false,
  status              text not null default 'published'
                        check (status in ('draft','published','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists events_date_idx on public.events(event_date);

-- ── Event registrations / requests ───────────────────────────────────────────
create table if not exists public.event_registrations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending','approved','declined','cancelled')),
  guests      int not null default 0,
  note        text,
  decided_by  uuid references public.profiles(id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists registrations_event_idx  on public.event_registrations(event_id);
create index if not exists registrations_status_idx on public.event_registrations(status);

-- ── Notifications / announcements ────────────────────────────────────────────
create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  message          text not null,
  target_level     text references public.membership_levels(key) on update cascade, -- null = all
  target_user_id   uuid references public.profiles(id) on delete cascade,           -- null = broadcast
  event_id         uuid references public.events(id) on delete set null,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- ── Push tokens ──────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  token      text primary key,                   -- Expo push token
  user_id    uuid not null references public.profiles(id) on delete cascade,
  platform   text,
  created_at timestamptz not null default now()
);

-- ── Upgrade requests ─────────────────────────────────────────────────────────
create table if not exists public.upgrade_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  current_level  text not null,
  desired_level  text not null references public.membership_levels(key) on update cascade,
  status         text not null default 'pending'
                   check (status in ('pending','approved','declined')),
  created_at     timestamptz not null default now()
);

-- ── Avatars bucket ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;
