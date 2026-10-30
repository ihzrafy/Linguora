-- =============================================================================
-- Linguora — core: extensions, enums, roles & permissions, profiles, audit
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('super_admin', 'admin', 'content_editor', 'reviewer', 'student');

create type public.content_status as enum ('draft', 'in_review', 'published', 'archived');

create type public.question_type as enum (
  'single_choice', 'multiple_select', 'fill_blank', 'dropdown', 'drag_drop', 'word_order',
  'sentence_reconstruction', 'matching', 'error_identification', 'sentence_correction',
  'sentence_transformation', 'translation', 'reading_comprehension', 'listening_comprehension',
  'dialogue_completion', 'contextual_vocabulary', 'short_answer', 'essay', 'dictation',
  'speaking_response'
);

create type public.skill_category as enum (
  'grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing', 'pronunciation',
  'conversation', 'academic', 'business', 'mixed'
);

create type public.question_stage as enum ('guided', 'independent', 'quiz', 'unit_test', 'exam', 'placement');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create table public.roles (
  role public.app_role primary key,
  name text not null,
  description text not null,
  rank smallint not null unique
);

create table public.role_permissions (
  role public.app_role not null references public.roles (role) on delete cascade,
  permission text not null,
  primary key (role, permission)
);

insert into public.roles (role, name, description, rank) values
  ('super_admin', 'Super Admin', 'Akses penuh termasuk manajemen role dan pengaturan sistem.', 100),
  ('admin', 'Admin', 'Mengelola pengguna, konten, laporan, dan audit.', 80),
  ('content_editor', 'Content Editor', 'Membuat dan mengubah konten pembelajaran sebagai draft.', 60),
  ('reviewer', 'Reviewer', 'Meninjau, menyetujui, dan memublikasikan konten; menilai writing/speaking.', 50),
  ('student', 'Student', 'Pengguna pembelajar.', 10);

insert into public.role_permissions (role, permission)
select t.r::public.app_role, t.p from (values
  ('super_admin', 'content.read'), ('super_admin', 'content.write'), ('super_admin', 'content.publish'),
  ('super_admin', 'content.delete'), ('super_admin', 'users.read'), ('super_admin', 'users.manage'),
  ('super_admin', 'roles.manage'), ('super_admin', 'reports.view'), ('super_admin', 'audit.view'),
  ('super_admin', 'settings.manage'), ('super_admin', 'grading.manage'),
  ('admin', 'content.read'), ('admin', 'content.write'), ('admin', 'content.publish'),
  ('admin', 'content.delete'), ('admin', 'users.read'), ('admin', 'users.manage'),
  ('admin', 'reports.view'), ('admin', 'audit.view'), ('admin', 'grading.manage'),
  ('content_editor', 'content.read'), ('content_editor', 'content.write'),
  ('reviewer', 'content.read'), ('reviewer', 'content.publish'), ('reviewer', 'grading.manage'),
  ('reviewer', 'reports.view')
) as t(r, p);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  timezone text not null default 'Asia/Jakarta',
  learning_goal text check (learning_goal in ('daily', 'academic', 'business', 'career', 'travel', 'exam')),
  active_track_id uuid,
  current_level_id uuid,
  placement_level_id uuid,
  daily_goal_xp integer not null default 30 check (daily_goal_xp between 10 and 500),
  daily_goal_minutes integer not null default 15 check (daily_goal_minutes between 5 and 240),
  weekly_goal_minutes integer not null default 105 check (weekly_goal_minutes between 15 and 2000),
  leaderboard_opt_in boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null references public.roles (role),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);

-- Permission helpers (security definer so RLS policies can call them without recursion).
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role);
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = p_permission
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role <> 'student');
$$;

create or replace function public.user_has_permission(p_user uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = p_user and rp.permission = p_permission
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- Trigger that records every change made by a signed-in user to an audited table.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_id text;
begin
  if auth.uid() is null then
    return coalesce(new, old); -- seeds / service operations log explicitly
  end if;
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'key');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_id,
    jsonb_build_object(
      'title', coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'word', v_row ->> 'prompt', v_row ->> 'role'),
      'status', v_row ->> 'status'
    )
  );
  return coalesce(new, old);
end;
$$;

create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();

-- Explicit audit entry from server code / RPCs (actor is always the caller).
create or replace function public.log_audit(p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), left(p_action, 60), left(p_entity_type, 60), left(p_entity_id, 120), coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- System settings & rate limiting
-- ---------------------------------------------------------------------------
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger system_settings_updated_at before update on public.system_settings
  for each row execute function public.set_updated_at();
create trigger system_settings_audit after insert or update or delete on public.system_settings
  for each row execute function public.audit_row_change();

insert into public.system_settings (key, value, description) values
  ('lesson_quiz_pass_threshold', '70', 'Skor minimum (%) untuk lulus mini quiz lesson.'),
  ('lesson_mastery_threshold', '90', 'Skor minimum (%) untuk status Mastered.'),
  ('practice_daily_xp_cap', '100', 'Batas XP harian dari latihan bebas.'),
  ('ai_tutor_daily_limit', '30', 'Batas pesan AI tutor per pengguna per hari.'),
  ('registration_open', 'true', 'Izinkan pendaftaran pengguna baru.');

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- Fixed-window rate limiter. Returns true when the call is allowed.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning count into v_count;
  -- opportunistic cleanup of old windows
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end;
$$;
