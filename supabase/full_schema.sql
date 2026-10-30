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
-- =============================================================================
-- Linguora — curriculum: tracks, levels, courses, units, lessons, skill content,
-- vocabulary, grammar reference, question bank
-- =============================================================================

create table public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  goals text[] not null default '{}',
  icon text not null default 'globe',
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  slug text not null unique,
  name text not null,
  name_id text not null,
  description text not null,
  objectives text[] not null default '{}',
  explanation_language text not null default '',
  sort_order integer not null unique,
  exam_pass_threshold integer not null default 70 check (exam_pass_threshold between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_active_track_fk foreign key (active_track_id) references public.learning_tracks (id) on delete set null,
  add constraint profiles_current_level_fk foreign key (current_level_id) references public.levels (id) on delete set null,
  add constraint profiles_placement_level_fk foreign key (placement_level_id) references public.levels (id) on delete set null;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  level_id uuid not null references public.levels (id) on delete restrict,
  track_id uuid not null references public.learning_tracks (id) on delete restrict,
  title text not null,
  description text not null default '',
  -- The core course of a level must be completed before the level exam unlocks.
  is_core boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_level_idx on public.courses (level_id, sort_order);
create unique index courses_one_core_per_level on public.courses (level_id) where is_core;

create table public.course_enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  objectives text[] not null default '{}',
  sort_order integer not null,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, sort_order)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  objectives text[] not null default '{}',
  completion_criteria text not null default '',
  estimated_minutes integer not null default 15 check (estimated_minutes between 1 and 240),
  xp_reward integer not null default 20 check (xp_reward between 0 and 500),
  sort_order integer not null,
  status public.content_status not null default 'draft',
  version integer not null default 1,
  publish_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, sort_order) deferrable initially deferred
);
create index lessons_unit_idx on public.lessons (unit_id, sort_order);
create index lessons_status_idx on public.lessons (status);

create type public.lesson_section_kind as enum (
  'objectives', 'explanation', 'examples', 'vocabulary', 'grammar', 'mistakes',
  'guided_practice', 'independent_practice', 'mini_assessment', 'summary', 'review_cards',
  'completion', 'media'
);

create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind public.lesson_section_kind not null,
  title text not null,
  body_md text not null default '',
  data jsonb not null default '{}'::jsonb,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_sections_lesson_idx on public.lesson_sections (lesson_id, sort_order);

create table public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prerequisite_lesson_id uuid not null references public.lessons (id) on delete cascade,
  primary key (lesson_id, prerequisite_lesson_id),
  check (lesson_id <> prerequisite_lesson_id)
);
create index lesson_prereq_prereq_idx on public.lesson_prerequisites (prerequisite_lesson_id);

-- ---------------------------------------------------------------------------
-- Skill content
-- ---------------------------------------------------------------------------
create type public.grammar_category as enum (
  'tense', 'sentence_structure', 'parts_of_speech', 'modals', 'conditionals', 'clauses', 'voice',
  'reported_speech', 'punctuation', 'common_mistakes'
);

create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  level_id uuid not null references public.levels (id) on delete restrict,
  category public.grammar_category not null,
  explanation_md text not null,
  formulas jsonb not null default '[]'::jsonb,
  examples jsonb not null default '{}'::jsonb,
  comparison_md text,
  mistakes jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  related_lesson_ids uuid[] not null default '{}',
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index grammar_topics_search_idx on public.grammar_topics using gin (search);

create or replace function public.grammar_topics_search_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search :=
    setweight(to_tsvector('english'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(new.keywords, ' '), '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.examples::text, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.explanation_md, '')), 'C');
  return new;
end;
$$;
create trigger grammar_topics_search before insert or update on public.grammar_topics
  for each row execute function public.grammar_topics_search_update();
create index grammar_topics_level_idx on public.grammar_topics (level_id, category);

create table public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  level_id uuid not null references public.levels (id) on delete restrict,
  genre text not null check (genre in ('article', 'story', 'dialogue', 'email', 'news', 'academic')),
  body_md text not null,
  word_count integer not null default 0,
  estimated_minutes integer not null default 5,
  glossary jsonb not null default '[]'::jsonb,
  attribution text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reading_passages_level_idx on public.reading_passages (level_id);

create table public.listening_materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  level_id uuid not null references public.levels (id) on delete restrict,
  kind text not null check (kind in ('dialogue', 'monologue', 'announcement', 'phone_call', 'interview', 'podcast')),
  script jsonb not null default '[]'::jsonb,
  audio_url text,
  -- 'tts' = rendered in the browser with the Web Speech API from the script.
  audio_source text not null default 'tts' check (audio_source in ('tts', 'uploaded')),
  accent text,
  duration_seconds integer,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listening_materials_level_idx on public.listening_materials (level_id);

create table public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  level_id uuid not null references public.levels (id) on delete restrict,
  kind text not null check (kind in ('guided', 'role_play', 'situation', 'pronunciation')),
  prompt_md text not null,
  target_phrases text[] not null default '{}',
  sample_answer text,
  tips text[] not null default '{}',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.writing_rubrics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  criteria jsonb not null, -- [{key,label,description,max}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  level_id uuid not null references public.levels (id) on delete restrict,
  kind text not null check (kind in ('sentence', 'paragraph', 'email_formal', 'email_informal', 'essay', 'opinion', 'summary', 'correction')),
  instructions_md text not null,
  min_words integer not null default 20,
  max_words integer not null default 200,
  model_answer text,
  rubric_id uuid references public.writing_rubrics (id) on delete set null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_words > min_words)
);

-- ---------------------------------------------------------------------------
-- Vocabulary
-- ---------------------------------------------------------------------------
create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  part_of_speech text not null,
  ipa text,
  definition text not null,
  meaning_id text not null,
  examples jsonb not null default '[]'::jsonb,
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations text[] not null default '{}',
  phrases text[] not null default '{}',
  related_words text[] not null default '{}',
  level_id uuid references public.levels (id) on delete set null,
  topic text,
  audio_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vocabulary_entries_word_pos_idx on public.vocabulary_entries (lower(word), lower(part_of_speech));
create index vocabulary_entries_level_idx on public.vocabulary_entries (level_id, topic);
create index vocabulary_entries_word_trgm on public.vocabulary_entries using gin (word extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  type public.question_type not null,
  category public.skill_category not null,
  stage public.question_stage not null default 'quiz',
  prompt text not null,
  instructions text,
  context_md text,
  -- Render-safe data only (shuffled tokens, gap templates, segments...). Never answers.
  data jsonb not null default '{}'::jsonb,
  level_id uuid not null references public.levels (id) on delete restrict,
  topic text not null,
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  points numeric(5, 2) not null default 1 check (points > 0),
  explanation text not null default '',
  misconception text,
  objectives text[] not null default '{}',
  lesson_id uuid references public.lessons (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  passage_id uuid references public.reading_passages (id) on delete set null,
  listening_id uuid references public.listening_materials (id) on delete set null,
  grammar_topic_id uuid references public.grammar_topics (id) on delete set null,
  practice_only boolean not null default false,
  auto_gradable boolean not null default true,
  content_hash text not null,
  version integer not null default 1,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index questions_content_hash_idx on public.questions (content_hash);
create index questions_bank_idx on public.questions (level_id, category, status);
create index questions_lesson_idx on public.questions (lesson_id, stage);
create index questions_unit_idx on public.questions (unit_id, stage);
create index questions_topic_idx on public.questions (level_id, topic);
create index questions_passage_idx on public.questions (passage_id);
create index questions_listening_idx on public.questions (listening_id);
create index questions_grammar_idx on public.questions (grammar_topic_id);
create index questions_prompt_trgm on public.questions using gin (prompt extensions.gin_trgm_ops);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  content text not null,
  sort_order integer not null,
  unique (question_id, sort_order)
);
create index question_options_question_idx on public.question_options (question_id);

-- Private answer keys: readable only by content staff and the service role.
create table public.question_answer_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer jsonb not null,
  grading jsonb not null default '{}'::jsonb,
  -- Full authored form (incl. answers) used by the CMS editor.
  authored jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.question_tags (
  question_id uuid not null references public.questions (id) on delete cascade,
  tag text not null,
  primary key (question_id, tag)
);
create index question_tags_tag_idx on public.question_tags (tag);

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------
create type public.quiz_kind as enum ('lesson_quiz', 'unit_test', 'practice_set');
create type public.exam_kind as enum ('level_exam', 'placement');

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  kind public.quiz_kind not null,
  lesson_id uuid references public.lessons (id) on delete cascade,
  unit_id uuid references public.units (id) on delete cascade,
  title text not null,
  description text not null default '',
  pass_threshold integer not null default 70 check (pass_threshold between 1 and 100),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds >= 60),
  max_attempts integer check (max_attempts is null or max_attempts >= 1),
  question_count integer check (question_count is null or question_count >= 1),
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'lesson_quiz' and lesson_id is not null) or (kind = 'unit_test' and unit_id is not null) or kind = 'practice_set')
);
create unique index quizzes_one_per_lesson on public.quizzes (lesson_id) where kind = 'lesson_quiz';
create unique index quizzes_one_per_unit on public.quizzes (unit_id) where kind = 'unit_test';

create table public.quiz_questions (
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (quiz_id, question_id)
);
create index quiz_questions_question_idx on public.quiz_questions (question_id);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  kind public.exam_kind not null,
  level_id uuid references public.levels (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  pass_threshold integer not null default 70 check (pass_threshold between 1 and 100),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds >= 60),
  max_attempts integer check (max_attempts is null or max_attempts >= 1),
  cooldown_hours integer not null default 0 check (cooldown_hours >= 0),
  question_count integer not null default 30 check (question_count >= 1),
  -- Distribution of the random selection, e.g. {"grammar":10,"vocabulary":8,...}
  blueprint jsonb not null default '{}'::jsonb,
  shuffle_options boolean not null default true,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'placement' or level_id is not null)
);
create unique index exams_one_level_exam on public.exams (level_id) where kind = 'level_exam';

create table public.exam_questions (
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (exam_id, question_id)
);
create index exam_questions_question_idx on public.exam_questions (question_id);

-- ---------------------------------------------------------------------------
-- Blog & contact (public website)
-- ---------------------------------------------------------------------------
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  body_md text not null,
  tags text[] not null default '{}',
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Tim Linguora',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  subject text not null check (char_length(subject) between 1 and 150),
  message text not null check (char_length(message) between 10 and 5000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content versions (snapshots used for history and rollback)
-- ---------------------------------------------------------------------------
create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lesson', 'question', 'grammar_topic', 'reading_passage', 'blog_post')),
  entity_id uuid not null,
  version integer not null,
  snapshot jsonb not null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);
create index content_versions_entity_idx on public.content_versions (entity_type, entity_id, version desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'learning_tracks', 'levels', 'courses', 'units', 'lessons', 'lesson_sections', 'grammar_topics',
    'reading_passages', 'listening_materials', 'speaking_prompts', 'writing_rubrics', 'writing_prompts',
    'vocabulary_entries', 'questions', 'quizzes', 'exams', 'blog_posts'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- audit triggers on CMS tables
do $$
declare t text;
begin
  foreach t in array array[
    'learning_tracks', 'levels', 'courses', 'units', 'lessons', 'grammar_topics', 'reading_passages',
    'listening_materials', 'speaking_prompts', 'writing_rubrics', 'writing_prompts', 'vocabulary_entries',
    'questions', 'quizzes', 'exams', 'blog_posts'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t || '_audit', t);
  end loop;
end $$;
-- =============================================================================
-- Linguora — learner data: progress, attempts, review, gamification, personal tools
-- =============================================================================

-- Levels a learner may access. Inserted only by trusted server code
-- (registration default, placement result, passed level exam, admin).
create table public.user_level_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete cascade,
  source text not null check (source in ('default', 'placement', 'exam', 'admin')),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create type public.progress_status as enum ('in_progress', 'completed', 'mastered', 'needs_review');

create table public.learning_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  viewed_sections uuid[] not null default '{}',
  material_completed_at timestamptz,
  best_quiz_score numeric(5, 2),
  quiz_attempts integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  mastered_at timestamptz,
  last_activity_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index learning_progress_user_idx on public.learning_progress (user_id, status);

-- ---------------------------------------------------------------------------
-- Attempts & answers (quizzes, unit tests, level exams, placement, practice)
-- ---------------------------------------------------------------------------
create type public.attempt_kind as enum ('lesson_quiz', 'unit_test', 'level_exam', 'placement', 'practice', 'daily_challenge', 'review');
create type public.attempt_status as enum ('in_progress', 'submitted', 'graded', 'expired', 'abandoned');

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.attempt_kind not null,
  quiz_id uuid references public.quizzes (id) on delete set null,
  exam_id uuid references public.exams (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  level_id uuid references public.levels (id) on delete set null,
  status public.attempt_status not null default 'in_progress',
  question_ids uuid[] not null,
  -- {questionId: [optionId, ...]} display order chosen by the server
  option_orders jsonb not null default '{}'::jsonb,
  attempt_number integer not null default 1,
  pass_threshold integer,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  score_points numeric(8, 2),
  max_points numeric(8, 2),
  score_percent numeric(5, 2),
  passed boolean,
  pending_manual boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index assessment_attempts_user_idx on public.assessment_attempts (user_id, created_at desc);
create index assessment_attempts_quiz_idx on public.assessment_attempts (user_id, quiz_id);
create index assessment_attempts_exam_idx on public.assessment_attempts (user_id, exam_id);
create index assessment_attempts_kind_idx on public.assessment_attempts (user_id, kind, status);
-- Only one open attempt per user per quiz/exam.
create unique index assessment_attempts_open_quiz on public.assessment_attempts (user_id, quiz_id) where status = 'in_progress' and quiz_id is not null;
create unique index assessment_attempts_open_exam on public.assessment_attempts (user_id, exam_id) where status = 'in_progress' and exam_id is not null;

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric(6, 2),
  max_points numeric(6, 2),
  needs_manual_grading boolean not null default false,
  feedback text,
  graded_by uuid references auth.users (id) on delete set null,
  graded_at timestamptz,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index assessment_answers_user_idx on public.assessment_answers (user_id, answered_at desc);
create index assessment_answers_question_idx on public.assessment_answers (question_id);
create index assessment_answers_manual_idx on public.assessment_answers (needs_manual_grading) where needs_manual_grading;

-- Per-user, per-question history (used by adaptive practice to avoid repetition).
create table public.user_question_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  times_seen integer not null default 0,
  times_correct integer not null default 0,
  last_correct boolean,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.assessment_attempts (id) on delete cascade,
  category public.skill_category not null,
  score_percent numeric(5, 2) not null,
  questions_count integer not null,
  estimated_level text,
  created_at timestamptz not null default now()
);
create index skill_assessments_user_idx on public.skill_assessments (user_id, created_at desc);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete cascade,
  attempt_id uuid references public.assessment_attempts (id) on delete set null,
  score_percent numeric(5, 2) not null,
  verification_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  issued_at timestamptz not null default now(),
  unique (user_id, level_id)
);

-- ---------------------------------------------------------------------------
-- Spaced repetition
-- ---------------------------------------------------------------------------
create type public.review_item_type as enum ('vocabulary', 'user_vocabulary', 'question', 'lesson', 'review_card');

create table public.review_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type public.review_item_type not null,
  item_id uuid not null,
  -- e.g. card index for review_card items: "<lessonId>:<index>"
  item_ref text not null default '',
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_grade smallint,
  mastery text not null default 'new' check (mastery in ('new', 'learning', 'review', 'mastered')),
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id, item_ref)
);
create index review_schedules_due_idx on public.review_schedules (user_id, due_at);

-- ---------------------------------------------------------------------------
-- Vocabulary (personal)
-- ---------------------------------------------------------------------------
create table public.vocabulary_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 280),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid references public.vocabulary_entries (id) on delete cascade,
  custom_word text check (char_length(custom_word) <= 80),
  custom_meaning text check (char_length(custom_meaning) <= 280),
  custom_example text check (char_length(custom_example) <= 400),
  collection_id uuid references public.vocabulary_collections (id) on delete set null,
  is_favorite boolean not null default false,
  note text check (char_length(note) <= 500),
  added_at timestamptz not null default now(),
  check (entry_id is not null or (custom_word is not null and custom_meaning is not null))
);
create unique index user_vocabulary_entry_idx on public.user_vocabulary (user_id, entry_id) where entry_id is not null;
create unique index user_vocabulary_custom_idx on public.user_vocabulary (user_id, lower(custom_word)) where entry_id is null;

-- ---------------------------------------------------------------------------
-- Writing & speaking
-- ---------------------------------------------------------------------------
create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid references public.writing_prompts (id) on delete set null,
  title text,
  content text not null default '' check (char_length(content) <= 20000),
  word_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  self_assessment jsonb not null default '{}'::jsonb,
  rubric_scores jsonb,
  reviewer_feedback text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  ai_feedback jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index writing_submissions_user_idx on public.writing_submissions (user_id, updated_at desc);
create index writing_submissions_review_idx on public.writing_submissions (status) where status = 'submitted';
create trigger writing_submissions_updated_at before update on public.writing_submissions
  for each row execute function public.set_updated_at();

create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid references public.speaking_prompts (id) on delete set null,
  mode text not null default 'speaking' check (mode in ('speaking', 'pronunciation', 'conversation')),
  transcript text check (char_length(transcript) <= 10000),
  recognition_confidence numeric(4, 3),
  recognition_available boolean not null default false,
  duration_seconds integer,
  audio_path text,
  matched_phrases text[] not null default '{}',
  word_count integer not null default 0,
  self_rating jsonb not null default '{}'::jsonb,
  reflection text check (char_length(reflection) <= 2000),
  created_at timestamptz not null default now()
);
create index speaking_sessions_user_idx on public.speaking_sessions (user_id, created_at desc);

create table public.reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  passage_id uuid not null references public.reading_passages (id) on delete cascade,
  best_score numeric(5, 2),
  time_spent_seconds integer not null default 0,
  completed_at timestamptz,
  last_read_at timestamptz not null default now(),
  primary key (user_id, passage_id)
);

create table public.listening_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid not null references public.listening_materials (id) on delete cascade,
  best_score numeric(5, 2),
  plays integer not null default 0,
  completed_at timestamptz,
  last_played_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

-- ---------------------------------------------------------------------------
-- Study tools
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'free' check (mode in ('free', 'pomodoro')),
  lesson_id uuid references public.lessons (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 43200),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

create table public.study_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- minutes per weekday: {"mon":15,"tue":15,...}
  weekly_schedule jsonb not null default '{"mon":15,"tue":15,"wed":15,"thu":15,"fri":15,"sat":15,"sun":15}'::jsonb,
  reminder_time time,
  reminders_enabled boolean not null default false,
  target_level_id uuid references public.levels (id) on delete set null,
  target_date date,
  updated_at timestamptz not null default now()
);

create table public.planned_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  planned_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index planned_lessons_user_idx on public.planned_lessons (user_id, planned_date);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'journal')),
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null default '' check (char_length(title) <= 150),
  body text not null default '' check (char_length(body) <= 20000),
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, updated_at desc);
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('lesson', 'grammar', 'reading', 'listening', 'vocabulary', 'question')),
  target_id uuid not null,
  title text not null check (char_length(title) <= 200),
  href text not null check (char_length(href) <= 300),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Gamification
-- ---------------------------------------------------------------------------
create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  lessons_completed integer not null default 0,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  perfect_scores integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  xp_earned integer not null default 0,
  practice_xp integer not null default 0,
  minutes_studied integer not null default 0,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  lessons_completed integer not null default 0,
  reviews_done integer not null default 0,
  goal_met boolean not null default false,
  primary key (user_id, activity_date)
);

create type public.xp_source as enum (
  'lesson_complete', 'lesson_mastered', 'quiz_pass', 'unit_test_pass', 'exam_pass', 'placement',
  'practice', 'review', 'daily_goal', 'daily_challenge', 'challenge', 'achievement', 'perfect_score',
  'admin_adjust'
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount between -10000 and 10000 and amount <> 0),
  source public.xp_source not null,
  source_id text,
  -- Prevents duplicate rewards: one transaction per (user, key).
  idempotency_key text not null,
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);
create index xp_transactions_period_idx on public.xp_transactions (created_at, user_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'award',
  category text not null default 'general',
  -- {"metric":"lessons_completed","threshold":10}
  criteria jsonb not null,
  xp_reward integer not null default 0 check (xp_reward between 0 and 1000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger achievements_updated_at before update on public.achievements for each row execute function public.set_updated_at();
create trigger achievements_audit after insert or update or delete on public.achievements
  for each row execute function public.audit_row_change();

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (user_id, achievement_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  period text not null check (period in ('daily', 'weekly')),
  title text not null,
  description text not null,
  metric text not null check (metric in ('xp', 'questions', 'correct_answers', 'lessons', 'minutes', 'reviews')),
  target integer not null check (target > 0),
  xp_reward integer not null check (xp_reward between 1 and 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('weekly', 'monthly', 'all_time')),
  period_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  xp integer not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  unique (period, period_start, user_id)
);
create index leaderboard_snapshots_period_idx on public.leaderboard_snapshots (period, period_start, rank);

-- ---------------------------------------------------------------------------
-- AI tutor
-- ---------------------------------------------------------------------------
create table public.ai_tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Percakapan baru' check (char_length(title) <= 120),
  mode text not null default 'tutor' check (mode in ('tutor', 'grammar', 'correction', 'conversation', 'vocabulary', 'writing', 'study_plan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_tutor_sessions_user_idx on public.ai_tutor_sessions (user_id, updated_at desc);

create table public.ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_tutor_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index ai_tutor_messages_session_idx on public.ai_tutor_messages (session_id, created_at);
create index ai_tutor_messages_user_day_idx on public.ai_tutor_messages (user_id, created_at);
-- =============================================================================
-- Linguora — server-side business logic
--
-- Functions taking an explicit p_user are "service" functions: EXECUTE is revoked
-- from anon/authenticated at the end of this file, so only the server (service
-- role) can call them. Thin wrappers that use auth.uid() are exposed to clients.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- New user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_username text;
  v_display text;
  v_tz text;
  v_a1 uuid;
begin
  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1), 'learner'),
    '[^a-zA-Z0-9_]', '', 'g'));
  v_base := left(v_base, 18);
  if char_length(v_base) < 3 then
    v_base := 'learner';
  end if;
  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_username := v_base || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  v_display := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), v_username), 60);
  v_tz := coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'Asia/Jakarta');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Asia/Jakarta';
  end if;

  insert into public.profiles (id, username, display_name, timezone)
  values (new.id, v_username, v_display, v_tz);
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  insert into public.user_stats (user_id) values (new.id);

  select id into v_a1 from public.levels where code = 'A1';
  if v_a1 is not null then
    insert into public.user_level_unlocks (user_id, level_id, source) values (new.id, v_a1, 'default')
    on conflict do nothing;
    update public.profiles set current_level_id = v_a1 where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Dates & activity
-- ---------------------------------------------------------------------------
create or replace function public.user_local_date(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'Asia/Jakarta'))::date;
$$;

-- Records learning activity for "today" in the learner's timezone and updates the streak.
-- Repeated calls on the same day never change the streak (idempotent per day).
create or replace function public.record_activity(
  p_user uuid,
  p_questions integer default 0,
  p_correct integer default 0,
  p_lessons integer default 0,
  p_minutes integer default 0,
  p_reviews integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := public.user_local_date(p_user);
  v_last date;
  v_streak integer;
begin
  insert into public.daily_activity as d (user_id, activity_date, questions_answered, correct_answers, lessons_completed, minutes_studied, reviews_done)
  values (p_user, v_today, greatest(p_questions, 0), greatest(p_correct, 0), greatest(p_lessons, 0), greatest(p_minutes, 0), greatest(p_reviews, 0))
  on conflict (user_id, activity_date) do update set
    questions_answered = d.questions_answered + excluded.questions_answered,
    correct_answers = d.correct_answers + excluded.correct_answers,
    lessons_completed = d.lessons_completed + excluded.lessons_completed,
    minutes_studied = d.minutes_studied + excluded.minutes_studied,
    reviews_done = d.reviews_done + excluded.reviews_done;

  insert into public.user_stats (user_id) values (p_user) on conflict do nothing;
  select last_active_date, current_streak into v_last, v_streak
  from public.user_stats where user_id = p_user for update;

  if v_last is null or v_last < v_today - 1 then
    v_streak := 1;
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  end if; -- v_last >= v_today: same day (or timezone moved backwards) → unchanged

  update public.user_stats set
    current_streak = v_streak,
    longest_streak = greatest(longest_streak, v_streak),
    last_active_date = greatest(coalesce(last_active_date, v_today), v_today),
    questions_answered = questions_answered + greatest(p_questions, 0),
    correct_answers = correct_answers + greatest(p_correct, 0),
    lessons_completed = lessons_completed + greatest(p_lessons, 0),
    updated_at = now()
  where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- XP (idempotent, capped for practice)
-- ---------------------------------------------------------------------------
create or replace function public.award_xp(
  p_user uuid,
  p_amount integer,
  p_source public.xp_source,
  p_source_id text,
  p_key text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := public.user_local_date(p_user);
  v_amount integer := p_amount;
  v_cap integer;
  v_practice integer;
  v_xp integer;
  v_goal_met boolean;
  v_goal integer;
  v_rows integer;
begin
  if p_amount is null or p_amount = 0 then
    return 0;
  end if;

  insert into public.daily_activity (user_id, activity_date) values (p_user, v_today) on conflict do nothing;
  select practice_xp, goal_met into v_practice, v_goal_met
  from public.daily_activity where user_id = p_user and activity_date = v_today for update;

  if p_source in ('practice', 'review') then
    v_cap := coalesce((select (value #>> '{}')::integer from public.system_settings where key = 'practice_daily_xp_cap'), 100);
    v_amount := least(v_amount, greatest(v_cap - v_practice, 0));
    if v_amount <= 0 then
      return 0;
    end if;
  end if;

  insert into public.xp_transactions (user_id, amount, source, source_id, idempotency_key, activity_date)
  values (p_user, v_amount, p_source, p_source_id, p_key, v_today)
  on conflict (user_id, idempotency_key) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 0; -- already rewarded
  end if;

  update public.user_stats set total_xp = total_xp + v_amount, updated_at = now() where user_id = p_user;
  update public.daily_activity set
    xp_earned = xp_earned + v_amount,
    practice_xp = practice_xp + case when p_source in ('practice', 'review') then v_amount else 0 end
  where user_id = p_user and activity_date = v_today
  returning xp_earned into v_xp;

  if not v_goal_met and p_source <> 'daily_goal' then
    select daily_goal_xp into v_goal from public.profiles where id = p_user;
    if v_xp >= coalesce(v_goal, 30) then
      update public.daily_activity set goal_met = true where user_id = p_user and activity_date = v_today;
      perform public.award_xp(p_user, 10, 'daily_goal', v_today::text, 'daily_goal:' || v_today::text);
      insert into public.notifications (user_id, type, title, body, href)
      values (p_user, 'daily_goal', 'Target harian tercapai! 🎯', 'Kamu mendapatkan bonus 10 XP. Pertahankan!', '/app/dashboard');
    end if;
  end if;

  return v_amount;
end;
$$;

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create or replace function public.achievement_metric(p_user uuid, p_metric text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return case p_metric
    when 'lessons_completed' then (select count(*) from public.learning_progress where user_id = p_user and status in ('completed', 'mastered', 'needs_review'))
    when 'lessons_mastered' then (select count(*) from public.learning_progress where user_id = p_user and status = 'mastered')
    when 'total_xp' then (select total_xp from public.user_stats where user_id = p_user)
    when 'streak' then (select longest_streak from public.user_stats where user_id = p_user)
    when 'perfect_scores' then (select perfect_scores from public.user_stats where user_id = p_user)
    when 'correct_answers' then (select correct_answers from public.user_stats where user_id = p_user)
    when 'units_completed' then (select count(distinct unit_id) from public.assessment_attempts where user_id = p_user and kind = 'unit_test' and passed)
    when 'levels_passed' then (select count(*) from public.certificates where user_id = p_user)
    when 'placement_done' then (select count(*) from public.assessment_attempts where user_id = p_user and kind = 'placement' and status = 'graded')
    when 'vocabulary_saved' then (select count(*) from public.user_vocabulary where user_id = p_user)
    when 'reviews_done' then (select coalesce(sum(reviews_done), 0) from public.daily_activity where user_id = p_user)
    when 'writing_submitted' then (select count(*) from public.writing_submissions where user_id = p_user and status in ('submitted', 'reviewed'))
    when 'speaking_sessions' then (select count(*) from public.speaking_sessions where user_id = p_user)
    when 'daily_goals' then (select count(*) from public.daily_activity where user_id = p_user and goal_met)
    else 0
  end;
end;
$$;

create or replace function public.evaluate_achievements(p_user uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  v_new text[] := '{}';
  v_rows integer;
begin
  for a in
    select ach.* from public.achievements ach
    where ach.is_active
      and not exists (select 1 from public.user_achievements ua where ua.user_id = p_user and ua.achievement_id = ach.id)
    order by ach.sort_order
  loop
    if coalesce(public.achievement_metric(p_user, a.criteria ->> 'metric'), 0) >= coalesce((a.criteria ->> 'threshold')::integer, 1) then
      insert into public.user_achievements (user_id, achievement_id) values (p_user, a.id) on conflict do nothing;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_new := v_new || a.key;
        if a.xp_reward > 0 then
          perform public.award_xp(p_user, a.xp_reward, 'achievement', a.key, 'achievement:' || a.key);
        end if;
        insert into public.notifications (user_id, type, title, body, href)
        values (p_user, 'achievement', 'Achievement baru: ' || a.name, a.description, '/app/achievements');
      end if;
    end if;
  end loop;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Progression (single source of truth for locking rules)
--
-- * A level is accessible when user_level_unlocks has a row for it.
-- * Units inside a course open sequentially: unit N+1 opens when every published
--   lesson of unit N is completed AND its unit test (if any) is passed.
-- * A lesson opens when its unit is open and all lesson_prerequisites are completed.
-- ---------------------------------------------------------------------------
create or replace function public.course_path_for(p_user uuid, p_course uuid)
returns table (
  unit_id uuid,
  unit_sort integer,
  unit_unlocked boolean,
  unit_completed boolean,
  unit_test_quiz_id uuid,
  unit_test_passed boolean,
  lessons_done boolean,
  lesson_id uuid,
  lesson_sort integer,
  lesson_status text,
  best_score numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_level uuid;
  v_level_unlocked boolean;
  v_prev_done boolean := true;
  u record;
  l record;
  v_quiz uuid;
  v_test_passed boolean;
  v_lessons_done boolean;
  v_unit_unlocked boolean;
  v_prog_status text;
  v_prog_score numeric;
  v_prereq_ok boolean;
begin
  select c.level_id into v_level from public.courses c where c.id = p_course;
  if v_level is null then
    return;
  end if;
  v_level_unlocked := exists (select 1 from public.user_level_unlocks ul where ul.user_id = p_user and ul.level_id = v_level);

  for u in
    select un.id, un.sort_order from public.units un
    where un.course_id = p_course and un.status = 'published'
    order by un.sort_order
  loop
    v_unit_unlocked := v_level_unlocked and v_prev_done;
    v_quiz := null;
    select q.id into v_quiz from public.quizzes q where q.unit_id = u.id and q.kind = 'unit_test' and q.status = 'published';
    v_test_passed := v_quiz is null or exists (
      select 1 from public.assessment_attempts a where a.user_id = p_user and a.quiz_id = v_quiz and a.passed);
    v_lessons_done := not exists (
      select 1 from public.lessons ls
      where ls.unit_id = u.id and ls.status = 'published'
        and not exists (
          select 1 from public.learning_progress lp
          where lp.user_id = p_user and lp.lesson_id = ls.id and lp.status in ('completed', 'mastered', 'needs_review')));

    for l in
      select ls.id, ls.sort_order from public.lessons ls
      where ls.unit_id = u.id and ls.status = 'published'
      order by ls.sort_order
    loop
      v_prog_status := null;
      v_prog_score := null;
      select lp.status::text, lp.best_quiz_score into v_prog_status, v_prog_score
      from public.learning_progress lp where lp.user_id = p_user and lp.lesson_id = l.id;

      v_prereq_ok := not exists (
        select 1 from public.lesson_prerequisites pr
        join public.lessons pl on pl.id = pr.prerequisite_lesson_id and pl.status = 'published'
        where pr.lesson_id = l.id
          and not exists (
            select 1 from public.learning_progress lp2
            where lp2.user_id = p_user and lp2.lesson_id = pr.prerequisite_lesson_id
              and lp2.status in ('completed', 'mastered', 'needs_review')));

      if v_prog_status is null then
        lesson_status := case when v_unit_unlocked and v_prereq_ok then 'available' else 'locked' end;
      elsif v_prog_status in ('completed', 'mastered') and exists (
          select 1 from public.review_schedules rs
          where rs.user_id = p_user and rs.item_type = 'lesson' and rs.item_id = l.id and rs.due_at <= now()) then
        lesson_status := 'needs_review';
      elsif not v_unit_unlocked and v_prog_status = 'in_progress' then
        lesson_status := 'locked';
      else
        lesson_status := v_prog_status;
      end if;

      unit_id := u.id;
      unit_sort := u.sort_order;
      unit_unlocked := v_unit_unlocked;
      unit_completed := v_unit_unlocked and v_lessons_done and v_test_passed;
      unit_test_quiz_id := v_quiz;
      unit_test_passed := v_quiz is not null and v_test_passed;
      lessons_done := v_lessons_done;
      lesson_id := l.id;
      lesson_sort := l.sort_order;
      best_score := v_prog_score;
      return next;
    end loop;

    v_prev_done := v_unit_unlocked and v_lessons_done and v_test_passed;
  end loop;
end;
$$;

create or replace function public.lesson_accessible_for(p_user uuid, p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select cp.lesson_status <> 'locked'
    from public.course_path_for(
      p_user,
      (select un.course_id from public.lessons ls join public.units un on un.id = ls.unit_id where ls.id = p_lesson)
    ) cp
    where cp.lesson_id = p_lesson
  ), false);
$$;

create or replace function public.level_exam_unlocked_for(p_user uuid, p_level uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_level_unlocks where user_id = p_user and level_id = p_level)
     and exists (select 1 from public.courses where level_id = p_level and is_core and status = 'published')
     and coalesce((
       select bool_and(cp.unit_completed)
       from public.course_path_for(p_user, (select id from public.courses where level_id = p_level and is_core)) cp
     ), false);
$$;

-- Client-facing wrappers (use the caller's identity).
create or replace function public.get_course_path(p_course uuid)
returns table (
  unit_id uuid, unit_sort integer, unit_unlocked boolean, unit_completed boolean, unit_test_quiz_id uuid,
  unit_test_passed boolean, lessons_done boolean, lesson_id uuid, lesson_sort integer, lesson_status text, best_score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.course_path_for(auth.uid(), p_course);
$$;

create or replace function public.can_access_lesson(p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('content.read') or public.lesson_accessible_for(auth.uid(), p_lesson);
$$;

-- ---------------------------------------------------------------------------
-- Practice answers (instant feedback). Grading happens in the server; this only
-- persists the graded result. The first answer to a question in an attempt counts.
-- ---------------------------------------------------------------------------
create or replace function public.record_practice_answer(
  p_attempt uuid,
  p_question uuid,
  p_response jsonb,
  p_is_correct boolean,
  p_points numeric,
  p_max_points numeric,
  p_needs_manual boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_att public.assessment_attempts;
  v_rows integer;
  v_xp integer := 0;
begin
  select * into v_att from public.assessment_attempts where id = p_attempt for update;
  if not found or v_att.status <> 'in_progress' or not (p_question = any (v_att.question_ids)) then
    raise exception 'invalid practice attempt' using errcode = 'P0001';
  end if;

  insert into public.assessment_answers (attempt_id, user_id, question_id, response, is_correct, points_awarded, max_points, needs_manual_grading, graded_at)
  values (p_attempt, v_att.user_id, p_question, p_response, p_is_correct, p_points, p_max_points, p_needs_manual, case when p_needs_manual then null else now() end)
  on conflict (attempt_id, question_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('first_answer', false, 'xp', 0);
  end if;

  if not p_needs_manual and p_is_correct is not null then
    insert into public.user_question_stats as s (user_id, question_id, times_seen, times_correct, last_correct, last_seen_at)
    values (v_att.user_id, p_question, 1, case when p_is_correct then 1 else 0 end, p_is_correct, now())
    on conflict (user_id, question_id) do update set
      times_seen = s.times_seen + 1,
      times_correct = s.times_correct + case when p_is_correct then 1 else 0 end,
      last_correct = p_is_correct,
      last_seen_at = now();

    if p_is_correct then
      v_xp := public.award_xp(v_att.user_id, 2, case when v_att.kind = 'review' then 'review'::public.xp_source else 'practice'::public.xp_source end,
        p_question::text, 'answer:' || p_attempt::text || ':' || p_question::text);
    elsif v_att.kind <> 'review' then
      insert into public.review_schedules (user_id, item_type, item_id, due_at, mastery)
      values (v_att.user_id, 'question', p_question, now() + interval '1 day', 'learning')
      on conflict (user_id, item_type, item_id, item_ref) do update set due_at = least(public.review_schedules.due_at, excluded.due_at);
    end if;
    perform public.record_activity(v_att.user_id, 1, case when p_is_correct then 1 else 0 end, 0, 0, case when v_att.kind = 'review' then 1 else 0 end);
  end if;

  return jsonb_build_object('first_answer', true, 'xp', v_xp);
end;
$$;

-- ---------------------------------------------------------------------------
-- Attempt finalisation (atomic). The server grades answers and passes results;
-- this function persists them and applies every consequence exactly once.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_attempt(p_attempt uuid, p_answers jsonb, p_outcome jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_att public.assessment_attempts;
  v_user uuid;
  v_score numeric := coalesce((p_outcome ->> 'score_percent')::numeric, 0);
  v_passed boolean := coalesce((p_outcome ->> 'passed')::boolean, false);
  v_pending boolean := coalesce((p_outcome ->> 'pending_manual')::boolean, false);
  v_answered integer;
  v_correct integer;
  v_lessons integer := 0;
  v_xp integer := 0;
  v_gain integer;
  v_mastery integer;
  v_lesson public.lessons;
  v_level public.levels;
  v_next public.levels;
  v_place public.levels;
  v_status public.progress_status;
  v_new_ach text[];
  v_unlocked_level text;
  v_today date;
  v_xp_before integer;
  r record;
begin
  select * into v_att from public.assessment_attempts where id = p_attempt for update;
  if not found then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  if v_att.status <> 'in_progress' then
    return jsonb_build_object('already_finalized', true, 'score_percent', v_att.score_percent, 'passed', v_att.passed);
  end if;
  v_user := v_att.user_id;
  select coalesce(total_xp, 0) into v_xp_before from public.user_stats where user_id = v_user;

  -- 1. answers
  insert into public.assessment_answers as aa (attempt_id, user_id, question_id, response, is_correct, points_awarded, max_points, needs_manual_grading, graded_at)
  select p_attempt, v_user, (x ->> 'question_id')::uuid, x -> 'response',
         (x ->> 'is_correct')::boolean, (x ->> 'points_awarded')::numeric, (x ->> 'max_points')::numeric,
         coalesce((x ->> 'needs_manual')::boolean, false),
         case when coalesce((x ->> 'needs_manual')::boolean, false) then null else now() end
  from jsonb_array_elements(p_answers) x
  where (x ->> 'question_id')::uuid = any (v_att.question_ids)
  on conflict (attempt_id, question_id) do update set
    response = excluded.response,
    is_correct = excluded.is_correct,
    points_awarded = excluded.points_awarded,
    max_points = excluded.max_points,
    needs_manual_grading = excluded.needs_manual_grading,
    graded_at = excluded.graded_at;

  -- 2. attempt
  update public.assessment_attempts set
    status = case when v_pending then 'submitted'::public.attempt_status else 'graded'::public.attempt_status end,
    submitted_at = now(),
    score_points = (p_outcome ->> 'score_points')::numeric,
    max_points = (p_outcome ->> 'max_points')::numeric,
    score_percent = v_score,
    passed = v_passed,
    pending_manual = v_pending,
    result = coalesce(p_outcome -> 'result', '{}'::jsonb)
  where id = p_attempt;

  -- 3. per-question statistics and review queue
  select count(*) filter (where not coalesce((x ->> 'needs_manual')::boolean, false) and x ->> 'is_correct' is not null),
         count(*) filter (where (x ->> 'is_correct')::boolean)
  into v_answered, v_correct
  from jsonb_array_elements(p_answers) x
  where (x ->> 'question_id')::uuid = any (v_att.question_ids);

  insert into public.user_question_stats as s (user_id, question_id, times_seen, times_correct, last_correct, last_seen_at)
  select v_user, (x ->> 'question_id')::uuid, 1, case when (x ->> 'is_correct')::boolean then 1 else 0 end, (x ->> 'is_correct')::boolean, now()
  from jsonb_array_elements(p_answers) x
  where (x ->> 'question_id')::uuid = any (v_att.question_ids) and x ->> 'is_correct' is not null
  on conflict (user_id, question_id) do update set
    times_seen = s.times_seen + 1,
    times_correct = s.times_correct + excluded.times_correct,
    last_correct = excluded.last_correct,
    last_seen_at = now();

  if v_att.kind <> 'placement' then
    insert into public.review_schedules (user_id, item_type, item_id, due_at, mastery)
    select v_user, 'question', (x ->> 'question_id')::uuid, now() + interval '1 day', 'learning'
    from jsonb_array_elements(p_answers) x
    where (x ->> 'question_id')::uuid = any (v_att.question_ids) and (x ->> 'is_correct')::boolean = false
    on conflict (user_id, item_type, item_id, item_ref) do update set due_at = least(public.review_schedules.due_at, excluded.due_at);
  end if;

  -- 4. kind-specific consequences
  if v_att.kind = 'lesson_quiz' and v_att.lesson_id is not null then
    select * into v_lesson from public.lessons where id = v_att.lesson_id;
    v_mastery := coalesce((select (value #>> '{}')::integer from public.system_settings where key = 'lesson_mastery_threshold'), 90);

    insert into public.learning_progress (user_id, lesson_id) values (v_user, v_att.lesson_id) on conflict do nothing;
    update public.learning_progress set
      quiz_attempts = quiz_attempts + 1,
      best_quiz_score = greatest(coalesce(best_quiz_score, 0), v_score),
      last_activity_at = now()
    where user_id = v_user and lesson_id = v_att.lesson_id
    returning status into v_status;

    if v_passed then
      update public.learning_progress set
        status = case when v_score >= v_mastery or status = 'mastered' then 'mastered'::public.progress_status else 'completed'::public.progress_status end,
        completed_at = coalesce(completed_at, now()),
        mastered_at = case when v_score >= v_mastery then coalesce(mastered_at, now()) else mastered_at end
      where user_id = v_user and lesson_id = v_att.lesson_id;

      v_gain := public.award_xp(v_user, v_lesson.xp_reward, 'lesson_complete', v_lesson.id::text, 'lesson_complete:' || v_lesson.id::text);
      if v_gain > 0 then
        v_lessons := 1;
        v_xp := v_xp + v_gain;
      end if;
      if v_score >= v_mastery then
        v_xp := v_xp + public.award_xp(v_user, 10, 'lesson_mastered', v_lesson.id::text, 'lesson_mastered:' || v_lesson.id::text);
      end if;
      -- schedule a first lesson review in 3 days (spaced repetition of the lesson)
      insert into public.review_schedules (user_id, item_type, item_id, due_at, interval_days, mastery)
      values (v_user, 'lesson', v_lesson.id, now() + interval '3 days', 3, 'review')
      on conflict (user_id, item_type, item_id, item_ref) do update set
        due_at = greatest(public.review_schedules.due_at, now() + interval '3 days');
    end if;

  elsif v_att.kind = 'unit_test' and v_passed then
    v_xp := v_xp + public.award_xp(v_user, 30, 'unit_test_pass', v_att.unit_id::text, 'unit_test_pass:' || v_att.unit_id::text);
    insert into public.notifications (user_id, type, title, body, href)
    values (v_user, 'unit', 'Unit selesai! 🎉', 'Kamu lulus unit assessment. Unit berikutnya sudah terbuka.', '/app/learn');

  elsif v_att.kind = 'level_exam' and v_passed then
    select * into v_level from public.levels where id = v_att.level_id;
    v_xp := v_xp + public.award_xp(v_user, 100, 'exam_pass', v_level.id::text, 'exam_pass:' || v_level.id::text);
    insert into public.certificates (user_id, level_id, attempt_id, score_percent)
    values (v_user, v_level.id, p_attempt, v_score)
    on conflict (user_id, level_id) do update set
      score_percent = greatest(public.certificates.score_percent, excluded.score_percent);
    select * into v_next from public.levels where sort_order = v_level.sort_order + 1;
    if found then
      insert into public.user_level_unlocks (user_id, level_id, source) values (v_user, v_next.id, 'exam') on conflict do nothing;
      update public.profiles p set current_level_id = v_next.id
      where p.id = v_user and (p.current_level_id is null or (select sort_order from public.levels where id = p.current_level_id) < v_next.sort_order);
      v_unlocked_level := v_next.code;
    end if;
    insert into public.notifications (user_id, type, title, body, href)
    values (v_user, 'exam', 'Lulus ujian level ' || v_level.code || '!',
      case when v_next.id is not null then 'Level ' || v_next.code || ' sekarang terbuka. Sertifikat internal tersedia di profil.' else 'Kamu telah menyelesaikan level tertinggi.' end,
      '/app/learn');

  elsif v_att.kind = 'placement' then
    select * into v_place from public.levels where code = p_outcome ->> 'placement_level';
    if found then
      for r in select id from public.levels where sort_order <= v_place.sort_order loop
        insert into public.user_level_unlocks (user_id, level_id, source) values (v_user, r.id, 'placement') on conflict do nothing;
      end loop;
      update public.profiles set placement_level_id = v_place.id, current_level_id = v_place.id where id = v_user;
      v_unlocked_level := v_place.code;
    end if;
    insert into public.skill_assessments (user_id, attempt_id, category, score_percent, questions_count, estimated_level)
    select v_user, p_attempt, (c ->> 'category')::public.skill_category, (c ->> 'percent')::numeric, (c ->> 'count')::integer, c ->> 'estimated_level'
    from jsonb_array_elements(coalesce(p_outcome -> 'category_scores', '[]'::jsonb)) c;
    v_xp := v_xp + public.award_xp(v_user, 20, 'placement', p_attempt::text, 'placement:first');

  elsif v_att.kind in ('practice', 'review', 'daily_challenge') then
    v_xp := v_xp + public.award_xp(v_user, 2 * v_correct,
      case when v_att.kind = 'review' then 'review'::public.xp_source else 'practice'::public.xp_source end,
      p_attempt::text, 'attempt:' || p_attempt::text);
    if v_att.kind = 'daily_challenge' then
      v_today := public.user_local_date(v_user);
      v_xp := v_xp + public.award_xp(v_user, 20, 'daily_challenge', v_today::text, 'daily_challenge:' || v_today::text);
    end if;
  end if;

  -- 5. perfect score bonus (once per assessment)
  if v_score >= 100 and not v_pending and v_att.kind in ('lesson_quiz', 'unit_test', 'level_exam') then
    v_gain := public.award_xp(v_user, 10, 'perfect_score', coalesce(v_att.quiz_id, v_att.exam_id)::text,
      'perfect:' || coalesce(v_att.quiz_id, v_att.exam_id)::text);
    if v_gain > 0 then
      update public.user_stats set perfect_scores = perfect_scores + 1 where user_id = v_user;
      v_xp := v_xp + v_gain;
    end if;
  end if;

  -- 6. activity, streak, achievements
  perform public.record_activity(v_user, v_answered, v_correct, v_lessons, 0, case when v_att.kind = 'review' then v_answered else 0 end);
  v_new_ach := public.evaluate_achievements(v_user);
  -- Report every XP gained by this submission (incl. daily-goal and achievement bonuses).
  select coalesce(total_xp, 0) - coalesce(v_xp_before, 0) into v_xp from public.user_stats where user_id = v_user;

  update public.assessment_attempts set result = result || jsonb_build_object(
    'xp_awarded', v_xp, 'achievements', to_jsonb(v_new_ach), 'unlocked_level', v_unlocked_level)
  where id = p_attempt;

  return jsonb_build_object(
    'already_finalized', false,
    'score_percent', v_score,
    'passed', v_passed,
    'xp_awarded', v_xp,
    'achievements', to_jsonb(v_new_ach),
    'unlocked_level', v_unlocked_level
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard (opt-in only; exposes username/display name, never email)
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_period text default 'weekly', p_limit integer default 20, p_offset integer default 0)
returns table (rank bigint, username text, display_name text, avatar_url text, xp bigint, is_me boolean, total_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select x.user_id, sum(x.amount)::bigint as xp
    from public.xp_transactions x
    where case p_period
      when 'weekly' then x.created_at >= date_trunc('week', now())
      when 'monthly' then x.created_at >= date_trunc('month', now())
      else true end
    group by x.user_id
  ),
  visible as (
    select t.user_id, t.xp, p.username, p.display_name, p.avatar_url
    from totals t
    join public.profiles p on p.id = t.user_id
    where p.leaderboard_opt_in and p.deleted_at is null and t.xp > 0
  ),
  ranked as (
    select rank() over (order by v.xp desc) as rank, v.*, count(*) over () as total_count
    from visible v
  )
  select r.rank, r.username, r.display_name, r.avatar_url, r.xp, r.user_id = auth.uid(), r.total_count
  from ranked r
  order by r.rank, r.username
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

create or replace function public.get_my_leaderboard_rank(p_period text default 'weekly')
returns table (rank bigint, xp bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select x.user_id, sum(x.amount)::bigint as xp
    from public.xp_transactions x
    join public.profiles p on p.id = x.user_id and p.leaderboard_opt_in and p.deleted_at is null
    where case p_period
      when 'weekly' then x.created_at >= date_trunc('week', now())
      when 'monthly' then x.created_at >= date_trunc('month', now())
      else true end
    group by x.user_id
  ),
  ranked as (select t.user_id, t.xp, rank() over (order by t.xp desc) as rank from totals t where t.xp > 0)
  select r.rank, r.xp from ranked r where r.user_id = auth.uid();
$$;

create or replace function public.snapshot_leaderboard(p_period text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date := case p_period when 'weekly' then date_trunc('week', now())::date when 'monthly' then date_trunc('month', now())::date else '1970-01-01'::date end;
  v_rows integer;
begin
  if auth.uid() is not null and not public.has_permission('reports.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.leaderboard_snapshots (period, period_start, user_id, xp, rank)
  select p_period, v_start, t.user_id, t.xp, rank() over (order by t.xp desc)
  from (
    select x.user_id, sum(x.amount)::integer as xp
    from public.xp_transactions x
    join public.profiles p on p.id = x.user_id and p.leaderboard_opt_in
    where p_period = 'all_time' or x.created_at >= v_start
    group by x.user_id
  ) t
  where t.xp > 0
  on conflict (period, period_start, user_id) do update set xp = excluded.xp, rank = excluded.rank, created_at = now();
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public, privacy-safe platform statistics (real counts, no personal data)
-- ---------------------------------------------------------------------------
create or replace function public.public_platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'levels', (select count(*) from public.levels),
    'tracks', (select count(*) from public.learning_tracks where status = 'published'),
    'units', (select count(*) from public.units where status = 'published'),
    'lessons', (select count(*) from public.lessons where status = 'published'),
    'questions', (select count(*) from public.questions where status = 'published'),
    'vocabulary', (select count(*) from public.vocabulary_entries where status = 'published'),
    'grammar_topics', (select count(*) from public.grammar_topics where status = 'published'),
    'reading', (select count(*) from public.reading_passages where status = 'published'),
    'listening', (select count(*) from public.listening_materials where status = 'published'),
    'learners', (select count(*) from public.profiles where deleted_at is null),
    'answers_graded', (select count(*) from public.assessment_answers where graded_at is not null)
  );
$$;

-- ---------------------------------------------------------------------------
-- Manual grading of writing (reviewers)
-- ---------------------------------------------------------------------------
create or replace function public.review_writing_submission(p_submission uuid, p_scores jsonb, p_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.has_permission('grading.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.writing_submissions set
    rubric_scores = p_scores,
    reviewer_feedback = left(p_feedback, 5000),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    status = 'reviewed'
  where id = p_submission and status in ('submitted', 'reviewed')
  returning user_id into v_user;
  if v_user is null then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  insert into public.notifications (user_id, type, title, body, href)
  values (v_user, 'writing', 'Tulisanmu sudah dinilai', 'Reviewer memberikan feedback untuk tulisanmu.', '/app/writing?submission=' || p_submission::text);
  perform public.log_audit('review', 'writing_submissions', p_submission::text, jsonb_build_object('scores', p_scores));
end;
$$;

create or replace function public.grade_manual_answer(p_answer uuid, p_points numeric, p_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ans public.assessment_answers;
  v_pending integer;
  v_total numeric;
  v_max numeric;
begin
  if not public.has_permission('grading.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_ans from public.assessment_answers where id = p_answer for update;
  if not found then
    raise exception 'answer not found' using errcode = 'P0002';
  end if;
  update public.assessment_answers set
    points_awarded = least(greatest(p_points, 0), max_points),
    is_correct = p_points >= max_points * 0.5,
    needs_manual_grading = false,
    feedback = left(p_feedback, 2000),
    graded_by = auth.uid(),
    graded_at = now()
  where id = p_answer;

  select count(*) filter (where needs_manual_grading), sum(coalesce(points_awarded, 0)), sum(coalesce(max_points, 0))
  into v_pending, v_total, v_max
  from public.assessment_answers where attempt_id = v_ans.attempt_id;

  if v_pending = 0 then
    update public.assessment_attempts set
      status = 'graded',
      pending_manual = false,
      score_points = v_total,
      max_points = v_max,
      score_percent = case when v_max > 0 then round(v_total / v_max * 100, 2) else 0 end,
      passed = case when pass_threshold is null then null else (case when v_max > 0 then v_total / v_max * 100 else 0 end) >= pass_threshold end
    where id = v_ans.attempt_id;
  end if;
  perform public.log_audit('grade', 'assessment_answers', p_answer::text, jsonb_build_object('points', p_points));
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled publishing (called by the cron route)
-- ---------------------------------------------------------------------------
create or replace function public.publish_scheduled_content()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  update public.lessons set status = 'published', published_at = now()
  where publish_at is not null and publish_at <= now() and status = 'in_review';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down service-only functions
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.user_local_date(uuid) from public, anon, authenticated;
revoke execute on function public.record_activity(uuid, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.award_xp(uuid, integer, public.xp_source, text, text) from public, anon, authenticated;
revoke execute on function public.achievement_metric(uuid, text) from public, anon, authenticated;
revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.course_path_for(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.lesson_accessible_for(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.level_exam_unlocked_for(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.record_practice_answer(uuid, uuid, jsonb, boolean, numeric, numeric, boolean) from public, anon, authenticated;
revoke execute on function public.finalize_attempt(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.publish_scheduled_content() from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.user_has_permission(uuid, text) from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.get_course_path(uuid) from public, anon;
revoke execute on function public.can_access_lesson(uuid) from public, anon;
revoke execute on function public.get_leaderboard(text, integer, integer) from public, anon;
revoke execute on function public.get_my_leaderboard_rank(text) from public, anon;
revoke execute on function public.snapshot_leaderboard(text) from public, anon;
revoke execute on function public.review_writing_submission(uuid, jsonb, text) from public, anon;
revoke execute on function public.grade_manual_answer(uuid, numeric, text) from public, anon;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon;
grant execute on function public.public_platform_stats() to anon, authenticated;

grant execute on function public.get_course_path(uuid) to authenticated;
grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.get_leaderboard(text, integer, integer) to authenticated;
grant execute on function public.get_my_leaderboard_rank(text) to authenticated;
grant execute on function public.snapshot_leaderboard(text) to authenticated;
grant execute on function public.review_writing_submission(uuid, jsonb, text) to authenticated;
grant execute on function public.grade_manual_answer(uuid, numeric, text) to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;
-- =============================================================================
-- Linguora — Row Level Security, column privileges, publishing guard, storage
-- =============================================================================

-- Enable RLS on every table in public.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Publishing guard: only users with content.publish may publish content or
-- modify content that is already published.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_publish_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.has_permission('content.publish') then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.status = 'published' then
      raise exception 'Hanya reviewer/admin yang dapat menghapus konten yang sudah dipublikasikan.' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.status = 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    raise exception 'Hanya reviewer/admin yang dapat memublikasikan atau mengubah konten yang sudah dipublikasikan.' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'learning_tracks', 'courses', 'units', 'lessons', 'grammar_topics', 'reading_passages', 'listening_materials',
    'speaking_prompts', 'writing_prompts', 'vocabulary_entries', 'questions', 'quizzes', 'exams', 'blog_posts'
  ] loop
    execute format('create trigger %I before insert or update or delete on public.%I for each row execute function public.enforce_publish_permission()', t || '_publish_guard', t);
  end loop;
end $$;

-- Children of a lesson/question may be edited only if the parent is not published
-- or the caller can publish.
create or replace function public.can_edit_lesson_children(p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('content.write')
     and (public.has_permission('content.publish')
          or exists (select 1 from public.lessons where id = p_lesson and status <> 'published'));
$$;

create or replace function public.can_edit_question_children(p_question uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('content.write')
     and (public.has_permission('content.publish')
          or exists (select 1 from public.questions where id = p_question and status <> 'published'));
$$;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------
create policy "roles readable" on public.roles for select to authenticated using (true);
create policy "role permissions readable" on public.role_permissions for select to authenticated using (true);

create policy "levels public read" on public.levels for select to anon, authenticated using (true);
create policy "levels manage" on public.levels for update to authenticated using (public.has_permission('content.publish')) with check (public.has_permission('content.publish'));

create policy "tracks public read" on public.learning_tracks for select to anon, authenticated
  using (status = 'published' or public.has_permission('content.read'));
create policy "tracks insert" on public.learning_tracks for insert to authenticated with check (public.has_permission('content.write'));
create policy "tracks update" on public.learning_tracks for update to authenticated using (public.has_permission('content.write')) with check (public.has_permission('content.write'));
create policy "tracks delete" on public.learning_tracks for delete to authenticated using (public.has_permission('content.delete'));

-- Generic CMS policy set for content tables with a status column.
do $$
declare
  t text;
  readers text;
begin
  foreach t in array array['courses', 'units', 'lessons', 'blog_posts'] loop
    execute format($f$create policy "%1$s public read" on public.%1$I for select to anon, authenticated
      using (status = 'published' or public.has_permission('content.read'))$f$, t);
  end loop;
  foreach t in array array['grammar_topics', 'reading_passages', 'listening_materials', 'speaking_prompts',
                           'writing_prompts', 'vocabulary_entries', 'quizzes', 'exams'] loop
    execute format($f$create policy "%1$s member read" on public.%1$I for select to authenticated
      using (status = 'published' or public.has_permission('content.read'))$f$, t);
  end loop;
  foreach t in array array['courses', 'units', 'lessons', 'blog_posts', 'grammar_topics', 'reading_passages',
                           'listening_materials', 'speaking_prompts', 'writing_prompts', 'vocabulary_entries',
                           'quizzes', 'exams', 'questions'] loop
    execute format($f$create policy "%1$s insert" on public.%1$I for insert to authenticated
      with check (public.has_permission('content.write'))$f$, t);
    execute format($f$create policy "%1$s update" on public.%1$I for update to authenticated
      using (public.has_permission('content.write')) with check (public.has_permission('content.write'))$f$, t);
    execute format($f$create policy "%1$s delete" on public.%1$I for delete to authenticated
      using (public.has_permission('content.delete'))$f$, t);
  end loop;
end $$;

create policy "writing rubrics read" on public.writing_rubrics for select to authenticated using (true);
create policy "writing rubrics manage" on public.writing_rubrics for all to authenticated
  using (public.has_permission('content.publish')) with check (public.has_permission('content.publish'));

-- Lesson sections: only for unlocked lessons (or content staff).
create policy "lesson sections read" on public.lesson_sections for select to authenticated
  using (
    public.has_permission('content.read')
    or (exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published')
        and public.can_access_lesson(lesson_id))
  );
create policy "lesson sections write" on public.lesson_sections for all to authenticated
  using (public.can_edit_lesson_children(lesson_id)) with check (public.can_edit_lesson_children(lesson_id));

create policy "lesson prerequisites read" on public.lesson_prerequisites for select to anon, authenticated using (true);
create policy "lesson prerequisites write" on public.lesson_prerequisites for all to authenticated
  using (public.has_permission('content.write')) with check (public.has_permission('content.write'));

-- Question bank: staff only. Learners receive questions exclusively through the
-- server, which strips answer data and enforces access rules.
create policy "questions staff read" on public.questions for select to authenticated using (public.has_permission('content.read'));
create policy "question options staff read" on public.question_options for select to authenticated using (public.has_permission('content.read'));
create policy "question options write" on public.question_options for all to authenticated
  using (public.can_edit_question_children(question_id)) with check (public.can_edit_question_children(question_id));
create policy "answer keys staff read" on public.question_answer_keys for select to authenticated using (public.has_permission('content.read'));
create policy "answer keys write" on public.question_answer_keys for all to authenticated
  using (public.can_edit_question_children(question_id)) with check (public.can_edit_question_children(question_id));
create policy "question tags staff read" on public.question_tags for select to authenticated using (public.has_permission('content.read'));
create policy "question tags write" on public.question_tags for all to authenticated
  using (public.can_edit_question_children(question_id)) with check (public.can_edit_question_children(question_id));
create policy "quiz questions staff" on public.quiz_questions for all to authenticated
  using (public.has_permission('content.read')) with check (public.has_permission('content.write'));
create policy "exam questions staff" on public.exam_questions for all to authenticated
  using (public.has_permission('content.read')) with check (public.has_permission('content.write'));

create policy "content versions read" on public.content_versions for select to authenticated using (public.has_permission('content.read'));
create policy "content versions insert" on public.content_versions for insert to authenticated
  with check (public.has_permission('content.write') and created_by = auth.uid());

create policy "achievements read" on public.achievements for select to authenticated using (is_active or public.has_permission('content.read'));
create policy "achievements manage" on public.achievements for all to authenticated
  using (public.has_permission('content.publish')) with check (public.has_permission('content.publish'));
create policy "challenges read" on public.challenges for select to authenticated using (is_active or public.has_permission('content.read'));
create policy "challenges manage" on public.challenges for all to authenticated
  using (public.has_permission('content.publish')) with check (public.has_permission('content.publish'));

create policy "audit read" on public.audit_logs for select to authenticated using (public.has_permission('audit.view'));
create policy "settings read" on public.system_settings for select to authenticated using (public.is_staff());
create policy "settings update" on public.system_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
create policy "contact staff read" on public.contact_messages for select to authenticated using (public.has_permission('reports.view'));
create policy "contact staff update" on public.contact_messages for update to authenticated
  using (public.has_permission('reports.view')) with check (public.has_permission('reports.view'));

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission('users.read'));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Learners may only change their own preference columns.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, username, avatar_url, bio, timezone, learning_goal, active_track_id, daily_goal_xp,
              daily_goal_minutes, weekly_goal_minutes, leaderboard_opt_in, preferences)
  on public.profiles to authenticated;

create policy "user roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "user roles grant" on public.user_roles for insert to authenticated
  with check (
    user_id <> auth.uid()
    and (public.has_permission('roles.manage') or (public.has_permission('users.manage') and role <> 'super_admin'))
  );
create policy "user roles revoke" on public.user_roles for delete to authenticated
  using (
    user_id <> auth.uid()
    and (public.has_permission('roles.manage') or (public.has_permission('users.manage') and role <> 'super_admin'))
  );

-- ---------------------------------------------------------------------------
-- Learner data written only by the server (read own; staff read where useful)
-- ---------------------------------------------------------------------------
create policy "unlocks own read" on public.user_level_unlocks for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "progress own read" on public.learning_progress for select to authenticated
  using (user_id = auth.uid() or public.has_permission('reports.view'));
create policy "attempts own read" on public.assessment_attempts for select to authenticated
  using (user_id = auth.uid() or public.has_permission('grading.manage') or public.has_permission('reports.view'));
create policy "answers own read" on public.assessment_answers for select to authenticated
  using (user_id = auth.uid() or public.has_permission('grading.manage'));
create policy "question stats own read" on public.user_question_stats for select to authenticated using (user_id = auth.uid());
create policy "skill assessments own read" on public.skill_assessments for select to authenticated using (user_id = auth.uid());
create policy "certificates own read" on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "reviews own read" on public.review_schedules for select to authenticated using (user_id = auth.uid());
create policy "reading progress own read" on public.reading_progress for select to authenticated using (user_id = auth.uid());
create policy "listening progress own read" on public.listening_progress for select to authenticated using (user_id = auth.uid());
create policy "stats own read" on public.user_stats for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "daily activity own read" on public.daily_activity for select to authenticated using (user_id = auth.uid());
create policy "xp own read" on public.xp_transactions for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "user achievements own read" on public.user_achievements for select to authenticated using (user_id = auth.uid());
create policy "user achievements mark seen" on public.user_achievements for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.user_achievements from authenticated, anon;
grant update (seen_at) on public.user_achievements to authenticated;
create policy "leaderboard snapshots read" on public.leaderboard_snapshots for select to authenticated
  using (user_id = auth.uid() or public.has_permission('reports.view'));

-- ---------------------------------------------------------------------------
-- Learner-owned data (full CRUD on own rows)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['vocabulary_collections', 'user_vocabulary', 'notes', 'bookmarks', 'study_sessions',
                           'study_plans', 'planned_lessons', 'course_enrollments'] loop
    execute format($f$create policy "%1$s own all" on public.%1$I for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t);
  end loop;
end $$;

create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create policy "writing own read" on public.writing_submissions for select to authenticated
  using (user_id = auth.uid() or public.has_permission('grading.manage'));
create policy "writing own insert" on public.writing_submissions for insert to authenticated
  with check (user_id = auth.uid() and status in ('draft', 'submitted'));
create policy "writing own update draft" on public.writing_submissions for update to authenticated
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status in ('draft', 'submitted'));
create policy "writing own delete" on public.writing_submissions for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.writing_submissions from authenticated, anon;
grant insert (user_id, prompt_id, title, content, word_count, status, self_assessment, submitted_at)
  on public.writing_submissions to authenticated;
grant update (prompt_id, title, content, word_count, status, self_assessment, submitted_at)
  on public.writing_submissions to authenticated;

create policy "speaking own read" on public.speaking_sessions for select to authenticated using (user_id = auth.uid());
create policy "speaking own insert" on public.speaking_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "speaking own delete" on public.speaking_sessions for delete to authenticated using (user_id = auth.uid());

create policy "ai sessions own" on public.ai_tutor_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai messages own read" on public.ai_tutor_messages for select to authenticated using (user_id = auth.uid());

-- Tables with no policies (service role only): rate_limits.

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('recordings', 'recordings', false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

create policy "media staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.has_permission('content.write'));
create policy "media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.has_permission('content.write'));
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_permission('content.delete'));

create policy "avatars own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "recordings own read" on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
-- =============================================================================
-- Linguora — CMS RPCs (security invoker: RLS + publish guard still apply).
-- Each RPC runs in one transaction, snapshots the previous state into
-- content_versions, and can be rolled back with cms_restore_version.
-- =============================================================================

create or replace function public.lesson_snapshot(p_lesson uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'lesson', to_jsonb(l),
    'sections', coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order) from public.lesson_sections s where s.lesson_id = l.id), '[]'::jsonb),
    'prerequisites', coalesce((select jsonb_agg(p.prerequisite_lesson_id) from public.lesson_prerequisites p where p.lesson_id = l.id), '[]'::jsonb)
  )
  from public.lessons l where l.id = p_lesson;
$$;

create or replace function public.question_snapshot(p_question uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'question', to_jsonb(q),
    'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.question_options o where o.question_id = q.id), '[]'::jsonb),
    'answer_key', (select to_jsonb(k) from public.question_answer_keys k where k.question_id = q.id),
    'tags', coalesce((select jsonb_agg(t.tag) from public.question_tags t where t.question_id = q.id), '[]'::jsonb)
  )
  from public.questions q where q.id = p_question;
$$;

create or replace function public.snapshot_version(p_entity_type text, p_entity_id uuid, p_snapshot jsonb, p_note text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_version integer;
begin
  select coalesce(max(version), 0) + 1 into v_version
  from public.content_versions where entity_type = p_entity_type and entity_id = p_entity_id;
  insert into public.content_versions (entity_type, entity_id, version, snapshot, note, created_by)
  values (p_entity_type, p_entity_id, v_version, p_snapshot, p_note, auth.uid());
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Questions
-- p_question: columns of public.questions (id optional)
-- p_options:  [{id?, content}] in display order
-- p_answer:   answer key json, p_grading: grading options json
-- ---------------------------------------------------------------------------
create or replace function public.cms_save_question(
  p_question jsonb,
  p_options jsonb,
  p_answer jsonb,
  p_grading jsonb,
  p_tags text[],
  p_authored jsonb default '{}'::jsonb,
  p_note text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_question ->> 'id', '')::uuid;
  v_exists boolean;
  v_option jsonb;
  v_keep uuid[] := '{}';
  v_opt_id uuid;
  v_i integer := 0;
begin
  if not public.has_permission('content.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_exists := v_id is not null and exists (select 1 from public.questions where id = v_id);

  if v_exists then
    perform public.snapshot_version('question', v_id, public.question_snapshot(v_id), coalesce(p_note, 'edit'));
    update public.questions set
      type = (p_question ->> 'type')::public.question_type,
      category = (p_question ->> 'category')::public.skill_category,
      stage = (p_question ->> 'stage')::public.question_stage,
      prompt = p_question ->> 'prompt',
      instructions = nullif(p_question ->> 'instructions', ''),
      context_md = nullif(p_question ->> 'context_md', ''),
      data = coalesce(p_question -> 'data', '{}'::jsonb),
      level_id = (p_question ->> 'level_id')::uuid,
      topic = p_question ->> 'topic',
      difficulty = (p_question ->> 'difficulty')::smallint,
      points = (p_question ->> 'points')::numeric,
      explanation = coalesce(p_question ->> 'explanation', ''),
      misconception = nullif(p_question ->> 'misconception', ''),
      lesson_id = nullif(p_question ->> 'lesson_id', '')::uuid,
      unit_id = nullif(p_question ->> 'unit_id', '')::uuid,
      passage_id = nullif(p_question ->> 'passage_id', '')::uuid,
      listening_id = nullif(p_question ->> 'listening_id', '')::uuid,
      grammar_topic_id = nullif(p_question ->> 'grammar_topic_id', '')::uuid,
      practice_only = coalesce((p_question ->> 'practice_only')::boolean, false),
      auto_gradable = coalesce((p_question ->> 'auto_gradable')::boolean, true),
      content_hash = p_question ->> 'content_hash',
      status = coalesce((p_question ->> 'status')::public.content_status, status),
      version = version + 1,
      updated_by = auth.uid()
    where id = v_id;
  else
    insert into public.questions (
      id, type, category, stage, prompt, instructions, context_md, data, level_id, topic, difficulty, points,
      explanation, misconception, lesson_id, unit_id, passage_id, listening_id, grammar_topic_id, practice_only,
      auto_gradable, content_hash, status, created_by, updated_by
    ) values (
      coalesce(v_id, gen_random_uuid()),
      (p_question ->> 'type')::public.question_type,
      (p_question ->> 'category')::public.skill_category,
      coalesce((p_question ->> 'stage')::public.question_stage, 'quiz'),
      p_question ->> 'prompt',
      nullif(p_question ->> 'instructions', ''),
      nullif(p_question ->> 'context_md', ''),
      coalesce(p_question -> 'data', '{}'::jsonb),
      (p_question ->> 'level_id')::uuid,
      p_question ->> 'topic',
      coalesce((p_question ->> 'difficulty')::smallint, 2),
      coalesce((p_question ->> 'points')::numeric, 1),
      coalesce(p_question ->> 'explanation', ''),
      nullif(p_question ->> 'misconception', ''),
      nullif(p_question ->> 'lesson_id', '')::uuid,
      nullif(p_question ->> 'unit_id', '')::uuid,
      nullif(p_question ->> 'passage_id', '')::uuid,
      nullif(p_question ->> 'listening_id', '')::uuid,
      nullif(p_question ->> 'grammar_topic_id', '')::uuid,
      coalesce((p_question ->> 'practice_only')::boolean, false),
      coalesce((p_question ->> 'auto_gradable')::boolean, true),
      p_question ->> 'content_hash',
      coalesce((p_question ->> 'status')::public.content_status, 'draft'),
      auth.uid(),
      auth.uid()
    )
    returning id into v_id;
  end if;

  -- Options: keep ids stable for existing options so in-flight attempts stay valid.
  for v_option in select * from jsonb_array_elements(coalesce(p_options, '[]'::jsonb)) loop
    v_opt_id := nullif(v_option ->> 'id', '')::uuid;
    if v_opt_id is not null and exists (select 1 from public.question_options where id = v_opt_id and question_id = v_id) then
      update public.question_options set content = v_option ->> 'content', sort_order = -1 - v_i where id = v_opt_id;
    else
      insert into public.question_options (id, question_id, content, sort_order)
      values (coalesce(v_opt_id, gen_random_uuid()), v_id, v_option ->> 'content', -1 - v_i)
      returning id into v_opt_id;
    end if;
    v_keep := v_keep || v_opt_id;
    v_i := v_i + 1;
  end loop;
  delete from public.question_options where question_id = v_id and not (id = any (v_keep));
  update public.question_options set sort_order = -sort_order - 1 where question_id = v_id;

  insert into public.question_answer_keys (question_id, answer, grading, authored, updated_at)
  values (v_id, p_answer, coalesce(p_grading, '{}'::jsonb), coalesce(p_authored, '{}'::jsonb), now())
  on conflict (question_id) do update set
    answer = excluded.answer, grading = excluded.grading, authored = excluded.authored, updated_at = now();

  delete from public.question_tags where question_id = v_id;
  insert into public.question_tags (question_id, tag)
  select v_id, t from unnest(coalesce(p_tags, '{}')) t where length(trim(t)) > 0
  on conflict do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lessons
-- p_lesson: lesson columns (id optional); p_sections: [{kind,title,body_md,data}]
-- ---------------------------------------------------------------------------
create or replace function public.cms_save_lesson(p_lesson jsonb, p_sections jsonb, p_prerequisites uuid[], p_note text default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_lesson ->> 'id', '')::uuid;
  v_exists boolean;
  v_unit uuid := (p_lesson ->> 'unit_id')::uuid;
  v_sort integer;
begin
  if not public.has_permission('content.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_exists := v_id is not null and exists (select 1 from public.lessons where id = v_id);

  if v_exists then
    perform public.snapshot_version('lesson', v_id, public.lesson_snapshot(v_id), coalesce(p_note, 'edit'));
    update public.lessons set
      unit_id = v_unit,
      slug = p_lesson ->> 'slug',
      title = p_lesson ->> 'title',
      summary = coalesce(p_lesson ->> 'summary', ''),
      objectives = coalesce(array(select jsonb_array_elements_text(p_lesson -> 'objectives')), '{}'),
      completion_criteria = coalesce(p_lesson ->> 'completion_criteria', ''),
      estimated_minutes = coalesce((p_lesson ->> 'estimated_minutes')::integer, estimated_minutes),
      xp_reward = coalesce((p_lesson ->> 'xp_reward')::integer, xp_reward),
      status = coalesce((p_lesson ->> 'status')::public.content_status, status),
      publish_at = nullif(p_lesson ->> 'publish_at', '')::timestamptz,
      published_at = case when (p_lesson ->> 'status') = 'published' then coalesce(published_at, now()) else published_at end,
      version = version + 1,
      updated_by = auth.uid()
    where id = v_id;
  else
    select coalesce(max(sort_order), 0) + 1 into v_sort from public.lessons where unit_id = v_unit;
    insert into public.lessons (unit_id, slug, title, summary, objectives, completion_criteria, estimated_minutes, xp_reward,
                                sort_order, status, publish_at, created_by, updated_by)
    values (
      v_unit, p_lesson ->> 'slug', p_lesson ->> 'title', coalesce(p_lesson ->> 'summary', ''),
      coalesce(array(select jsonb_array_elements_text(p_lesson -> 'objectives')), '{}'),
      coalesce(p_lesson ->> 'completion_criteria', ''),
      coalesce((p_lesson ->> 'estimated_minutes')::integer, 15),
      coalesce((p_lesson ->> 'xp_reward')::integer, 20),
      coalesce((p_lesson ->> 'sort_order')::integer, v_sort),
      coalesce((p_lesson ->> 'status')::public.content_status, 'draft'),
      nullif(p_lesson ->> 'publish_at', '')::timestamptz,
      auth.uid(), auth.uid()
    )
    returning id into v_id;
  end if;

  if p_sections is not null then
    delete from public.lesson_sections where lesson_id = v_id;
    insert into public.lesson_sections (lesson_id, kind, title, body_md, data, sort_order)
    select v_id, (s ->> 'kind')::public.lesson_section_kind, s ->> 'title', coalesce(s ->> 'body_md', ''),
           coalesce(s -> 'data', '{}'::jsonb), ord::integer
    from jsonb_array_elements(p_sections) with ordinality as x(s, ord);
  end if;

  if p_prerequisites is not null then
    delete from public.lesson_prerequisites where lesson_id = v_id;
    insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
    select v_id, p from unnest(p_prerequisites) p where p <> v_id
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

create or replace function public.cms_duplicate_lesson(p_lesson uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_src public.lessons;
  v_new uuid;
begin
  if not public.has_permission('content.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_src from public.lessons where id = p_lesson;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  insert into public.lessons (unit_id, slug, title, summary, objectives, completion_criteria, estimated_minutes, xp_reward,
                              sort_order, status, created_by, updated_by)
  values (v_src.unit_id, v_src.slug || '-copy-' || substr(md5(random()::text), 1, 5), v_src.title || ' (salinan)',
          v_src.summary, v_src.objectives, v_src.completion_criteria, v_src.estimated_minutes, v_src.xp_reward,
          (select max(sort_order) + 1 from public.lessons where unit_id = v_src.unit_id), 'draft', auth.uid(), auth.uid())
  returning id into v_new;
  insert into public.lesson_sections (lesson_id, kind, title, body_md, data, sort_order)
  select v_new, kind, title, body_md, data, sort_order from public.lesson_sections where lesson_id = p_lesson;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
create or replace function public.cms_restore_version(p_version uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v public.content_versions;
  v_q jsonb;
  v_l jsonb;
begin
  if not public.has_permission('content.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v from public.content_versions where id = p_version;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;

  if v.entity_type = 'question' then
    v_q := v.snapshot -> 'question';
    perform public.cms_save_question(
      v_q || jsonb_build_object('id', v.entity_id),
      coalesce(v.snapshot -> 'options', '[]'::jsonb),
      coalesce(v.snapshot -> 'answer_key' -> 'answer', '{}'::jsonb),
      coalesce(v.snapshot -> 'answer_key' -> 'grading', '{}'::jsonb),
      array(select jsonb_array_elements_text(coalesce(v.snapshot -> 'tags', '[]'::jsonb))),
      coalesce(v.snapshot -> 'answer_key' -> 'authored', '{}'::jsonb),
      'rollback to v' || v.version
    );
  elsif v.entity_type = 'lesson' then
    v_l := v.snapshot -> 'lesson';
    perform public.cms_save_lesson(
      v_l || jsonb_build_object('id', v.entity_id),
      coalesce(v.snapshot -> 'sections', '[]'::jsonb),
      array(select (jsonb_array_elements_text(coalesce(v.snapshot -> 'prerequisites', '[]'::jsonb)))::uuid),
      'rollback to v' || v.version
    );
  else
    raise exception 'rollback not supported for %', v.entity_type;
  end if;
  perform public.log_audit('rollback', v.entity_type, v.entity_id::text, jsonb_build_object('version', v.version));
end;
$$;

revoke execute on function public.lesson_snapshot(uuid) from public, anon;
revoke execute on function public.question_snapshot(uuid) from public, anon;
revoke execute on function public.snapshot_version(text, uuid, jsonb, text) from public, anon;
revoke execute on function public.cms_save_question(jsonb, jsonb, jsonb, jsonb, text[], jsonb, text) from public, anon;
revoke execute on function public.cms_save_lesson(jsonb, jsonb, uuid[], text) from public, anon;
revoke execute on function public.cms_duplicate_lesson(uuid) from public, anon;
revoke execute on function public.cms_restore_version(uuid) from public, anon;
-- =============================================================================
-- Linguora — learner analytics (own data only, via auth.uid())
--
-- Metric definitions (also documented in docs/LEARNING_ENGINE.md):
--   answers          = graded answer submissions (every attempt counts)
--   unique_questions = distinct questions answered at least once
--   accuracy         = correct answers / graded answers
-- =============================================================================

create or replace function public.my_category_performance(p_days integer default null)
returns table (category public.skill_category, answers bigint, correct bigint, unique_questions bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select q.category,
         count(*) as answers,
         count(*) filter (where a.is_correct) as correct,
         count(distinct a.question_id) as unique_questions
  from public.assessment_answers a
  join public.questions q on q.id = a.question_id
  where a.user_id = auth.uid()
    and a.is_correct is not null
    and (p_days is null or a.answered_at >= now() - make_interval(days => p_days))
  group by q.category
  order by q.category;
$$;

create or replace function public.my_topic_performance(p_days integer default null, p_limit integer default 50)
returns table (topic text, category public.skill_category, answers bigint, correct bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select q.topic, min(q.category) as category, count(*) as answers, count(*) filter (where a.is_correct) as correct
  from public.assessment_answers a
  join public.questions q on q.id = a.question_id
  where a.user_id = auth.uid()
    and a.is_correct is not null
    and (p_days is null or a.answered_at >= now() - make_interval(days => p_days))
  group by q.topic
  order by count(*) desc
  limit least(greatest(p_limit, 1), 200);
$$;

create or replace function public.my_question_type_performance(p_days integer default null)
returns table (type public.question_type, answers bigint, correct bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select q.type, count(*), count(*) filter (where a.is_correct)
  from public.assessment_answers a
  join public.questions q on q.id = a.question_id
  where a.user_id = auth.uid()
    and a.is_correct is not null
    and (p_days is null or a.answered_at >= now() - make_interval(days => p_days))
  group by q.type
  order by count(*) desc;
$$;

create or replace function public.my_learning_summary(p_days integer default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'answers', (select count(*) from public.assessment_answers where user_id = auth.uid() and is_correct is not null
                and (p_days is null or answered_at >= now() - make_interval(days => p_days))),
    'correct', (select count(*) from public.assessment_answers where user_id = auth.uid() and is_correct
                and (p_days is null or answered_at >= now() - make_interval(days => p_days))),
    'unique_questions', (select count(distinct question_id) from public.assessment_answers where user_id = auth.uid() and is_correct is not null
                and (p_days is null or answered_at >= now() - make_interval(days => p_days))),
    'lessons_completed', (select count(*) from public.learning_progress where user_id = auth.uid() and status <> 'in_progress'
                and (p_days is null or completed_at >= now() - make_interval(days => p_days))),
    'lessons_mastered', (select count(*) from public.learning_progress where user_id = auth.uid() and status = 'mastered'
                and (p_days is null or mastered_at >= now() - make_interval(days => p_days))),
    'assessments_passed', (select count(*) from public.assessment_attempts where user_id = auth.uid() and passed
                and kind in ('lesson_quiz', 'unit_test', 'level_exam')
                and (p_days is null or submitted_at >= now() - make_interval(days => p_days))),
    'xp', (select coalesce(sum(amount), 0) from public.xp_transactions where user_id = auth.uid()
                and (p_days is null or created_at >= now() - make_interval(days => p_days))),
    'minutes', (select coalesce(sum(duration_seconds), 0) / 60 from public.study_sessions where user_id = auth.uid()
                and (p_days is null or started_at >= now() - make_interval(days => p_days)))
  );
$$;

-- Admin overview (requires reports.view)
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('reports.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles where deleted_at is null),
    'new_users_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'active_7d', (select count(distinct user_id) from public.daily_activity where activity_date >= current_date - 7),
    'active_today', (select count(distinct user_id) from public.daily_activity where activity_date >= current_date - 1),
    'answers_7d', (select count(*) from public.assessment_answers where answered_at >= now() - interval '7 days'),
    'accuracy_7d', (select round(100.0 * count(*) filter (where is_correct) / nullif(count(*) filter (where is_correct is not null), 0), 1)
                    from public.assessment_answers where answered_at >= now() - interval '7 days'),
    'attempts_7d', (select count(*) from public.assessment_attempts where created_at >= now() - interval '7 days' and kind in ('lesson_quiz', 'unit_test', 'level_exam', 'placement')),
    'lessons_completed_7d', (select count(*) from public.learning_progress where completed_at >= now() - interval '7 days'),
    'pending_writing', (select count(*) from public.writing_submissions where status = 'submitted'),
    'pending_manual', (select count(*) from public.assessment_answers where needs_manual_grading),
    'content', jsonb_build_object(
      'lessons_published', (select count(*) from public.lessons where status = 'published'),
      'lessons_draft', (select count(*) from public.lessons where status in ('draft', 'in_review')),
      'questions_published', (select count(*) from public.questions where status = 'published'),
      'questions_review', (select count(*) from public.questions where status = 'in_review'),
      'vocabulary', (select count(*) from public.vocabulary_entries where status = 'published')
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'active', active, 'answers', answers) order by d)
      from (
        select g.d::date as d,
               (select count(distinct user_id) from public.daily_activity da where da.activity_date = g.d::date) as active,
               (select count(*) from public.assessment_answers aa where aa.answered_at::date = g.d::date) as answers
        from generate_series(current_date - 13, current_date, interval '1 day') g(d)
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- Hardest questions (lowest accuracy, min 5 answers) for content quality review.
create or replace function public.admin_question_stats(p_limit integer default 50)
returns table (question_id uuid, prompt text, type public.question_type, level_code text, answers bigint, accuracy numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('reports.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select q.id, q.prompt, q.type, l.code, count(*), round(100.0 * count(*) filter (where a.is_correct) / count(*), 1)
  from public.assessment_answers a
  join public.questions q on q.id = a.question_id
  join public.levels l on l.id = q.level_id
  where a.is_correct is not null
  group by q.id, q.prompt, q.type, l.code
  having count(*) >= 5
  order by 6 asc, 5 desc
  limit least(greatest(p_limit, 1), 200);
end;
$$;

revoke execute on function public.my_category_performance(integer) from public, anon;
revoke execute on function public.my_topic_performance(integer, integer) from public, anon;
revoke execute on function public.my_question_type_performance(integer) from public, anon;
revoke execute on function public.my_learning_summary(integer) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_question_stats(integer) from public, anon;
grant execute on function public.my_category_performance(integer) to authenticated;
grant execute on function public.my_topic_performance(integer, integer) to authenticated;
grant execute on function public.my_question_type_performance(integer) to authenticated;
grant execute on function public.my_learning_summary(integer) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_question_stats(integer) to authenticated;
