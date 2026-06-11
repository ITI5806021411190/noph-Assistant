-- Health Assistant OS PostgreSQL migration
-- Phase 1: identity, active profiles, remembered devices, notifications, audit log.
-- Run this in Supabase SQL Editor or psql against the target PostgreSQL database.

begin;

create extension if not exists pgcrypto;

create or replace function public.haos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.departments (
  department_id uuid primary key default gen_random_uuid(),
  department_code text,
  department_name text not null,
  sort_order integer not null default 999,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_name)
);

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.haos_set_updated_at();

create table if not exists public.users (
  user_id uuid primary key default gen_random_uuid(),
  phone text not null,
  pin_hash text not null,
  pin_hash_algorithm text not null default 'bcrypt',
  full_name text not null,
  position text,
  department_id uuid references public.departments(department_id) on delete set null,
  department_name text,
  email text,
  pdpa_status text,
  account_role text not null default 'User',
  account_status text not null default 'Active',
  email_notify boolean not null default true,
  email_notify_preferences jsonb not null default '{}'::jsonb,
  signature_data text,
  signature_list jsonb not null default '[]'::jsonb,
  active_profile_id text,
  approved_at timestamptz,
  approved_by_phone text,
  invite_token text,
  last_login_at timestamptz,
  legacy_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_phone_unique unique (phone)
);

create index if not exists idx_users_status_role on public.users (account_status, account_role);
create index if not exists idx_users_department on public.users (department_id);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.haos_set_updated_at();

create table if not exists public.user_profiles (
  profile_id text primary key default ('PROF-' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid not null references public.users(user_id) on delete cascade,
  user_phone text not null,
  full_name_snapshot text,
  department_id uuid references public.departments(department_id) on delete set null,
  department_name text not null,
  position text,
  profile_role text not null default 'Member',
  is_primary boolean not null default false,
  is_active boolean not null default true,
  can_approve boolean not null default false,
  signature_id text,
  notify_email text,
  notify_telegram text,
  notes text,
  created_by_phone text,
  updated_by_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_user_active on public.user_profiles (user_id, is_active);
create index if not exists idx_user_profiles_department on public.user_profiles (department_id);
create unique index if not exists uq_user_profiles_one_primary
  on public.user_profiles (user_id)
  where is_primary and is_active;
create unique index if not exists uq_user_profiles_no_active_duplicate
  on public.user_profiles (
    user_id,
    lower(trim(department_name)),
    lower(trim(coalesce(position, ''))),
    lower(trim(coalesce(profile_role, 'Member'))),
    can_approve
  )
  where is_active;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.haos_set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_active_profile_id_fkey'
  ) then
    alter table public.users
      add constraint users_active_profile_id_fkey
      foreign key (active_profile_id)
      references public.user_profiles(profile_id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.auto_login_devices (
  auto_login_device_id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid not null references public.users(user_id) on delete cascade,
  user_phone text not null,
  device_label text,
  token_hash text not null,
  user_agent text,
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id),
  unique (device_id, token_hash)
);

create index if not exists idx_auto_login_devices_lookup
  on public.auto_login_devices (device_id, token_hash)
  where is_active;
create index if not exists idx_auto_login_devices_user
  on public.auto_login_devices (user_id, is_active, last_used_at desc);

drop trigger if exists trg_auto_login_devices_updated_at on public.auto_login_devices;
create trigger trg_auto_login_devices_updated_at
before update on public.auto_login_devices
for each row execute function public.haos_set_updated_at();

create table if not exists public.notifications (
  notification_id text primary key default ('NTF-' || replace(gen_random_uuid()::text, '-', '')),
  target_user_id uuid references public.users(user_id) on delete cascade,
  target_phone text not null,
  message text not null,
  is_read boolean not null default false,
  type text,
  entity_id text,
  priority text not null default 'Normal',
  module text,
  action text,
  email_sent_at timestamptz,
  email_status text,
  created_by_user_id uuid references public.users(user_id) on delete set null,
  created_by_phone text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_target_unread
  on public.notifications (target_phone, is_read, created_at desc);
create index if not exists idx_notifications_target_module
  on public.notifications (target_phone, module, created_at desc);
create index if not exists idx_notifications_entity
  on public.notifications (module, entity_id);

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.haos_set_updated_at();

create table if not exists public.audit_logs (
  audit_id text primary key default ('AUD-' || replace(gen_random_uuid()::text, '-', '')),
  actor_user_id uuid references public.users(user_id) on delete set null,
  actor_phone text,
  actor_name text,
  actor_profile_id text references public.user_profiles(profile_id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  summary text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor_time on public.audit_logs (actor_phone, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists idx_audit_logs_action_time on public.audit_logs (action, created_at desc);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.haos_set_updated_at();

create table if not exists public.resources (
  resource_id text primary key,
  resource_name text not null,
  resource_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at
before update on public.resources
for each row execute function public.haos_set_updated_at();

create table if not exists public.attachments (
  attachment_id text primary key default ('ATT-' || replace(gen_random_uuid()::text, '-', '')),
  entity_type text not null,
  entity_id text not null,
  file_url text not null,
  file_name text,
  mime_type text,
  uploaded_by_user_id uuid references public.users(user_id) on delete set null,
  uploaded_by_phone text,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_entity on public.attachments (entity_type, entity_id);

commit;
