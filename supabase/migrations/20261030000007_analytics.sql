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
