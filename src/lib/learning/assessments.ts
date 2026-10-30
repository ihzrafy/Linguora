import "server-only";
import { randomInt } from "node:crypto";
import { ActionError, type Viewer } from "@/lib/auth";
import { LEVEL_CODES, type LevelCode } from "@/lib/content/schema";
import { gradeResponse, summarizeScore } from "@/lib/questions/grading";
import type { ClientQuestion, GradeResult, QuestionResponse } from "@/lib/questions/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { estimatePlacement, type PlacementItem } from "./placement";
import { loadClientQuestions, loadGradableQuestions } from "./questions-server";
import { pickByBlueprint, pickStratified, sample, shuffle, type PoolItem } from "./selection";

type AttemptRow = Database["public"]["Tables"]["assessment_attempts"]["Row"];
type AttemptKind = Database["public"]["Enums"]["attempt_kind"];

const GRACE_SECONDS = 30;
const random = () => randomInt(0, 2 ** 31) / 2 ** 31;
const db = () => createAdminClient();

function fail(message: string, code: ConstructorParameters<typeof ActionError>[1] = "invalid"): never {
  throw new ActionError(message, code);
}

async function setting(key: string, fallback: number): Promise<number> {
  const { data } = await db().from("system_settings").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}

export function isExpired(attempt: Pick<AttemptRow, "expires_at">, now = Date.now()) {
  return attempt.expires_at ? now > new Date(attempt.expires_at).getTime() + GRACE_SECONDS * 1000 : false;
}

// ---------------------------------------------------------------------------
// Attempt creation
// ---------------------------------------------------------------------------
type NewAttempt = {
  kind: AttemptKind;
  quizId?: string | null;
  examId?: string | null;
  lessonId?: string | null;
  unitId?: string | null;
  levelId?: string | null;
  questionIds: string[];
  shuffleOptions: boolean;
  passThreshold: number | null;
  timeLimitSeconds: number | null;
  metadata?: Record<string, unknown>;
};

async function createAttempt(viewer: Viewer, a: NewAttempt): Promise<string> {
  if (!a.questionIds.length) fail("Belum ada soal yang tersedia untuk assessment ini.", "not_found");
  const optionOrders: Record<string, string[]> = {};
  if (a.shuffleOptions) {
    const { data: options } = await db().from("question_options").select("id, question_id").in("question_id", a.questionIds);
    for (const qid of a.questionIds) {
      const own = (options ?? []).filter((o) => o.question_id === qid).map((o) => o.id);
      if (own.length) optionOrders[qid] = shuffle(own, random);
    }
  }
  let attemptNumber = 1;
  if (a.quizId || a.examId) {
    const q = db().from("assessment_attempts").select("id", { count: "exact", head: true }).eq("user_id", viewer.id);
    const { count } = await (a.quizId ? q.eq("quiz_id", a.quizId) : q.eq("exam_id", a.examId!));
    attemptNumber = (count ?? 0) + 1;
  }
  const { data, error } = await db()
    .from("assessment_attempts")
    .insert({
      user_id: viewer.id,
      kind: a.kind,
      quiz_id: a.quizId ?? null,
      exam_id: a.examId ?? null,
      lesson_id: a.lessonId ?? null,
      unit_id: a.unitId ?? null,
      level_id: a.levelId ?? null,
      question_ids: a.questionIds,
      option_orders: optionOrders as NonNullable<Json>,
      attempt_number: attemptNumber,
      pass_threshold: a.passThreshold,
      expires_at: a.timeLimitSeconds ? new Date(Date.now() + a.timeLimitSeconds * 1000).toISOString() : null,
      metadata: (a.metadata ?? {}) as NonNullable<Json>,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") fail("Kamu masih memiliki attempt yang sedang berjalan.", "conflict");
    throw new Error(error.message);
  }
  return data.id;
}

/** Returns an open attempt for the quiz/exam (auto-submitting it if its time ran out). */
async function openAttempt(viewer: Viewer, filter: { quizId?: string; examId?: string }): Promise<string | null> {
  let q = db().from("assessment_attempts").select("*").eq("user_id", viewer.id).eq("status", "in_progress");
  q = filter.quizId ? q.eq("quiz_id", filter.quizId) : q.eq("exam_id", filter.examId!);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  if (isExpired(data)) {
    await submitAttempt(viewer, data.id);
    return null;
  }
  return data.id;
}

async function completedAttempts(viewer: Viewer, filter: { quizId?: string; examId?: string }) {
  let q = db()
    .from("assessment_attempts")
    .select("id, passed, submitted_at, status")
    .eq("user_id", viewer.id)
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false });
  q = filter.quizId ? q.eq("quiz_id", filter.quizId) : q.eq("exam_id", filter.examId!);
  return (await q).data ?? [];
}

/** Gradable, published questions linked to a quiz or exam (joined in the database, no huge id lists). */
async function eligiblePool(source: { quizId: string } | { examId: string }): Promise<PoolItem[]> {
  const base = "id, category, difficulty, stage, levels(code)";
  const query =
    "quizId" in source
      ? db().from("questions").select(`${base}, quiz_questions!inner(quiz_id, sort_order)`).eq("quiz_questions.quiz_id", source.quizId)
      : db().from("questions").select(`${base}, exam_questions!inner(exam_id)`).eq("exam_questions.exam_id", source.examId);
  const { data, error } = await query.eq("status", "published").eq("auto_gradable", true).eq("practice_only", false).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((q) => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    stage: q.stage,
    levelCode: (q.levels as { code: string } | null)?.code,
    sort: ((q as { quiz_questions?: { sort_order: number }[] }).quiz_questions?.[0]?.sort_order ?? 0) as number,
  }));
}

export async function startLessonQuiz(viewer: Viewer, lessonId: string): Promise<string> {
  const { data: quiz } = await db().from("quizzes").select("*").eq("lesson_id", lessonId).eq("kind", "lesson_quiz").eq("status", "published").maybeSingle();
  if (!quiz) fail("Mini quiz untuk lesson ini belum tersedia.", "not_found");
  const { data: accessible } = await db().rpc("lesson_accessible_for", { p_user: viewer.id, p_lesson: lessonId });
  if (!accessible) fail("Lesson ini masih terkunci.", "locked");
  const { data: progress } = await db().from("learning_progress").select("material_completed_at").eq("user_id", viewer.id).eq("lesson_id", lessonId).maybeSingle();
  if (!progress?.material_completed_at) fail("Selesaikan materi lesson terlebih dahulu sebelum mengikuti mini quiz.", "locked");

  const open = await openAttempt(viewer, { quizId: quiz.id });
  if (open) return open;
  if (quiz.max_attempts && (await completedAttempts(viewer, { quizId: quiz.id })).length >= quiz.max_attempts)
    fail("Batas percobaan untuk quiz ini sudah tercapai.", "locked");

  const pool = await eligiblePool({ quizId: quiz.id });
  const ordered = [...pool].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((p) => p.id);
  const ids = quiz.shuffle_questions ? sample(ordered, quiz.question_count, random) : ordered.slice(0, quiz.question_count ?? undefined);
  const { data: lesson } = await db().from("lessons").select("unit_id, units(courses(level_id))").eq("id", lessonId).single();
  return createAttempt(viewer, {
    kind: "lesson_quiz",
    quizId: quiz.id,
    lessonId,
    unitId: lesson?.unit_id,
    levelId: (lesson?.units as { courses: { level_id: string } | null } | null)?.courses?.level_id ?? null,
    questionIds: ids,
    shuffleOptions: quiz.shuffle_options,
    passThreshold: await setting("lesson_quiz_pass_threshold", quiz.pass_threshold),
    timeLimitSeconds: quiz.time_limit_seconds,
  });
}

export async function startUnitTest(viewer: Viewer, unitId: string): Promise<string> {
  const { data: quiz } = await db().from("quizzes").select("*").eq("unit_id", unitId).eq("kind", "unit_test").eq("status", "published").maybeSingle();
  if (!quiz) fail("Unit assessment belum tersedia.", "not_found");
  const { data: unit } = await db().from("units").select("id, course_id, courses(level_id)").eq("id", unitId).single();
  if (!unit) fail("Unit tidak ditemukan.", "not_found");
  const { data: path } = await db().rpc("course_path_for", { p_user: viewer.id, p_course: unit.course_id });
  const row = (path ?? []).find((r) => r.unit_id === unitId);
  if (!row?.unit_unlocked) fail("Unit ini masih terkunci.", "locked");
  if (!row.lessons_done) fail("Selesaikan semua lesson di unit ini sebelum mengikuti unit assessment.", "locked");

  const open = await openAttempt(viewer, { quizId: quiz.id });
  if (open) return open;
  if (quiz.max_attempts && (await completedAttempts(viewer, { quizId: quiz.id })).length >= quiz.max_attempts)
    fail("Batas percobaan untuk unit assessment ini sudah tercapai.", "locked");

  const pool = await eligiblePool({ quizId: quiz.id });
  const ids = pickByBlueprint(pool, quiz.question_count ?? 12, {}, random, (p) => p.stage === "unit_test").map((p) => p.id);
  return createAttempt(viewer, {
    kind: "unit_test",
    quizId: quiz.id,
    unitId,
    levelId: (unit.courses as { level_id: string } | null)?.level_id ?? null,
    questionIds: quiz.shuffle_questions ? shuffle(ids, random) : ids,
    shuffleOptions: quiz.shuffle_options,
    passThreshold: quiz.pass_threshold,
    timeLimitSeconds: quiz.time_limit_seconds,
  });
}

function cooldownMessage(until: Date) {
  return `Kamu bisa mencoba lagi setelah ${until.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB.`;
}

export async function startLevelExam(viewer: Viewer, levelId: string): Promise<string> {
  const { data: exam } = await db().from("exams").select("*").eq("level_id", levelId).eq("kind", "level_exam").eq("status", "published").maybeSingle();
  if (!exam) fail("Ujian level belum tersedia.", "not_found");
  const { data: unlocked } = await db().rpc("level_exam_unlocked_for", { p_user: viewer.id, p_level: levelId });
  if (!unlocked) fail("Selesaikan semua unit (termasuk unit assessment) di level ini untuk membuka ujian level.", "locked");

  const open = await openAttempt(viewer, { examId: exam.id });
  if (open) return open;
  const done = await completedAttempts(viewer, { examId: exam.id });
  if (exam.max_attempts && done.length >= exam.max_attempts) fail("Batas percobaan ujian ini sudah tercapai.", "locked");
  const last = done[0];
  if (last && !last.passed && last.submitted_at && exam.cooldown_hours > 0) {
    const until = new Date(new Date(last.submitted_at).getTime() + exam.cooldown_hours * 3_600_000);
    if (until.getTime() > Date.now()) fail(`Masa tunggu ujian ulang belum selesai. ${cooldownMessage(until)}`, "locked");
  }

  const pool = await eligiblePool({ examId: exam.id });
  const ids = pickByBlueprint(pool, exam.question_count, exam.blueprint as Record<string, number>, random, (p) => p.stage === "exam").map((p) => p.id);
  return createAttempt(viewer, {
    kind: "level_exam",
    examId: exam.id,
    levelId,
    questionIds: shuffle(ids, random),
    shuffleOptions: exam.shuffle_options,
    passThreshold: exam.pass_threshold,
    timeLimitSeconds: exam.time_limit_seconds,
  });
}

export async function startPlacement(viewer: Viewer, opts: { timed: boolean }): Promise<string> {
  const { data: exam } = await db().from("exams").select("*").eq("kind", "placement").eq("status", "published").maybeSingle();
  if (!exam) fail("Placement test belum tersedia.", "not_found");
  const open = await openAttempt(viewer, { examId: exam.id });
  if (open) return open;
  const last = (await completedAttempts(viewer, { examId: exam.id }))[0];
  if (last?.submitted_at && exam.cooldown_hours > 0) {
    const until = new Date(new Date(last.submitted_at).getTime() + exam.cooldown_hours * 3_600_000);
    if (until.getTime() > Date.now()) fail(`Placement test hanya dapat diulang setiap ${exam.cooldown_hours} jam. ${cooldownMessage(until)}`, "locked");
  }
  const pool = await eligiblePool({ examId: exam.id });
  const perLevel = Number((exam.blueprint as { perLevel?: number }).perLevel ?? 8);
  const ids = pickStratified(pool, perLevel, [...LEVEL_CODES], random).map((p) => p.id);
  return createAttempt(viewer, {
    kind: "placement",
    examId: exam.id,
    questionIds: ids,
    shuffleOptions: exam.shuffle_options,
    passThreshold: null,
    timeLimitSeconds: opts.timed ? exam.time_limit_seconds : null,
    metadata: { timed: opts.timed },
  });
}

// ---------------------------------------------------------------------------
// Taking an attempt
// ---------------------------------------------------------------------------
export type AttemptView = {
  attempt: Pick<AttemptRow, "id" | "kind" | "status" | "expires_at" | "started_at" | "pass_threshold" | "attempt_number" | "quiz_id" | "exam_id" | "lesson_id" | "unit_id" | "level_id">;
  title: string;
  questions: ClientQuestion[];
  saved: Record<string, QuestionResponse>;
};

export async function getOwnAttempt(viewer: Viewer, attemptId: string): Promise<AttemptRow> {
  const { data } = await db().from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!data || data.user_id !== viewer.id) fail("Attempt tidak ditemukan.", "not_found");
  return data;
}

export async function attemptTitle(a: Pick<AttemptRow, "kind" | "quiz_id" | "exam_id">): Promise<string> {
  if (a.quiz_id) return (await db().from("quizzes").select("title").eq("id", a.quiz_id).single()).data?.title ?? "Quiz";
  if (a.exam_id) return (await db().from("exams").select("title").eq("id", a.exam_id).single()).data?.title ?? "Ujian";
  return { practice: "Latihan Adaptif", review: "Sesi Review", daily_challenge: "Daily Challenge" }[a.kind as string] ?? "Latihan";
}

export async function loadAttemptView(viewer: Viewer, attemptId: string): Promise<AttemptView> {
  const attempt = await getOwnAttempt(viewer, attemptId);
  const [questions, { data: answers }, title] = await Promise.all([
    loadClientQuestions(attempt.question_ids, attempt.option_orders as Record<string, string[]>),
    db().from("assessment_answers").select("question_id, response").eq("attempt_id", attemptId),
    attemptTitle(attempt),
  ]);
  return {
    attempt,
    title,
    questions,
    saved: Object.fromEntries((answers ?? []).filter((a) => a.response !== null).map((a) => [a.question_id, a.response as QuestionResponse])),
  };
}

const MAX_RESPONSE_BYTES = 8_000;

function validResponse(response: unknown): response is QuestionResponse {
  return typeof response === "object" && response !== null && JSON.stringify(response).length <= MAX_RESPONSE_BYTES;
}

/** Autosave a single answer (used for resume after disconnects). Not graded yet. */
export async function saveResponse(viewer: Viewer, attemptId: string, questionId: string, response: unknown) {
  if (!validResponse(response)) fail("Jawaban tidak valid.");
  const attempt = await getOwnAttempt(viewer, attemptId);
  if (attempt.status !== "in_progress") fail("Attempt ini sudah dikumpulkan.", "conflict");
  if (isExpired(attempt)) fail("Waktu pengerjaan sudah habis.", "locked");
  if (!attempt.question_ids.includes(questionId)) fail("Soal tidak termasuk dalam attempt ini.");
  if (["practice", "review", "daily_challenge"].includes(attempt.kind)) fail("Gunakan pemeriksaan jawaban untuk latihan.");
  const { error } = await db()
    .from("assessment_answers")
    .upsert(
      { attempt_id: attemptId, user_id: viewer.id, question_id: questionId, response: response as NonNullable<Json>, answered_at: new Date().toISOString() },
      { onConflict: "attempt_id,question_id" },
    );
  if (error) throw new Error(error.message);
}

export type SubmitResult = {
  attemptId: string;
  alreadySubmitted: boolean;
  scorePercent: number;
  passed: boolean | null;
  xpAwarded: number;
  achievements: string[];
  unlockedLevel: string | null;
};

/** Grades on the server and finalises atomically. Safe to call repeatedly (idempotent). */
export async function submitAttempt(viewer: Viewer, attemptId: string, responses: Record<string, unknown> = {}): Promise<SubmitResult> {
  const attempt = await getOwnAttempt(viewer, attemptId);
  if (attempt.status !== "in_progress") {
    return {
      attemptId,
      alreadySubmitted: true,
      scorePercent: Number(attempt.score_percent ?? 0),
      passed: attempt.passed,
      xpAwarded: 0,
      achievements: [],
      unlockedLevel: null,
    };
  }
  if (["practice", "review", "daily_challenge"].includes(attempt.kind)) return finishPractice(viewer, attemptId);

  const { data: saved } = await db().from("assessment_answers").select("question_id, response").eq("attempt_id", attemptId);
  const merged = new Map<string, unknown>((saved ?? []).map((a) => [a.question_id, a.response]));
  if (!isExpired(attempt)) {
    for (const [qid, resp] of Object.entries(responses)) if (attempt.question_ids.includes(qid) && validResponse(resp)) merged.set(qid, resp);
  }

  const questions = await loadGradableQuestions(attempt.question_ids);
  const graded = attempt.question_ids
    .map((qid) => {
      const q = questions.get(qid);
      if (!q) return null;
      const response = (merged.get(qid) ?? null) as QuestionResponse | null;
      return { qid, q, response, result: gradeResponse(q, response) };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const summary = summarizeScore(graded.map((g) => g.result));
  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const g of graded) {
    const c = byCategory.get(g.q.category) ?? { correct: 0, total: 0 };
    c.total += 1;
    if (g.result.isCorrect) c.correct += 1;
    byCategory.set(g.q.category, c);
  }
  const categories = [...byCategory].map(([category, v]) => ({ category, correct: v.correct, total: v.total, percent: Math.round((v.correct / v.total) * 1000) / 10 }));

  const outcome: Record<string, unknown> = {
    score_points: summary.points,
    max_points: summary.max,
    score_percent: summary.percent,
    pending_manual: summary.pendingManual,
    passed: attempt.pass_threshold === null ? null : summary.percent >= attempt.pass_threshold,
    result: { categories, answered: graded.filter((g) => g.response !== null).length, total: graded.length },
  };

  if (attempt.kind === "placement") {
    const { data: levels } = await db().from("questions").select("id, levels(code)").in("id", attempt.question_ids);
    const levelOf = new Map((levels ?? []).map((l) => [l.id, (l.levels as { code: string } | null)?.code as LevelCode]));
    const items: PlacementItem[] = graded.map((g) => ({ level: levelOf.get(g.qid) ?? "A1", category: g.q.category, correct: g.result.isCorrect === true }));
    const placement = estimatePlacement(items);
    outcome.passed = true;
    outcome.placement_level = placement.recommendedLevel;
    outcome.category_scores = placement.perCategory.map((c) => ({ category: c.category, percent: c.percent, count: c.count, estimated_level: c.estimatedLevel }));
    outcome.result = { ...(outcome.result as object), placement };
  }

  const answers = graded.map((g) => ({
    question_id: g.qid,
    response: g.response,
    is_correct: g.result.isCorrect,
    points_awarded: g.result.pointsAwarded,
    max_points: g.result.maxPoints,
    needs_manual: g.result.needsManual,
  }));
  const { data, error } = await db().rpc("finalize_attempt", { p_attempt: attemptId, p_answers: answers as NonNullable<Json>, p_outcome: outcome as Json });
  if (error) throw new Error(error.message);
  const r = data as { already_finalized: boolean; score_percent: number; passed: boolean | null; xp_awarded?: number; achievements?: string[]; unlocked_level?: string | null };
  return {
    attemptId,
    alreadySubmitted: r.already_finalized,
    scorePercent: Number(r.score_percent ?? 0),
    passed: r.passed,
    xpAwarded: r.xp_awarded ?? 0,
    achievements: r.achievements ?? [],
    unlockedLevel: r.unlocked_level ?? null,
  };
}

// ---------------------------------------------------------------------------
// Practice (instant feedback)
// ---------------------------------------------------------------------------
export type PracticeFeedback = GradeResult & { explanation: string; misconception: string | null; xp: number; alreadyAnswered: boolean };

export async function answerPractice(viewer: Viewer, attemptId: string, questionId: string, response: unknown): Promise<PracticeFeedback> {
  if (!validResponse(response)) fail("Jawaban tidak valid.");
  const attempt = await getOwnAttempt(viewer, attemptId);
  if (!["practice", "review", "daily_challenge"].includes(attempt.kind)) fail("Pemeriksaan instan hanya untuk latihan.");
  if (attempt.status !== "in_progress") fail("Sesi latihan ini sudah selesai.", "conflict");
  if (!attempt.question_ids.includes(questionId)) fail("Soal tidak termasuk dalam sesi ini.");
  const q = (await loadGradableQuestions([questionId])).get(questionId);
  if (!q) fail("Soal tidak ditemukan.", "not_found");

  const { data: existing } = await db().from("assessment_answers").select("response").eq("attempt_id", attemptId).eq("question_id", questionId).maybeSingle();
  // The first answer counts; later checks of the same question only return feedback for that first answer.
  const effective = (existing?.response ?? response) as QuestionResponse;
  const result = gradeResponse(q, effective);
  let xp = 0;
  if (!existing) {
    const { data, error } = await db().rpc("record_practice_answer", {
      p_attempt: attemptId,
      p_question: questionId,
      p_response: effective as NonNullable<Json>,
      p_is_correct: result.needsManual ? (null as unknown as boolean) : (result.isCorrect ?? false),
      p_points: result.pointsAwarded,
      p_max_points: result.maxPoints,
      p_needs_manual: result.needsManual,
    });
    if (error) throw new Error(error.message);
    xp = (data as { xp?: number } | null)?.xp ?? 0;
  }
  return { ...result, explanation: q.explanation, misconception: q.misconception, xp, alreadyAnswered: Boolean(existing) };
}

export async function finishPractice(viewer: Viewer, attemptId: string): Promise<SubmitResult> {
  const attempt = await getOwnAttempt(viewer, attemptId);
  const { data: answers } = await db().from("assessment_answers").select("points_awarded, max_points, needs_manual_grading, is_correct").eq("attempt_id", attemptId);
  const summary = summarizeScore(
    (answers ?? []).map((a) => ({ pointsAwarded: Number(a.points_awarded ?? 0), maxPoints: Number(a.max_points ?? 0), needsManual: a.needs_manual_grading })),
  );
  if (attempt.kind === "daily_challenge" && (answers ?? []).length < attempt.question_ids.length)
    fail("Jawab semua soal daily challenge untuk menyelesaikannya.", "invalid");
  // Answers, stats and XP were already recorded per question; finalise with an empty answer list.
  const { data, error } = await db().rpc("finalize_attempt", {
    p_attempt: attemptId,
    p_answers: [] as NonNullable<Json>,
    p_outcome: {
      score_points: summary.points,
      max_points: summary.max,
      score_percent: summary.percent,
      pending_manual: false,
      passed: null,
      result: { answered: (answers ?? []).length, total: attempt.question_ids.length, correct: (answers ?? []).filter((a) => a.is_correct).length },
    } as NonNullable<Json>,
  });
  if (error) throw new Error(error.message);
  const r = data as { already_finalized: boolean; xp_awarded?: number; achievements?: string[] };
  const source = (attempt.metadata as { source?: { kind: string; id: string } }).source;
  if (source && !r.already_finalized) await recordSkillProgress(viewer.id, source, summary.percent);
  return { attemptId, alreadySubmitted: r.already_finalized, scorePercent: summary.percent, passed: null, xpAwarded: r.xp_awarded ?? 0, achievements: r.achievements ?? [], unlockedLevel: null };
}

/** Reading/listening history: best score per passage or listening material. */
async function recordSkillProgress(userId: string, source: { kind: string; id: string }, score: number) {
  const now = new Date().toISOString();
  if (source.kind === "reading") {
    const { data: prev } = await db().from("reading_progress").select("best_score").eq("user_id", userId).eq("passage_id", source.id).maybeSingle();
    await db()
      .from("reading_progress")
      .upsert(
        { user_id: userId, passage_id: source.id, best_score: Math.max(Number(prev?.best_score ?? 0), score), completed_at: now, last_read_at: now },
        { onConflict: "user_id,passage_id" },
      );
  } else if (source.kind === "listening") {
    const { data: prev } = await db().from("listening_progress").select("best_score").eq("user_id", userId).eq("material_id", source.id).maybeSingle();
    await db()
      .from("listening_progress")
      .upsert(
        { user_id: userId, material_id: source.id, best_score: Math.max(Number(prev?.best_score ?? 0), score), completed_at: now, last_played_at: now },
        { onConflict: "user_id,material_id" },
      );
  }
}
