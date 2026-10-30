/**
 * Authoring schema for Linguora curriculum content (files under /content).
 *
 * Content is written as JSON, validated with these schemas, and then split by the
 * seed script into public render data (`questions.data`, `question_options`) and
 * private answer keys (`question_answer_keys`). Answer keys never reach the client.
 */
import { z } from "zod";

export const LEVEL_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const levelCodeSchema = z.enum(LEVEL_CODES);
export type LevelCode = z.infer<typeof levelCodeSchema>;

export const QUESTION_TYPES = [
  "single_choice",
  "multiple_select",
  "fill_blank",
  "dropdown",
  "drag_drop",
  "word_order",
  "sentence_reconstruction",
  "matching",
  "error_identification",
  "sentence_correction",
  "sentence_transformation",
  "translation",
  "reading_comprehension",
  "listening_comprehension",
  "dialogue_completion",
  "contextual_vocabulary",
  "short_answer",
  "essay",
  "dictation",
  "speaking_response",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const SKILL_CATEGORIES = [
  "grammar",
  "vocabulary",
  "reading",
  "listening",
  "speaking",
  "writing",
  "pronunciation",
  "conversation",
  "academic",
  "business",
  "mixed",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Where a question is used inside a lesson / unit / level. */
export const QUESTION_STAGES = [
  "guided", // shown inline in the lesson with instant feedback
  "independent", // independent practice inside the lesson
  "quiz", // lesson mini assessment (lesson quiz)
  "unit_test", // unit assessment only
  "exam", // level examination only
  "placement", // placement test only
] as const;
export type QuestionStage = (typeof QUESTION_STAGES)[number];

const nonEmpty = z.string().trim().min(1);
const BLANK = "___";
const countBlanks = (text: string) => text.split(BLANK).length - 1;

const questionBase = z.object({
  /** Stable, globally unique key, e.g. "a1-u01-l1-q1". Lowercase, digits, dashes. */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  category: z.enum(SKILL_CATEGORIES),
  topic: nonEmpty,
  difficulty: z.number().int().min(1).max(5),
  points: z.number().positive().max(20).default(1),
  stage: z.enum(QUESTION_STAGES),
  prompt: nonEmpty,
  instructions: z.string().optional(),
  /** Optional short passage / dialogue / context shown above the prompt (markdown). */
  context: z.string().optional(),
  /** Slug of a reading passage or listening material from the skills file. */
  passageSlug: z.string().optional(),
  listeningSlug: z.string().optional(),
  explanation: nonEmpty,
  misconception: z.string().optional(),
  objectives: z.array(nonEmpty).optional(),
  tags: z.array(nonEmpty).optional(),
  /** Text answers: compare case-insensitively unless true. */
  caseSensitive: z.boolean().optional(),
  /** Text answers: ignore punctuation differences (default true). */
  ignorePunctuation: z.boolean().optional(),
});

const choiceFields = {
  options: z.array(nonEmpty).min(2).max(6),
  /** Index of the correct option (0-based). */
  answer: z.number().int().min(0),
};

const singleChoiceLike = <T extends QuestionType>(type: T) =>
  questionBase.extend({ type: z.literal(type), ...choiceFields });

export const authoredQuestionSchema = z
  .discriminatedUnion("type", [
    singleChoiceLike("single_choice"),
    singleChoiceLike("contextual_vocabulary"),
    singleChoiceLike("reading_comprehension"),
    singleChoiceLike("listening_comprehension"),
    questionBase.extend({
      type: z.literal("dialogue_completion"),
      /** Dialogue lines; exactly one line has `text: null` (the gap). */
      dialogue: z.array(z.object({ speaker: nonEmpty, text: z.string().nullable() })).min(2),
      ...choiceFields,
    }),
    questionBase.extend({
      type: z.literal("multiple_select"),
      options: z.array(nonEmpty).min(3).max(7),
      answers: z.array(z.number().int().min(0)).min(1),
    }),
    questionBase.extend({
      type: z.literal("fill_blank"),
      /** Sentence with one or more "___" gaps. */
      text: nonEmpty,
      /** Accepted variants per gap, in order. */
      answers: z.array(z.array(nonEmpty).min(1)).min(1),
    }),
    questionBase.extend({
      type: z.literal("dropdown"),
      text: nonEmpty,
      /** Choices per gap. */
      choices: z.array(z.array(nonEmpty).min(2)).min(1),
      /** Correct choice index per gap. */
      answers: z.array(z.number().int().min(0)).min(1),
    }),
    questionBase.extend({
      type: z.literal("drag_drop"),
      text: nonEmpty,
      /** Word bank (correct words plus distractors). */
      bank: z.array(nonEmpty).min(2),
      /** Correct word per gap (must exist in bank). */
      answers: z.array(nonEmpty).min(1),
    }),
    questionBase.extend({
      type: z.literal("word_order"),
      /** Words in the CORRECT order. The seed shuffles them. */
      words: z.array(nonEmpty).min(3),
      /** Other fully correct sentences, if any. */
      acceptedAnswers: z.array(nonEmpty).optional(),
    }),
    questionBase.extend({
      type: z.literal("sentence_reconstruction"),
      /** Fragments in the CORRECT order. The seed shuffles them. */
      fragments: z.array(nonEmpty).min(3),
      acceptedAnswers: z.array(nonEmpty).optional(),
    }),
    questionBase.extend({
      type: z.literal("matching"),
      pairs: z.array(z.object({ left: nonEmpty, right: nonEmpty })).min(3).max(6),
    }),
    questionBase.extend({
      type: z.literal("error_identification"),
      /** The sentence split into clickable segments. */
      segments: z.array(nonEmpty).min(3),
      errorIndex: z.number().int().min(0),
      correction: nonEmpty,
    }),
    questionBase.extend({
      type: z.literal("sentence_correction"),
      sentence: nonEmpty,
      answers: z.array(nonEmpty).min(1),
    }),
    questionBase.extend({
      type: z.literal("sentence_transformation"),
      sentence: nonEmpty,
      /** Transformation cue, e.g. "Begin with: The letter ..." */
      cue: nonEmpty,
      answers: z.array(nonEmpty).min(1),
    }),
    questionBase.extend({
      type: z.literal("translation"),
      source: nonEmpty,
      direction: z.enum(["id-en", "en-id"]),
      answers: z.array(nonEmpty).min(1),
    }),
    questionBase.extend({
      type: z.literal("short_answer"),
      answers: z.array(nonEmpty).min(1),
    }),
    questionBase.extend({
      type: z.literal("essay"),
      minWords: z.number().int().min(10),
      maxWords: z.number().int().min(20),
      rubric: z.string().default("general-writing"),
    }),
    questionBase.extend({
      type: z.literal("dictation"),
      /** Text that is read aloud (browser text-to-speech). Practice only. */
      text: nonEmpty,
    }),
    questionBase.extend({
      type: z.literal("speaking_response"),
      targetPhrases: z.array(nonEmpty).optional(),
      sampleAnswer: z.string().optional(),
    }),
  ])
  .superRefine((q, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message: `${q.id}: ${message}` });
    switch (q.type) {
      case "single_choice":
      case "contextual_vocabulary":
      case "reading_comprehension":
      case "listening_comprehension":
      case "dialogue_completion": {
        if (q.answer >= q.options.length) issue("answer index out of range");
        if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) issue("duplicate options");
        if (q.type === "dialogue_completion" && q.dialogue.filter((l) => l.text === null).length !== 1)
          issue("dialogue must contain exactly one gap (text: null)");
        break;
      }
      case "multiple_select": {
        if (q.answers.some((a) => a >= q.options.length)) issue("answer index out of range");
        if (new Set(q.answers).size !== q.answers.length) issue("duplicate answer indexes");
        if (q.answers.length === q.options.length) issue("not every option may be correct");
        break;
      }
      case "fill_blank":
        if (countBlanks(q.text) !== q.answers.length) issue(`"${BLANK}" count must equal answers length`);
        break;
      case "dropdown":
        if (countBlanks(q.text) !== q.choices.length || q.choices.length !== q.answers.length)
          issue("gap count, choices and answers must have the same length");
        q.answers.forEach((a, i) => {
          if (a >= (q.choices[i]?.length ?? 0)) issue(`dropdown answer ${i} out of range`);
        });
        break;
      case "drag_drop":
        if (countBlanks(q.text) !== q.answers.length) issue(`"${BLANK}" count must equal answers length`);
        q.answers.forEach((a) => {
          if (!q.bank.includes(a)) issue(`answer "${a}" missing from bank`);
        });
        if (q.bank.length <= q.answers.length) issue("bank should include at least one distractor");
        break;
      case "word_order":
        if (new Set(q.words).size < 2) issue("word_order needs distinct words");
        break;
      case "error_identification":
        if (q.errorIndex >= q.segments.length) issue("errorIndex out of range");
        break;
      case "essay":
        if (q.maxWords <= q.minWords) issue("maxWords must be greater than minWords");
        break;
    }
  });
export type AuthoredQuestion = z.infer<typeof authoredQuestionSchema>;

export const lessonSectionsSchema = z.object({
  /** Concept explanation (markdown). */
  explanation: z.string().min(80),
  examples: z.array(z.object({ en: nonEmpty, id: nonEmpty, note: z.string().optional() })).min(3),
  vocabulary: z
    .array(
      z.object({
        word: nonEmpty,
        pos: nonEmpty,
        ipa: z.string().optional(),
        meaning: nonEmpty,
        example: nonEmpty,
      }),
    )
    .min(4),
  grammar: z.array(z.object({ pattern: nonEmpty, example: nonEmpty, note: z.string().optional() })).min(1),
  mistakes: z.array(z.object({ wrong: nonEmpty, right: nonEmpty, why: nonEmpty })).min(2),
  summary: z.string().min(40),
  reviewCards: z.array(z.object({ front: nonEmpty, back: nonEmpty })).min(3),
});

export const authoredLessonSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title: nonEmpty,
    summary: nonEmpty,
    estimatedMinutes: z.number().int().min(5).max(60),
    objectives: z.array(nonEmpty).min(2),
    completionCriteria: nonEmpty,
    sections: lessonSectionsSchema,
    questions: z.array(authoredQuestionSchema).min(5),
  })
  .superRefine((lesson, ctx) => {
    const stages = lesson.questions.map((q) => q.stage);
    const need = (stage: QuestionStage, min: number) => {
      if (stages.filter((s) => s === stage).length < min)
        ctx.addIssue({ code: "custom", message: `${lesson.slug}: needs at least ${min} "${stage}" question(s)` });
    };
    need("guided", 1);
    need("independent", 1);
    need("quiz", 3);
    if (stages.some((s) => s === "exam" || s === "placement" || s === "unit_test"))
      ctx.addIssue({ code: "custom", message: `${lesson.slug}: lesson questions must be guided, independent or quiz` });
  });
export type AuthoredLesson = z.infer<typeof authoredLessonSchema>;

export const authoredUnitSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    number: z.number().int().min(1).max(20),
    title: nonEmpty,
    description: nonEmpty,
    objectives: z.array(nonEmpty).min(2),
    lessons: z.array(authoredLessonSchema).length(5),
    /** Extra questions used only in the unit assessment. */
    unitTestQuestions: z.array(authoredQuestionSchema).min(5),
  })
  .superRefine((unit, ctx) => {
    unit.unitTestQuestions.forEach((q) => {
      if (q.stage !== "unit_test")
        ctx.addIssue({ code: "custom", message: `${q.id}: unitTestQuestions must use stage "unit_test"` });
    });
  });
export type AuthoredUnit = z.infer<typeof authoredUnitSchema>;

// ---------------------------------------------------------------------------
// Skill-lab content (one file per level: content/skills/<level>.json)
// ---------------------------------------------------------------------------

export const grammarCategorySchema = z.enum([
  "tense",
  "sentence_structure",
  "parts_of_speech",
  "modals",
  "conditionals",
  "clauses",
  "voice",
  "reported_speech",
  "punctuation",
  "common_mistakes",
]);

export const authoredGrammarTopicSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: nonEmpty,
  category: grammarCategorySchema,
  explanation: z.string().min(80),
  formulas: z.array(z.object({ label: nonEmpty, pattern: nonEmpty })).min(1),
  examples: z.object({
    positive: z.array(nonEmpty).min(2),
    negative: z.array(nonEmpty).min(1),
    interrogative: z.array(nonEmpty).min(1),
  }),
  comparison: z.string().optional(),
  mistakes: z.array(z.object({ wrong: nonEmpty, right: nonEmpty, why: nonEmpty })).min(1),
  keywords: z.array(nonEmpty).min(2),
  /** Slugs of lessons that teach this topic. */
  relatedLessons: z.array(z.string()).default([]),
  exercises: z.array(authoredQuestionSchema).min(3),
});

export const authoredReadingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: nonEmpty,
  genre: z.enum(["article", "story", "dialogue", "email", "news", "academic"]),
  body: z.string().min(150),
  glossary: z.array(z.object({ word: nonEmpty, meaning: nonEmpty })).min(3),
  /** Must include main idea, detail, inference and vocabulary-in-context questions. */
  questions: z.array(authoredQuestionSchema).min(4),
});

export const authoredListeningSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: nonEmpty,
  kind: z.enum(["dialogue", "monologue", "announcement", "phone_call", "interview", "podcast"]),
  /** Lines of the script; read aloud with browser text-to-speech when no audio file exists. */
  script: z.array(z.object({ speaker: nonEmpty, text: nonEmpty })).min(2),
  questions: z.array(authoredQuestionSchema).min(3),
});

export const authoredSpeakingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: nonEmpty,
  kind: z.enum(["guided", "role_play", "situation", "pronunciation"]),
  prompt: nonEmpty,
  targetPhrases: z.array(nonEmpty).min(2),
  sampleAnswer: nonEmpty,
  tips: z.array(nonEmpty).min(1),
});

export const authoredWritingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: nonEmpty,
  kind: z.enum([
    "sentence",
    "paragraph",
    "email_formal",
    "email_informal",
    "essay",
    "opinion",
    "summary",
    "correction",
  ]),
  instructions: nonEmpty,
  minWords: z.number().int().min(5),
  maxWords: z.number().int().min(10),
  modelAnswer: z.string().optional(),
});

export const authoredVocabularySchema = z.object({
  word: nonEmpty,
  pos: nonEmpty,
  ipa: z.string().optional(),
  definition: nonEmpty,
  meaning: nonEmpty,
  examples: z.array(z.object({ en: nonEmpty, id: z.string().optional() })).min(1),
  synonyms: z.array(nonEmpty).default([]),
  antonyms: z.array(nonEmpty).default([]),
  collocations: z.array(nonEmpty).default([]),
  phrases: z.array(nonEmpty).default([]),
  related: z.array(nonEmpty).default([]),
  topic: nonEmpty,
});

export const skillsFileSchema = z.object({
  level: levelCodeSchema,
  grammarTopics: z.array(authoredGrammarTopicSchema).min(5),
  reading: z.array(authoredReadingSchema).min(4),
  listening: z.array(authoredListeningSchema).min(3),
  speaking: z.array(authoredSpeakingSchema).min(5),
  writing: z.array(authoredWritingSchema).min(4),
  vocabulary: z.array(authoredVocabularySchema).min(40),
  /** Questions used only in the level examination. */
  examQuestions: z.array(authoredQuestionSchema).min(10),
  /** Questions used only in the placement test (calibrated to this level). */
  placementQuestions: z.array(authoredQuestionSchema).min(8),
});
export type SkillsFile = z.infer<typeof skillsFileSchema>;

export const BLANK_TOKEN = BLANK;
export { countBlanks };
