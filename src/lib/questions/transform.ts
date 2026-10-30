/**
 * Converts an authored question (content JSON / CMS form) into database rows:
 * render-safe public data + options, and a private answer key.
 *
 * Everything is deterministic for a given question id, so re-seeding produces the
 * same option ids and shuffles (in-flight attempts stay valid).
 */
import { createHash } from "node:crypto";
import { BLANK_TOKEN, type AuthoredQuestion } from "@/lib/content/schema";
import type { AnswerKey, GradingOptions, PublicData, Token } from "./types";
import { isManualType } from "./types";

export type PreparedQuestion = {
  externalKey: string;
  type: AuthoredQuestion["type"];
  category: AuthoredQuestion["category"];
  stage: AuthoredQuestion["stage"];
  prompt: string;
  instructions: string | null;
  contextMd: string | null;
  topic: string;
  difficulty: number;
  points: number;
  explanation: string;
  misconception: string | null;
  objectives: string[];
  tags: string[];
  data: PublicData;
  options: { id: string; content: string }[];
  answerKey: AnswerKey;
  grading: GradingOptions;
  practiceOnly: boolean;
  autoGradable: boolean;
  contentHash: string;
};

const sha = (input: string) => createHash("sha256").update(input).digest("hex");

/** Deterministic UUID (v4 layout) derived from a seed string. */
export function deterministicUuid(seed: string): string {
  const h = sha(seed);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function shortId(seed: string, prefix: string): string {
  return `${prefix}${sha(seed).slice(0, 8)}`;
}

function seededRandom(seed: string) {
  let state = parseInt(sha(seed).slice(0, 8), 16) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle that is guaranteed to differ from the original order when possible. */
function shuffleDifferent<T>(items: readonly T[], seed: string, same: (a: T[], b: readonly T[]) => boolean): T[] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const s = seededShuffle(items, `${seed}:${attempt}`);
    if (!same(s, items)) return s;
  }
  return [...items].reverse();
}

const sameText = (a: Token[], b: readonly Token[]) => a.map((t) => t.text).join("\u0001") === b.map((t) => t.text).join("\u0001");

export function prepareQuestion(q: AuthoredQuestion): PreparedQuestion {
  const key = q.id;
  const grading: GradingOptions = {
    caseSensitive: q.caseSensitive ?? false,
    ignorePunctuation: q.ignorePunctuation ?? true,
  };
  let data: PublicData;
  let options: { id: string; content: string }[] = [];
  let answerKey: AnswerKey;

  const makeOptions = (list: string[]) => list.map((content, i) => ({ id: deterministicUuid(`${key}:opt:${i}`), content }));

  switch (q.type) {
    case "single_choice":
    case "contextual_vocabulary":
    case "reading_comprehension":
    case "listening_comprehension":
      options = makeOptions(q.options);
      data = { kind: "choice" };
      answerKey = { kind: "choice", correct: options[q.answer].id };
      break;
    case "dialogue_completion":
      options = makeOptions(q.options);
      data = { kind: "choice", dialogue: q.dialogue };
      answerKey = { kind: "choice", correct: options[q.answer].id };
      break;
    case "multiple_select":
      options = makeOptions(q.options);
      data = { kind: "multi" };
      answerKey = { kind: "multi", correct: q.answers.map((i) => options[i].id) };
      break;
    case "fill_blank":
      data = { kind: "gaps", template: q.text, blanks: q.answers.length };
      answerKey = { kind: "gaps", blanks: q.answers };
      break;
    case "dropdown":
      data = { kind: "dropdown", template: q.text, choices: q.choices };
      answerKey = { kind: "dropdown", blanks: q.answers };
      break;
    case "drag_drop":
      data = { kind: "bank", template: q.text, bank: seededShuffle(q.bank, `${key}:bank`) };
      answerKey = { kind: "bank", blanks: q.answers };
      break;
    case "word_order":
    case "sentence_reconstruction": {
      const parts = q.type === "word_order" ? q.words : q.fragments;
      const tokens: Token[] = parts.map((text, i) => ({ id: shortId(`${key}:tok:${i}`, "t"), text }));
      const correct = parts.join(" ");
      data = { kind: "order", tokens: shuffleDifferent(tokens, `${key}:order`, sameText), joiner: " " };
      answerKey = { kind: "order", answers: [correct, ...(q.acceptedAnswers ?? [])] };
      break;
    }
    case "matching": {
      const left: Token[] = q.pairs.map((p, i) => ({ id: shortId(`${key}:l:${i}`, "l"), text: p.left }));
      const right: Token[] = q.pairs.map((p, i) => ({ id: shortId(`${key}:r:${i}`, "r"), text: p.right }));
      data = { kind: "matching", left, right: shuffleDifferent(right, `${key}:right`, sameText) };
      answerKey = { kind: "matching", pairs: Object.fromEntries(left.map((l, i) => [l.id, right[i].id])) };
      break;
    }
    case "error_identification": {
      const segments: Token[] = q.segments.map((text, i) => ({ id: shortId(`${key}:s:${i}`, "s"), text }));
      data = { kind: "segments", segments };
      answerKey = { kind: "segments", segment: segments[q.errorIndex].id, correction: q.correction };
      break;
    }
    case "sentence_correction":
      data = { kind: "text", sentence: q.sentence };
      answerKey = { kind: "text", answers: q.answers };
      break;
    case "sentence_transformation":
      data = { kind: "text", sentence: q.sentence, cue: q.cue };
      answerKey = { kind: "text", answers: q.answers };
      break;
    case "translation":
      data = { kind: "text", source: q.source, direction: q.direction };
      answerKey = { kind: "text", answers: q.answers };
      break;
    case "short_answer":
      data = { kind: "text" };
      answerKey = { kind: "text", answers: q.answers };
      break;
    case "essay":
      data = { kind: "essay", minWords: q.minWords, maxWords: q.maxWords, rubric: q.rubric };
      answerKey = { kind: "essay", rubric: q.rubric };
      break;
    case "dictation":
      data = { kind: "dictation", text: q.text };
      answerKey = { kind: "text", answers: [q.text] };
      break;
    case "speaking_response":
      data = { kind: "speaking", targetPhrases: q.targetPhrases ?? [] };
      answerKey = { kind: "speaking", targetPhrases: q.targetPhrases ?? [], sampleAnswer: q.sampleAnswer };
      break;
  }

  const manual = isManualType(q.type);
  const contentHash = sha(
    JSON.stringify([q.type, q.prompt.trim().toLowerCase(), q.context ?? "", data, options.map((o) => o.content), answerKey]),
  );

  return {
    externalKey: key,
    type: q.type,
    category: q.category,
    stage: q.stage,
    prompt: q.prompt,
    instructions: q.instructions ?? null,
    contextMd: q.context ?? null,
    topic: q.topic,
    difficulty: q.difficulty,
    points: q.points ?? 1,
    explanation: q.explanation,
    misconception: q.misconception ?? null,
    objectives: q.objectives ?? [],
    tags: q.tags ?? [],
    data,
    options,
    answerKey,
    grading,
    // Dictation sends its text to the browser for speech synthesis, so it is never used in graded assessments.
    practiceOnly: q.type === "dictation" || manual,
    autoGradable: !manual,
    contentHash,
  };
}

export { BLANK_TOKEN };
