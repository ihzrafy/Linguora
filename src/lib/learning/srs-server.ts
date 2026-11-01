import "server-only";
import { ActionError, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "./streak";
import { scheduleReview, type ReviewGrade } from "./srs";

const db = () => createAdminClient();

export type ReviewCard = {
  scheduleId: string;
  kind: "word" | "lesson";
  front: string;
  back: string;
  detail?: string;
  ipa?: string | null;
  cards?: { front: string; back: string }[];
  href?: string;
  mastery: string;
};

/** Adds an item to the learner's spaced-repetition schedule (idempotent). */
export async function scheduleItem(userId: string, itemType: "user_vocabulary" | "lesson" | "question", itemId: string) {
  await db()
    .from("review_schedules")
    .upsert({ user_id: userId, item_type: itemType, item_id: itemId, due_at: new Date().toISOString(), mastery: "new" }, { onConflict: "user_id,item_type,item_id,item_ref", ignoreDuplicates: true });
}

/**
 * A due "question" review item was answered (review session or a due question mixed into practice):
 * advance it with SM-2 when correct, or bring it back tomorrow when wrong.
 */
export async function advanceQuestionReview(userId: string, questionId: string, correct: boolean) {
  const now = new Date();
  const { data: item } = await db()
    .from("review_schedules")
    .select("id, ease_factor, interval_days, repetitions, lapses")
    .eq("user_id", userId)
    .eq("item_type", "question")
    .eq("item_id", questionId)
    .lte("due_at", now.toISOString())
    .limit(1)
    .maybeSingle();
  if (!item) return;
  const next = scheduleReview(
    { easeFactor: Number(item.ease_factor), intervalDays: item.interval_days, repetitions: item.repetitions, lapses: item.lapses },
    correct ? "good" : "again",
    now,
  );
  const dueAt = correct ? next.dueAt : new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await db()
    .from("review_schedules")
    .update({
      ease_factor: next.state.easeFactor,
      interval_days: next.state.intervalDays,
      repetitions: next.state.repetitions,
      lapses: next.state.lapses,
      due_at: dueAt.toISOString(),
      last_reviewed_at: now.toISOString(),
      last_grade: correct ? 4 : 1,
      mastery: next.mastery,
    })
    .eq("id", item.id);
}

export async function dueCounts(viewer: Viewer) {
  const now = new Date().toISOString();
  const { data } = await db().from("review_schedules").select("item_type").eq("user_id", viewer.id).lte("due_at", now);
  const counts = { question: 0, user_vocabulary: 0, lesson: 0 } as Record<string, number>;
  (data ?? []).forEach((r) => (counts[r.item_type] = (counts[r.item_type] ?? 0) + 1));
  return counts;
}

/** Due flashcard-style items (words and lesson review cards). Questions are reviewed via practice sessions. */
export async function dueCards(viewer: Viewer, limit = 20): Promise<ReviewCard[]> {
  const { data: due } = await db()
    .from("review_schedules")
    .select("id, item_type, item_id, mastery")
    .eq("user_id", viewer.id)
    .in("item_type", ["user_vocabulary", "lesson"])
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);
  const items = due ?? [];
  const wordIds = items.filter((i) => i.item_type === "user_vocabulary").map((i) => i.item_id);
  const lessonIds = items.filter((i) => i.item_type === "lesson").map((i) => i.item_id);
  const [{ data: words }, { data: lessons }, { data: cards }] = await Promise.all([
    wordIds.length
      ? db().from("user_vocabulary").select("id, custom_word, custom_meaning, custom_example, vocabulary_entries(word, meaning_id, ipa, examples, definition)").in("id", wordIds)
      : Promise.resolve({ data: [] }),
    lessonIds.length ? db().from("lessons").select("id, slug, title").in("id", lessonIds) : Promise.resolve({ data: [] }),
    lessonIds.length ? db().from("lesson_sections").select("lesson_id, data").eq("kind", "review_cards").in("lesson_id", lessonIds) : Promise.resolve({ data: [] }),
  ]);

  return items
    .map((i): ReviewCard | null => {
      if (i.item_type === "user_vocabulary") {
        const w = words?.find((x) => x.id === i.item_id);
        if (!w) return null;
        const e = w.vocabulary_entries as { word: string; meaning_id: string; ipa: string | null; examples: { en: string }[]; definition: string } | null;
        return {
          scheduleId: i.id,
          kind: "word",
          front: e?.word ?? w.custom_word ?? "",
          back: e?.meaning_id ?? w.custom_meaning ?? "",
          detail: e?.examples?.[0]?.en ?? w.custom_example ?? e?.definition,
          ipa: e?.ipa ?? null,
          mastery: i.mastery,
        };
      }
      const l = lessons?.find((x) => x.id === i.item_id);
      if (!l) return null;
      const lessonCards = ((cards?.find((c) => c.lesson_id === l.id)?.data as { items?: { front: string; back: string }[] })?.items ?? []).slice(0, 8);
      return { scheduleId: i.id, kind: "lesson", front: l.title, back: "Review lesson", cards: lessonCards, href: `/app/lesson/${l.slug}`, mastery: i.mastery };
    })
    .filter((c): c is ReviewCard => Boolean(c));
}

/** Applies an SM-2 grade to one of the learner's schedule items. */
export async function gradeReview(viewer: Viewer, scheduleId: string, grade: ReviewGrade) {
  const { data: item } = await db().from("review_schedules").select("*").eq("id", scheduleId).maybeSingle();
  if (!item || item.user_id !== viewer.id) throw new ActionError("Item review tidak ditemukan.", "not_found");
  const next = scheduleReview(
    { easeFactor: Number(item.ease_factor), intervalDays: item.interval_days, repetitions: item.repetitions, lapses: item.lapses },
    grade,
  );
  const { error } = await db()
    .from("review_schedules")
    .update({
      ease_factor: next.state.easeFactor,
      interval_days: next.state.intervalDays,
      repetitions: next.state.repetitions,
      lapses: next.state.lapses,
      due_at: next.dueAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
      last_grade: { again: 1, hard: 3, good: 4, easy: 5 }[grade],
      mastery: next.mastery,
    })
    .eq("id", scheduleId);
  if (error) throw new Error(error.message);
  const today = localDate(viewer.profile.timezone);
  await db().rpc("record_activity", { p_user: viewer.id, p_reviews: 1 });
  await db().rpc("award_xp", { p_user: viewer.id, p_amount: 1, p_source: "review", p_source_id: scheduleId, p_key: `review:${scheduleId}:${today}` });
  await db().rpc("evaluate_achievements", { p_user: viewer.id });
  return { dueAt: next.dueAt.toISOString(), mastery: next.mastery, intervalDays: next.state.intervalDays };
}
