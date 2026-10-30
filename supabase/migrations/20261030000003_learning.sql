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
