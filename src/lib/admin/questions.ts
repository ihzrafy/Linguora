import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ActionError } from "@/lib/auth";
import { authoredQuestionSchema, QUESTION_TYPES, type AuthoredQuestion } from "@/lib/content/schema";
import { prepareQuestion } from "@/lib/questions/transform";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const questionMetaSchema = z.object({
  id: z.uuid().nullable(),
  levelId: z.uuid(),
  lessonId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  passageId: z.uuid().nullable(),
  listeningId: z.uuid().nullable(),
  grammarTopicId: z.uuid().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  note: z.string().max(200).optional(),
});
export type QuestionMeta = z.infer<typeof questionMetaSchema>;

export function parseAuthored(input: unknown): AuthoredQuestion {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  if (raw && typeof raw === "object" && !("id" in raw)) (raw as Record<string, unknown>).id = `cms-${randomUUID().slice(0, 8)}`;
  const parsed = authoredQuestionSchema.safeParse(raw);
  if (!parsed.success) throw new ActionError(parsed.error.issues.map((i) => `${i.path.join(".") || "soal"}: ${i.message}`).slice(0, 5).join(" · "));
  return parsed.data;
}

/** Validates, transforms and saves an authored question through the CMS RPC (RLS + versioning). */
export async function saveAuthoredQuestion(authored: AuthoredQuestion, meta: QuestionMeta): Promise<string> {
  const p = prepareQuestion(authored);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_save_question", {
    p_question: {
      id: meta.id,
      type: p.type,
      category: p.category,
      stage: p.stage,
      prompt: p.prompt,
      instructions: p.instructions,
      context_md: p.contextMd,
      data: p.data,
      level_id: meta.levelId,
      topic: p.topic,
      difficulty: p.difficulty,
      points: p.points,
      explanation: p.explanation,
      misconception: p.misconception,
      lesson_id: meta.lessonId,
      unit_id: meta.unitId,
      passage_id: meta.passageId,
      listening_id: meta.listeningId,
      grammar_topic_id: meta.grammarTopicId,
      practice_only: p.practiceOnly,
      auto_gradable: p.autoGradable,
      content_hash: p.contentHash,
      status: meta.status,
    } as unknown as Json,
    p_options: p.options as unknown as Json,
    p_answer: p.answerKey as unknown as Json,
    p_grading: p.grading as unknown as Json,
    p_tags: [...new Set([p.topic, ...p.tags])],
    p_authored: authored as unknown as Json,
    p_note: meta.note ?? (meta.id ? "edit" : "create"),
  });
  if (error) {
    if (error.code === "23505") throw new ActionError("Soal identik sudah ada di bank soal (duplikat).", "conflict");
    if (error.code === "42501") throw new ActionError(error.message.includes("reviewer") ? error.message : "Kamu tidak memiliki izin untuk perubahan ini.", "forbidden");
    throw new ActionError(error.message);
  }
  return data as string;
}

export const TEMPLATES: Record<string, Record<string, unknown>> = {
  single_choice: { options: ["option A", "option B", "option C"], answer: 0 },
  contextual_vocabulary: { context: "Short context sentence…", options: ["word A", "word B", "word C"], answer: 0 },
  reading_comprehension: { passageSlug: "", options: ["A", "B", "C", "D"], answer: 0 },
  listening_comprehension: { listeningSlug: "", options: ["A", "B", "C"], answer: 0 },
  dialogue_completion: { dialogue: [{ speaker: "A", text: "How are you?" }, { speaker: "B", text: null }], options: ["I'm fine, thanks.", "I'm a student."], answer: 0 },
  multiple_select: { options: ["A", "B", "C", "D"], answers: [0, 2] },
  fill_blank: { text: "She ___ a teacher.", answers: [["is", "'s"]] },
  dropdown: { text: "I ___ happy.", choices: [["is", "am", "are"]], answers: [1] },
  drag_drop: { text: "They ___ from Bali.", bank: ["are", "is", "am"], answers: ["are"] },
  word_order: { words: ["Where", "are", "you", "from", "?"] },
  sentence_reconstruction: { fragments: ["Last weekend,", "we visited", "our grandparents", "in Bandung."] },
  matching: { pairs: [{ left: "cat", right: "kucing" }, { left: "dog", right: "anjing" }, { left: "bird", right: "burung" }] },
  error_identification: { segments: ["She", "go", "to school", "every day."], errorIndex: 1, correction: "goes" },
  sentence_correction: { sentence: "He don't like coffee.", answers: ["He doesn't like coffee.", "He does not like coffee."] },
  sentence_transformation: { sentence: "Someone stole my bike.", cue: "Begin with: My bike…", answers: ["My bike was stolen."] },
  translation: { source: "Saya seorang guru.", direction: "id-en", answers: ["I am a teacher.", "I'm a teacher."] },
  short_answer: { answers: ["answer"] },
  essay: { minWords: 80, maxWords: 150, rubric: "general-writing" },
  dictation: { text: "The meeting starts at nine." },
  speaking_response: { targetPhrases: ["I'd like to", "Could you"], sampleAnswer: "…" },
};

export function questionTemplate(type: string) {
  if (!(QUESTION_TYPES as readonly string[]).includes(type)) type = "single_choice";
  return {
    id: `cms-${randomUUID().slice(0, 8)}`,
    type,
    category: "grammar",
    topic: "topic-name",
    difficulty: 2,
    stage: "quiz",
    prompt: "Write the question prompt here.",
    explanation: "Pembahasan jawaban.",
    ...TEMPLATES[type],
  };
}
