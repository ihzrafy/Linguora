/**
 * Loads validated content from /content into the database (idempotent upserts).
 *
 *   npm run db:seed            # all levels
 *   npm run db:seed -- A1 B1   # selected levels only
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (service role).
 */
import type { AuthoredQuestion, AuthoredUnit, LevelCode } from "../src/lib/content/schema";
import { prepareQuestion, type PreparedQuestion } from "../src/lib/questions/transform";
import type { Database, Json } from "../src/lib/supabase/database.types";
import { collectQuestions, loadContent } from "./lib/content-loader";
import { adminClient, chunk, must } from "./lib/script-env";
import { ACHIEVEMENTS, BLOG_POSTS, CHALLENGES, WRITING_RUBRICS } from "./lib/static-seed";

type Tables = Database["public"]["Tables"];
const db = adminClient();
const now = new Date().toISOString();

async function upsert<T extends keyof Tables>(table: T, rows: Tables[T]["Insert"][], onConflict: string) {
  for (const part of chunk(rows, 400)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    must(await (db.from(table) as any).upsert(part, { onConflict }), `upsert ${String(table)}`);
  }
}

async function idMap(table: "levels" | "units" | "lessons" | "learning_tracks" | "courses" | "grammar_topics" | "reading_passages" | "listening_materials", column: "code" | "slug") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = must(await (db.from(table) as any).select(`id, ${column}`), `select ${table}`) as Record<string, string>[];
  return new Map(rows.map((r) => [r[column], r.id]));
}

function lessonSections(lesson: AuthoredUnit["lessons"][number], questionIds: Map<string, string>) {
  const ids = (stage: string) => lesson.questions.filter((q) => q.stage === stage).map((q) => questionIds.get(q.id)!);
  const s = lesson.sections;
  return [
    { kind: "objectives", title: "Tujuan Pembelajaran", body_md: "", data: { items: lesson.objectives } },
    { kind: "explanation", title: "Penjelasan Konsep", body_md: s.explanation, data: {} },
    { kind: "examples", title: "Contoh Penggunaan", body_md: "", data: { items: s.examples } },
    { kind: "vocabulary", title: "Kosakata", body_md: "", data: { items: s.vocabulary } },
    { kind: "grammar", title: "Pola Grammar", body_md: "", data: { items: s.grammar } },
    { kind: "mistakes", title: "Kesalahan Umum", body_md: "", data: { items: s.mistakes } },
    { kind: "guided_practice", title: "Latihan Terpandu", body_md: "", data: { questionIds: ids("guided") } },
    { kind: "independent_practice", title: "Latihan Mandiri", body_md: "", data: { questionIds: ids("independent") } },
    { kind: "mini_assessment", title: "Mini Assessment", body_md: "", data: {} },
    { kind: "summary", title: "Ringkasan", body_md: s.summary, data: {} },
    { kind: "review_cards", title: "Kartu Review", body_md: "", data: { items: s.reviewCards } },
    { kind: "completion", title: "Kriteria Penyelesaian", body_md: lesson.completionCriteria, data: {} },
  ];
}

async function main() {
  const only = process.argv.slice(2).map((a) => a.toUpperCase()).filter((a) => /^[ABC][12]$/.test(a)) as LevelCode[];
  const { syllabus, levels, issues } = loadContent(only.length ? only : undefined);
  if (issues.length) {
    console.error(`Content has ${issues.length} validation issue(s). Run: npx tsx scripts/validate-content.ts`);
    issues.slice(0, 20).forEach((i) => console.error(`  ${i.file}: ${i.message}`));
    process.exit(1);
  }

  // --- tracks & levels ------------------------------------------------------
  await upsert(
    "learning_tracks",
    syllabus.tracks.map((t, i) => ({ slug: t.slug, name: t.name, description: t.description, goals: t.goals, icon: t.icon, sort_order: i, status: "published" as const })),
    "slug",
  );
  await upsert(
    "levels",
    syllabus.levels.map((l, i) => ({
      code: l.code,
      slug: l.code.toLowerCase(),
      name: l.name,
      name_id: l.nameId,
      description: l.description,
      objectives: l.objectives,
      explanation_language: l.explanationLanguage,
      sort_order: i + 1,
    })),
    "code",
  );
  const levelIds = await idMap("levels", "code");
  const trackIds = await idMap("learning_tracks", "slug");
  const generalTrack = trackIds.get("general-english")!;

  console.log("✓ tracks and levels");

  // --- writing rubrics, achievements, challenges, blog ---------------------
  await upsert("writing_rubrics", WRITING_RUBRICS, "key");
  await upsert("achievements", ACHIEVEMENTS.map((a, i) => ({ ...a, sort_order: i })), "key");
  await upsert("challenges", CHALLENGES, "key");
  await upsert(
    "blog_posts",
    BLOG_POSTS.map((p) => ({ ...p, status: "published" as const, published_at: p.published_at ?? now })),
    "slug",
  );
  const rubricId = must(await db.from("writing_rubrics").select("id").eq("key", "general-writing").single(), "rubric").id;
  console.log("✓ rubrics, achievements, challenges, blog");

  let totalQuestions = 0;

  for (const level of levels) {
    const levelId = levelIds.get(level.level)!;
    const plan = syllabus.levels.find((l) => l.code === level.level)!;
    const code = level.level as LevelCode;

    // --- core course, units, lessons -----------------------------------------
    const courseSlug = `general-english-${code.toLowerCase()}`;
    await upsert(
      "courses",
      [{
        slug: courseSlug,
        level_id: levelId,
        track_id: generalTrack,
        title: `General English ${code} — ${plan.name}`,
        description: plan.description,
        is_core: true,
        sort_order: 0,
        status: "published",
        published_at: now,
      }],
      "slug",
    );
    const courseId = must(await db.from("courses").select("id").eq("slug", courseSlug).single(), "course").id;

    if (level.units.length) {
      await upsert(
        "units",
        level.units.map((u) => ({
          course_id: courseId,
          slug: u.slug,
          title: u.title,
          description: u.description,
          objectives: u.objectives,
          sort_order: u.number,
          status: "published" as const,
        })),
        "slug",
      );
    }
    const unitIds = await idMap("units", "slug");

    const lessonRows = level.units.flatMap((u) =>
      u.lessons.map((l, i) => ({
        unit_id: unitIds.get(u.slug)!,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        objectives: l.objectives,
        completion_criteria: l.completionCriteria,
        estimated_minutes: l.estimatedMinutes,
        xp_reward: 20,
        sort_order: i + 1,
        status: "published" as const,
        published_at: now,
      })),
    );
    if (lessonRows.length) await upsert("lessons", lessonRows, "slug");
    const lessonIds = await idMap("lessons", "slug");

    // --- skill content ---------------------------------------------------------
    const skills = level.skills;
    if (skills) {
      await upsert(
        "grammar_topics",
        skills.grammarTopics.map((t, i) => ({
          slug: t.slug,
          title: t.title,
          level_id: levelId,
          category: t.category,
          explanation_md: t.explanation,
          formulas: t.formulas as unknown as NonNullable<Json>,
          examples: t.examples as unknown as NonNullable<Json>,
          comparison_md: t.comparison ?? null,
          mistakes: t.mistakes as unknown as NonNullable<Json>,
          keywords: t.keywords,
          related_lesson_ids: t.relatedLessons.map((s) => lessonIds.get(s)).filter((x): x is string => Boolean(x)),
          status: "published" as const,
          sort_order: i,
        })),
        "slug",
      );
      await upsert(
        "reading_passages",
        skills.reading.map((r) => {
          const words = r.body.split(/\s+/).filter(Boolean).length;
          return {
            slug: r.slug,
            title: r.title,
            level_id: levelId,
            genre: r.genre,
            body_md: r.body,
            word_count: words,
            estimated_minutes: Math.max(2, Math.round(words / 150)),
            glossary: r.glossary as unknown as NonNullable<Json>,
            attribution: "Teks orisinal Linguora",
            status: "published" as const,
          };
        }),
        "slug",
      );
      await upsert(
        "listening_materials",
        skills.listening.map((m) => ({
          slug: m.slug,
          title: m.title,
          level_id: levelId,
          kind: m.kind,
          script: m.script as unknown as NonNullable<Json>,
          audio_source: "tts",
          status: "published" as const,
        })),
        "slug",
      );
      await upsert(
        "speaking_prompts",
        skills.speaking.map((s) => ({
          slug: s.slug,
          title: s.title,
          level_id: levelId,
          kind: s.kind,
          prompt_md: s.prompt,
          target_phrases: s.targetPhrases,
          sample_answer: s.sampleAnswer,
          tips: s.tips,
          status: "published" as const,
        })),
        "slug",
      );
      await upsert(
        "writing_prompts",
        skills.writing.map((w) => ({
          slug: w.slug,
          title: w.title,
          level_id: levelId,
          kind: w.kind,
          instructions_md: w.instructions,
          min_words: w.minWords,
          max_words: Math.max(w.maxWords, w.minWords + 1),
          model_answer: w.modelAnswer ?? null,
          rubric_id: rubricId,
          status: "published" as const,
        })),
        "slug",
      );
      // Vocabulary: one row per (word, part of speech).
      const seen = new Set<string>();
      const vocab = skills.vocabulary.filter((v) => {
        const k = `${v.word.toLowerCase()}|${v.pos.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      for (const part of chunk(vocab, 200)) {
        const existing = must(
          await db.from("vocabulary_entries").select("id, word, part_of_speech").in("word", part.map((v) => v.word)),
          "vocab lookup",
        );
        const rows = part.map((v) => {
          const match = existing.find((e) => e.word.toLowerCase() === v.word.toLowerCase() && e.part_of_speech.toLowerCase() === v.pos.toLowerCase());
          return {
            ...(match ? { id: match.id } : {}),
            word: v.word,
            part_of_speech: v.pos,
            ipa: v.ipa ?? null,
            definition: v.definition,
            meaning_id: v.meaning,
            examples: v.examples as unknown as NonNullable<Json>,
            synonyms: v.synonyms,
            antonyms: v.antonyms,
            collocations: v.collocations,
            phrases: v.phrases,
            related_words: v.related,
            level_id: levelId,
            topic: v.topic,
            status: "published" as const,
          };
        });
        const inserts = rows.filter((r) => !("id" in r));
        const updates = rows.filter((r) => "id" in r);
        if (inserts.length) must(await db.from("vocabulary_entries").insert(inserts), "vocab insert");
        if (updates.length) must(await db.from("vocabulary_entries").upsert(updates, { onConflict: "id" }), "vocab update");
      }
    }
    const grammarIds = await idMap("grammar_topics", "slug");
    const passageIds = await idMap("reading_passages", "slug");
    const listeningIds = await idMap("listening_materials", "slug");

    // --- questions ---------------------------------------------------------------
    const collected = collectQuestions(level);
    const prepared: { p: PreparedQuestion; authored: AuthoredQuestion; lessonId: string | null; unitId: string | null; grammarId: string | null }[] =
      collected.map(({ question, unit, lessonSlug, origin }) => ({
        p: prepareQuestion(question),
        authored: question,
        lessonId: lessonSlug ? lessonIds.get(lessonSlug) ?? null : null,
        unitId: unit ? unitIds.get(unit.slug) ?? null : null,
        grammarId: origin.startsWith("grammar:") ? grammarIds.get(origin.slice(8)) ?? null : null,
      }));

    await upsert(
      "questions",
      prepared.map(({ p, lessonId, unitId, grammarId, authored }) => ({
        external_key: p.externalKey,
        type: p.type,
        category: p.category,
        stage: p.stage,
        prompt: p.prompt,
        instructions: p.instructions,
        context_md: p.contextMd,
        data: p.data as unknown as NonNullable<Json>,
        level_id: levelId,
        topic: p.topic,
        difficulty: p.difficulty,
        points: p.points,
        explanation: p.explanation,
        misconception: p.misconception,
        objectives: p.objectives,
        lesson_id: lessonId,
        unit_id: unitId,
        passage_id: authored.passageSlug ? passageIds.get(authored.passageSlug) ?? null : null,
        listening_id: authored.listeningSlug ? listeningIds.get(authored.listeningSlug) ?? null : null,
        grammar_topic_id: grammarId,
        practice_only: p.practiceOnly,
        auto_gradable: p.autoGradable,
        content_hash: p.contentHash,
        status: "published" as const,
        reviewed_at: now,
        review_notes: "Seeded from validated content files",
      })),
      "external_key",
    );
    const qRows: { id: string; external_key: string | null }[] = [];
    for (const keys of chunk(prepared.map((x) => x.p.externalKey), 100)) {
      qRows.push(...must(await db.from("questions").select("id, external_key").in("external_key", keys), "question ids"));
    }
    const questionIds = new Map(qRows.map((r) => [r.external_key!, r.id]));

    const optionRows = prepared.flatMap(({ p }) =>
      p.options.map((o, i) => ({ id: o.id, question_id: questionIds.get(p.externalKey)!, content: o.content, sort_order: i })),
    );
    // Replace options for these questions (ids are deterministic, so this is stable).
    for (const ids of chunk([...questionIds.values()], 100)) {
      must(await db.from("question_options").delete().in("question_id", ids), "clear options");
      must(await db.from("question_tags").delete().in("question_id", ids), "clear tags");
    }
    if (optionRows.length) await upsert("question_options", optionRows, "id");
    await upsert(
      "question_answer_keys",
      prepared.map(({ p, authored }) => ({
        question_id: questionIds.get(p.externalKey)!,
        answer: p.answerKey as unknown as NonNullable<Json>,
        grading: p.grading as unknown as NonNullable<Json>,
        authored: authored as unknown as NonNullable<Json>,
        updated_at: now,
      })),
      "question_id",
    );
    const tagRows = prepared.flatMap(({ p }) =>
      [...new Set([p.topic, ...p.tags])].map((tag) => ({ question_id: questionIds.get(p.externalKey)!, tag })),
    );
    if (tagRows.length) await upsert("question_tags", tagRows, "question_id,tag");
    totalQuestions += prepared.length;

    // --- lesson sections & prerequisites -------------------------------------
    for (const unit of level.units) {
      const ids = unit.lessons.map((l) => lessonIds.get(l.slug)!);
      must(await db.from("lesson_sections").delete().in("lesson_id", ids), "clear sections");
      const sectionRows = unit.lessons.flatMap((l) =>
        lessonSections(l, questionIds).map((s, i) => ({
          lesson_id: lessonIds.get(l.slug)!,
          kind: s.kind as Tables["lesson_sections"]["Insert"]["kind"],
          title: s.title,
          body_md: s.body_md,
          data: s.data as unknown as NonNullable<Json>,
          sort_order: i + 1,
        })),
      );
      must(await db.from("lesson_sections").insert(sectionRows), "insert sections");
      must(await db.from("lesson_prerequisites").delete().in("lesson_id", ids), "clear prerequisites");
      const prereqs = ids.slice(1).map((id, i) => ({ lesson_id: id, prerequisite_lesson_id: ids[i] }));
      if (prereqs.length) must(await db.from("lesson_prerequisites").insert(prereqs), "insert prerequisites");
    }

    // --- quizzes ------------------------------------------------------------------
    const lessonQuizRows = level.units.flatMap((u) =>
      u.lessons.map((l) => ({
        kind: "lesson_quiz" as const,
        lesson_id: lessonIds.get(l.slug)!,
        title: `Mini Quiz: ${l.title}`,
        description: "Mini assessment untuk menguji pemahaman materi lesson ini.",
        pass_threshold: 70,
        shuffle_questions: true,
        shuffle_options: true,
        status: "published" as const,
      })),
    );
    for (const row of lessonQuizRows) {
      const existing = must(await db.from("quizzes").select("id").eq("kind", "lesson_quiz").eq("lesson_id", row.lesson_id).maybeSingle(), "quiz lookup");
      if (existing) must(await db.from("quizzes").update(row).eq("id", existing.id), "quiz update");
      else must(await db.from("quizzes").insert(row), "quiz insert");
    }
    const unitTestRows = level.units.map((u) => ({
      kind: "unit_test" as const,
      unit_id: unitIds.get(u.slug)!,
      title: `Unit Assessment: ${u.title}`,
      description: `Evaluasi seluruh materi unit ${u.number}. Lulus dengan skor minimal 70% untuk membuka unit berikutnya.`,
      pass_threshold: 70,
      time_limit_seconds: 20 * 60,
      question_count: 12,
      shuffle_questions: true,
      shuffle_options: true,
      status: "published" as const,
    }));
    for (const row of unitTestRows) {
      const existing = must(await db.from("quizzes").select("id").eq("kind", "unit_test").eq("unit_id", row.unit_id).maybeSingle(), "unit test lookup");
      if (existing) must(await db.from("quizzes").update(row).eq("id", existing.id), "unit test update");
      else must(await db.from("quizzes").insert(row), "unit test insert");
    }

    const quizzes = must(
      await db.from("quizzes").select("id, kind, lesson_id, unit_id").in("lesson_id", lessonRows.length ? level.units.flatMap((u) => u.lessons.map((l) => lessonIds.get(l.slug)!)) : []),
      "quizzes",
    );
    const unitQuizzes = must(
      await db.from("quizzes").select("id, unit_id").eq("kind", "unit_test").in("unit_id", level.units.map((u) => unitIds.get(u.slug)!)),
      "unit quizzes",
    );
    const quizQuestionRows: Tables["quiz_questions"]["Insert"][] = [];
    for (const unit of level.units) {
      const unitQuiz = unitQuizzes.find((q) => q.unit_id === unitIds.get(unit.slug));
      for (const lesson of unit.lessons) {
        const quiz = quizzes.find((q) => q.kind === "lesson_quiz" && q.lesson_id === lessonIds.get(lesson.slug));
        lesson.questions
          .filter((q) => q.stage === "quiz")
          .forEach((q, i) => quizQuestionRows.push({ quiz_id: quiz!.id, question_id: questionIds.get(q.id)!, sort_order: i }));
        if (unitQuiz)
          lesson.questions
            .filter((q) => q.stage === "quiz" && !["essay", "speaking_response", "dictation"].includes(q.type))
            .forEach((q) => quizQuestionRows.push({ quiz_id: unitQuiz.id, question_id: questionIds.get(q.id)!, sort_order: 100 }));
      }
      if (unitQuiz)
        unit.unitTestQuestions
          .filter((q) => !["essay", "speaking_response", "dictation"].includes(q.type))
          .forEach((q, i) => quizQuestionRows.push({ quiz_id: unitQuiz.id, question_id: questionIds.get(q.id)!, sort_order: i }));
    }
    const allQuizIds = [...quizzes.map((q) => q.id), ...unitQuizzes.map((q) => q.id)];
    for (const ids of chunk(allQuizIds, 100)) must(await db.from("quiz_questions").delete().in("quiz_id", ids), "clear quiz questions");
    if (quizQuestionRows.length) await upsert("quiz_questions", quizQuestionRows, "quiz_id,question_id");

    // --- level exam -----------------------------------------------------------------
    const examSlug = `level-exam-${code.toLowerCase()}`;
    await upsert(
      "exams",
      [{
        kind: "level_exam",
        level_id: levelId,
        slug: examSlug,
        title: `Ujian Level ${code} — ${plan.name}`,
        description: `Ujian akhir level ${code}. Lulus (≥70%) untuk membuka level berikutnya dan mendapatkan sertifikat internal Linguora.`,
        pass_threshold: 70,
        time_limit_seconds: 45 * 60,
        cooldown_hours: 12,
        question_count: 30,
        blueprint: { grammar: 12, vocabulary: 8, reading: 4, listening: 2, conversation: 2, mixed: 2 },
        status: "published",
      }],
      "slug",
    );
    const examId = must(await db.from("exams").select("id").eq("slug", examSlug).single(), "exam").id;
    const examPool = collected
      .filter(({ question }) => ["exam", "unit_test", "quiz"].includes(question.stage) && !["essay", "speaking_response", "dictation"].includes(question.type))
      .map(({ question }, i) => ({ exam_id: examId, question_id: questionIds.get(question.id)!, sort_order: question.stage === "exam" ? 0 : i + 1 }));
    must(await db.from("exam_questions").delete().eq("exam_id", examId), "clear exam questions");
    if (examPool.length) await upsert("exam_questions", examPool, "exam_id,question_id");

    console.log(`✓ ${code}: ${level.units.length} units, ${lessonRows.length} lessons, ${prepared.length} questions`);
  }

  // --- placement test (all levels) ---------------------------------------------------
  await upsert(
    "exams",
    [{
      kind: "placement",
      level_id: null,
      slug: "placement-test",
      title: "Placement Test Linguora",
      description: "Tes penempatan bertingkat (A1–C2) untuk mengestimasi level awal kamu. Hasilnya adalah estimasi, bukan sertifikasi resmi.",
      pass_threshold: 1,
      time_limit_seconds: 40 * 60,
      cooldown_hours: 24,
      question_count: 48,
      blueprint: { perLevel: 8 },
      status: "published",
    }],
    "slug",
  );
  const placementId = must(await db.from("exams").select("id").eq("slug", "placement-test").single(), "placement").id;
  const placementQs = must(await db.from("questions").select("id").eq("stage", "placement").eq("status", "published"), "placement questions");
  must(await db.from("exam_questions").delete().eq("exam_id", placementId), "clear placement questions");
  if (placementQs.length)
    await upsert("exam_questions", placementQs.map((q, i) => ({ exam_id: placementId, question_id: q.id, sort_order: i })), "exam_id,question_id");

  // Every learner can access A1.
  const a1 = levelIds.get("A1");
  if (a1) {
    const users = must(await db.from("profiles").select("id"), "profiles");
    if (users.length)
      must(
        await db.from("user_level_unlocks").upsert(users.map((u) => ({ user_id: u.id, level_id: a1, source: "default" })), { onConflict: "user_id,level_id", ignoreDuplicates: true }),
        "unlock A1",
      );
  }

  console.log(`\n✓ Seed complete — ${totalQuestions} questions, placement pool ${placementQs.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
