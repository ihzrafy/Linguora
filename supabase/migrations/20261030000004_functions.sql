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
