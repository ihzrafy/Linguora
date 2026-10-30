import "server-only";
import { createHash, randomInt } from "node:crypto";
import { ActionError, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { selectAdaptive, type Candidate, type Performance, type QuestionHistory } from "./adaptive";
import { shuffle } from "./selection";
import { localDate } from "./streak";

const db = () => createAdminClient();
const PRACTICE_STAGES = ["guided", "independent", "quiz"] as const;

export type PracticeMode = "adaptive" | "topic" | "review" | "daily" | "lesson" | "source";

async function unlockedLevelIds(viewer: Viewer): Promise<string[]> {
  const { data } = await db().from("user_level_unlocks").select("level_id").eq("user_id", viewer.id);
  return (data ?? []).map((r) => r.level_id);
}

/**
 * Questions a learner may practise: questions of lessons they have started
 * (never content from locked lessons) plus skill-lab questions (grammar, reading,
 * listening) of unlocked levels. Exam and placement questions are never used.
 */
async function practicePool(viewer: Viewer, filter: { category?: string; topic?: string; levelId?: string } = {}) {
  const levels = await unlockedLevelIds(viewer);
  if (!levels.length) return [];
  const { data: started } = await db().from("learning_progress").select("lesson_id").eq("user_id", viewer.id);
  const lessonIds = (started ?? []).map((s) => s.lesson_id);

  let q = db()
    .from("questions")
    .select("id, topic, type, category, difficulty, lesson_id, level_id")
    .eq("status", "published")
    .eq("auto_gradable", true)
    .in("stage", [...PRACTICE_STAGES])
    .in("level_id", filter.levelId ? [filter.levelId] : levels)
    .limit(2000);
  if (filter.category) q = q.eq("category", filter.category as never);
  if (filter.topic) q = q.eq("topic", filter.topic);
  const { data } = await q;
  return (data ?? []).filter((x) => !x.lesson_id || lessonIds.includes(x.lesson_id));
}

async function learnerSignals(viewer: Viewer) {
  const { data: stats } = await db()
    .from("user_question_stats")
    .select("question_id, times_seen, times_correct, last_correct, last_seen_at, questions(topic, type)")
    .eq("user_id", viewer.id)
    .order("last_seen_at", { ascending: false })
    .limit(1000);
  const history = new Map<string, QuestionHistory>();
  const topicPerformance = new Map<string, Performance>();
  const typePerformance = new Map<string, Performance>();
  let recentCorrect = 0;
  let recentTotal = 0;
  (stats ?? []).forEach((s, i) => {
    history.set(s.question_id, { timesSeen: s.times_seen, timesCorrect: s.times_correct, lastCorrect: s.last_correct, lastSeenAt: s.last_seen_at });
    const meta = s.questions as { topic: string; type: string } | null;
    if (meta) {
      for (const [map, k] of [[topicPerformance, meta.topic], [typePerformance, meta.type]] as const) {
        const p = map.get(k) ?? { correct: 0, total: 0 };
        p.total += s.times_seen;
        p.correct += s.times_correct;
        map.set(k, p);
      }
    }
    if (i < 30) {
      recentTotal += 1;
      if (s.last_correct) recentCorrect += 1;
    }
  });
  return { history, topicPerformance, typePerformance, recentAccuracy: recentTotal >= 5 ? recentCorrect / recentTotal : null };
}

async function dueQuestionIds(viewer: Viewer, limit: number): Promise<string[]> {
  const { data } = await db()
    .from("review_schedules")
    .select("item_id")
    .eq("user_id", viewer.id)
    .eq("item_type", "question")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);
  return (data ?? []).map((r) => r.item_id);
}

async function insertPractice(viewer: Viewer, kind: "practice" | "review" | "daily_challenge", questionIds: string[], metadata: Record<string, unknown>, extra: { lessonId?: string; levelId?: string } = {}) {
  if (!questionIds.length) throw new ActionError("Belum ada soal yang cocok. Selesaikan beberapa lesson terlebih dahulu.", "not_found");
  const { data: options } = await db().from("question_options").select("id, question_id").in("question_id", questionIds);
  const orders: Record<string, string[]> = {};
  for (const id of questionIds) {
    const own = (options ?? []).filter((o) => o.question_id === id).map((o) => o.id);
    if (own.length) orders[id] = shuffle(own);
  }
  const { data, error } = await db()
    .from("assessment_attempts")
    .insert({
      user_id: viewer.id,
      kind,
      question_ids: questionIds,
      option_orders: orders as NonNullable<Json>,
      metadata: metadata as NonNullable<Json>,
      lesson_id: extra.lessonId ?? null,
      level_id: extra.levelId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function startPractice(
  viewer: Viewer,
  opts: {
    mode: PracticeMode;
    count?: number;
    category?: string;
    topic?: string;
    levelId?: string;
    lessonId?: string;
    source?: { kind: "grammar" | "reading" | "listening"; id: string };
  },
): Promise<string> {
  const count = Math.min(Math.max(opts.count ?? 10, 5), 30);

  if (opts.mode === "source" && opts.source) {
    // Exercises of a grammar topic / reading passage / listening material in an unlocked level.
    const column = { grammar: "grammar_topic_id", reading: "passage_id", listening: "listening_id" }[opts.source.kind] as "grammar_topic_id" | "passage_id" | "listening_id";
    const { data: qs } = await db()
      .from("questions")
      .select("id, level_id")
      .eq(column, opts.source.id)
      .eq("status", "published")
      .neq("stage", "exam")
      .neq("stage", "placement")
      .order("external_key");
    const levels = await unlockedLevelIds(viewer);
    if (qs?.length && !levels.includes(qs[0].level_id)) throw new ActionError("Materi ini berada di level yang belum terbuka.", "locked");
    const { data: existing } = await db()
      .from("assessment_attempts")
      .select("id, metadata")
      .eq("user_id", viewer.id)
      .eq("kind", "practice")
      .eq("status", "in_progress")
      .contains("metadata", { source: opts.source })
      .maybeSingle();
    if (existing) return existing.id;
    return insertPractice(viewer, "practice", (qs ?? []).map((q) => q.id), { mode: "source", source: opts.source });
  }

  if (opts.mode === "lesson") {
    const lessonId = opts.lessonId!;
    const { data: ok } = await db().rpc("lesson_accessible_for", { p_user: viewer.id, p_lesson: lessonId });
    if (!ok) throw new ActionError("Lesson ini masih terkunci.", "locked");
    const { data: existing } = await db()
      .from("assessment_attempts")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("kind", "practice")
      .eq("lesson_id", lessonId)
      .eq("status", "in_progress")
      .maybeSingle();
    if (existing) return existing.id;
    const { data: qs } = await db()
      .from("questions")
      .select("id, stage")
      .eq("lesson_id", lessonId)
      .eq("status", "published")
      .in("stage", ["guided", "independent"]);
    const ordered = [...(qs ?? []).filter((q) => q.stage === "guided"), ...(qs ?? []).filter((q) => q.stage === "independent")].map((q) => q.id);
    return insertPractice(viewer, "practice", ordered, { mode: "lesson" }, { lessonId });
  }

  if (opts.mode === "review") {
    const ids = await dueQuestionIds(viewer, count);
    if (!ids.length) throw new ActionError("Tidak ada soal yang perlu direview saat ini. 🎉", "not_found");
    return insertPractice(viewer, "review", ids, { mode: "review" });
  }

  if (opts.mode === "daily") {
    const today = localDate(viewer.profile.timezone);
    const { data: existing } = await db()
      .from("assessment_attempts")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("kind", "daily_challenge")
      .contains("metadata", { date: today })
      .maybeSingle();
    if (existing) return existing.id;
    const levelId = viewer.profile.current_level_id ?? undefined;
    const pool = await practicePool(viewer, { levelId });
    const fallback = pool.length >= 10 ? pool : await practicePool(viewer);
    // Deterministic per learner and day.
    const seed = (id: string) => createHash("sha256").update(`${viewer.id}:${today}:${id}`).digest("hex");
    const ids = [...fallback].sort((a, b) => seed(a.id).localeCompare(seed(b.id))).slice(0, 10).map((q) => q.id);
    return insertPractice(viewer, "daily_challenge", ids, { mode: "daily", date: today }, { levelId });
  }

  const pool = await practicePool(viewer, { category: opts.category, topic: opts.topic, levelId: opts.levelId });
  const signals = await learnerSignals(viewer);
  const due = opts.mode === "adaptive" ? await dueQuestionIds(viewer, 50) : [];
  const candidates: Candidate[] = pool.map((q) => ({ id: q.id, topic: q.topic, type: q.type, difficulty: q.difficulty }));
  const { data: level } = viewer.profile.current_level_id
    ? await db().from("levels").select("sort_order").eq("id", viewer.profile.current_level_id).single()
    : { data: null };
  const picks = selectAdaptive({
    candidates,
    history: signals.history,
    topicPerformance: signals.topicPerformance,
    typePerformance: signals.typePerformance,
    recentAccuracy: signals.recentAccuracy,
    baseDifficulty: 2,
    dueReviewIds: due.filter((id) => candidates.some((c) => c.id === id)),
    count,
    seed: randomInt(0, 2 ** 31),
  });
  return insertPractice(viewer, "practice", picks.map((p) => p.id), {
    mode: opts.mode,
    category: opts.category ?? null,
    topic: opts.topic ?? null,
    reasons: Object.fromEntries(picks.map((p) => [p.id, p.reason])),
    levelOrder: level?.sort_order ?? null,
  });
}

/** Topics where the learner is weakest (≥ 3 answers), for recommendations. */
export async function weakTopics(viewer: Viewer, limit = 5) {
  const signals = await learnerSignals(viewer);
  return [...signals.topicPerformance]
    .filter(([, p]) => p.total >= 3)
    .map(([topic, p]) => ({ topic, accuracy: p.correct / p.total, answered: p.total }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}
