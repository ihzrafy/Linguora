import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnswerKey, ClientQuestion, GradingOptions, PublicData } from "@/lib/questions/types";
import type { GradableQuestion } from "@/lib/questions/grading";
import type { QuestionType, SkillCategory } from "@/lib/content/schema";

/**
 * Loads questions for the browser: public data only, options in the requested order.
 * Answer keys are never selected here.
 */
export async function loadClientQuestions(ids: string[], optionOrders: Record<string, string[]> = {}): Promise<ClientQuestion[]> {
  if (!ids.length) return [];
  const db = createAdminClient();
  const [{ data: questions, error }, { data: options }] = await Promise.all([
    db
      .from("questions")
      .select("id, type, category, topic, difficulty, points, prompt, instructions, context_md, data, passage_id, listening_id")
      .in("id", ids),
    db.from("question_options").select("id, question_id, content, sort_order").in("question_id", ids).order("sort_order"),
  ]);
  if (error) throw new Error(error.message);

  const passageIds = [...new Set((questions ?? []).map((q) => q.passage_id).filter((x): x is string => Boolean(x)))];
  const listeningIds = [...new Set((questions ?? []).map((q) => q.listening_id).filter((x): x is string => Boolean(x)))];
  const [{ data: passages }, { data: listening }] = await Promise.all([
    passageIds.length ? db.from("reading_passages").select("id, title, body_md").in("id", passageIds) : Promise.resolve({ data: [] }),
    listeningIds.length
      ? db.from("listening_materials").select("id, title, script, audio_url").in("id", listeningIds)
      : Promise.resolve({ data: [] }),
  ]);

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  return ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => {
      const own = (options ?? []).filter((o) => o.question_id === q.id);
      const order = optionOrders[q.id];
      const sorted = order ? order.map((oid) => own.find((o) => o.id === oid)).filter((o): o is (typeof own)[number] => Boolean(o)) : own;
      const passage = passages?.find((p) => p.id === q.passage_id);
      const audio = listening?.find((l) => l.id === q.listening_id);
      return {
        id: q.id,
        type: q.type as QuestionType,
        category: q.category as SkillCategory,
        topic: q.topic,
        difficulty: q.difficulty,
        points: Number(q.points),
        prompt: q.prompt,
        instructions: q.instructions,
        contextMd: q.context_md,
        data: q.data as unknown as PublicData,
        options: sorted.map((o) => ({ id: o.id, content: o.content })),
        passage: passage ? { title: passage.title, bodyMd: passage.body_md } : null,
        listening: audio
          ? { title: audio.title, script: audio.script as { speaker: string; text: string }[], audioUrl: audio.audio_url }
          : null,
      } satisfies ClientQuestion;
    });
}

export type ServerQuestion = GradableQuestion & {
  id: string;
  type: QuestionType;
  category: SkillCategory;
  topic: string;
  explanation: string;
  misconception: string | null;
  autoGradable: boolean;
};

/** Loads questions together with their private answer keys (server-side grading only). */
export async function loadGradableQuestions(ids: string[]): Promise<Map<string, ServerQuestion>> {
  const db = createAdminClient();
  const [{ data: questions, error }, { data: options }, { data: keys }] = await Promise.all([
    db.from("questions").select("id, type, category, topic, points, data, explanation, misconception, auto_gradable").in("id", ids),
    db.from("question_options").select("id, question_id, content, sort_order").in("question_id", ids).order("sort_order"),
    db.from("question_answer_keys").select("question_id, answer, grading").in("question_id", ids),
  ]);
  if (error) throw new Error(error.message);
  const map = new Map<string, ServerQuestion>();
  for (const q of questions ?? []) {
    const key = keys?.find((k) => k.question_id === q.id);
    if (!key) continue;
    map.set(q.id, {
      id: q.id,
      type: q.type as QuestionType,
      category: q.category as SkillCategory,
      topic: q.topic,
      points: Number(q.points),
      data: q.data as unknown as PublicData,
      options: (options ?? []).filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, content: o.content })),
      answerKey: key.answer as unknown as AnswerKey,
      grading: (key.grading ?? {}) as GradingOptions,
      explanation: q.explanation,
      misconception: q.misconception,
      autoGradable: q.auto_gradable,
    });
  }
  return map;
}
