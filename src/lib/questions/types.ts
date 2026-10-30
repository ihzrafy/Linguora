/**
 * Shared question-engine types.
 *
 * - `PublicData` is stored in `questions.data` and sent to the browser. It must never
 *   contain information that reveals the correct answer.
 * - `AnswerKey` is stored in `question_answer_keys.answer` and only read on the server.
 * - `QuestionResponse` is what the learner submits.
 */
import type { QuestionType, SkillCategory } from "@/lib/content/schema";

export type { QuestionType, SkillCategory };

export const CHOICE_TYPES = [
  "single_choice",
  "contextual_vocabulary",
  "reading_comprehension",
  "listening_comprehension",
  "dialogue_completion",
] as const satisfies readonly QuestionType[];

export const TEXT_TYPES = [
  "sentence_correction",
  "sentence_transformation",
  "translation",
  "short_answer",
  "dictation",
] as const satisfies readonly QuestionType[];

/** Types that cannot be scored automatically. */
export const MANUAL_TYPES = ["essay", "speaking_response"] as const satisfies readonly QuestionType[];

export const isChoiceType = (t: QuestionType): t is (typeof CHOICE_TYPES)[number] =>
  (CHOICE_TYPES as readonly string[]).includes(t);
export const isTextType = (t: QuestionType): t is (typeof TEXT_TYPES)[number] =>
  (TEXT_TYPES as readonly string[]).includes(t);
export const isManualType = (t: QuestionType) => (MANUAL_TYPES as readonly string[]).includes(t);

export type DialogueLine = { speaker: string; text: string | null };
export type Token = { id: string; text: string };

export type PublicData =
  | { kind: "choice"; dialogue?: DialogueLine[] }
  | { kind: "multi" }
  | { kind: "gaps"; template: string; blanks: number }
  | { kind: "dropdown"; template: string; choices: string[][] }
  | { kind: "bank"; template: string; bank: string[] }
  | { kind: "order"; tokens: Token[]; joiner: " " }
  | { kind: "matching"; left: Token[]; right: Token[] }
  | { kind: "segments"; segments: Token[] }
  | { kind: "text"; sentence?: string; cue?: string; source?: string; direction?: "id-en" | "en-id" }
  | { kind: "essay"; minWords: number; maxWords: number; rubric: string }
  | { kind: "dictation"; text: string }
  | { kind: "speaking"; targetPhrases: string[] };

export type AnswerKey =
  | { kind: "choice"; correct: string }
  | { kind: "multi"; correct: string[] }
  | { kind: "gaps"; blanks: string[][] }
  | { kind: "dropdown"; blanks: number[] }
  | { kind: "bank"; blanks: string[] }
  | { kind: "order"; answers: string[] }
  | { kind: "matching"; pairs: Record<string, string> }
  | { kind: "segments"; segment: string; correction: string }
  | { kind: "text"; answers: string[] }
  | { kind: "essay"; rubric: string }
  | { kind: "speaking"; targetPhrases: string[]; sampleAnswer?: string };

export type GradingOptions = {
  caseSensitive?: boolean;
  ignorePunctuation?: boolean;
  /** When false (default), unambiguous contractions are expanded before comparing. */
  strictContractions?: boolean;
};

export type QuestionResponse =
  | { optionId: string }
  | { optionIds: string[] }
  | { blanks: string[] }
  | { choices: number[] }
  | { order: string[] }
  | { pairs: Record<string, string> }
  | { segmentId: string }
  | { text: string }
  | { transcript?: string; completed: boolean };

export type GradeResult = {
  isCorrect: boolean | null;
  /** 0..1 fraction of the question's points. */
  score: number;
  pointsAwarded: number;
  maxPoints: number;
  needsManual: boolean;
  /** Per-part correctness for gap/matching types. */
  parts?: boolean[];
  /** Human-readable correct answer(s), safe to show after answering. */
  correctAnswer: string[];
  /** Structured reveal data for the renderer (e.g. correct option ids). */
  reveal: Record<string, unknown>;
};

/** Question as delivered to the browser during an attempt (no answers). */
export type ClientQuestion = {
  id: string;
  type: QuestionType;
  category: SkillCategory;
  topic: string;
  difficulty: number;
  points: number;
  prompt: string;
  instructions: string | null;
  contextMd: string | null;
  data: PublicData;
  options: { id: string; content: string }[];
  passage: { title: string; bodyMd: string } | null;
  listening: { title: string; script: { speaker: string; text: string }[]; audioUrl: string | null } | null;
};
