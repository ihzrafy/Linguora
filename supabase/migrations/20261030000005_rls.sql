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
