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
