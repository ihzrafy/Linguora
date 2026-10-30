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
