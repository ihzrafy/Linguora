/**
 * Server-side grading engine. Pure functions — no I/O — so they are unit tested
 * in isolation (tests/unit/grading.test.ts).
 */
import { countWords, matchesAny, normalizeAnswer } from "./normalize";
import type { AnswerKey, GradeResult, GradingOptions, PublicData, QuestionResponse } from "./types";

export type GradableQuestion = {
  points: number;
  data: PublicData;
  options: { id: string; content: string }[];
  answerKey: AnswerKey;
  grading: GradingOptions;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function result(
  q: GradableQuestion,
  score: number,
  extra: Partial<GradeResult> & Pick<GradeResult, "correctAnswer" | "reveal">,
): GradeResult {
  const clamped = Math.max(0, Math.min(1, score));
  return {
    isCorrect: clamped >= 0.999,
    score: clamped,
    pointsAwarded: round2(clamped * q.points),
    maxPoints: q.points,
    needsManual: false,
    ...extra,
  };
}

function fillTemplate(template: string, values: string[]): string {
  let i = 0;
  return template.replace(/___/g, () => values[i++] ?? "___");
}

const has = <K extends string>(r: unknown, key: K): r is Record<K, unknown> =>
  typeof r === "object" && r !== null && key in r;

/** Grades a response. Invalid/missing responses score 0 (never throw on learner input). */
export function gradeResponse(q: GradableQuestion, response: QuestionResponse | null | undefined): GradeResult {
  const key = q.answerKey;
  const optionText = (id: string) => q.options.find((o) => o.id === id)?.content ?? "";

  switch (key.kind) {
    case "choice": {
      const chosen = has(response, "optionId") ? String(response.optionId) : null;
      return result(q, chosen === key.correct ? 1 : 0, {
        correctAnswer: [optionText(key.correct)],
        reveal: { correctOptionIds: [key.correct] },
      });
    }

    case "multi": {
      const chosen = new Set(has(response, "optionIds") && Array.isArray(response.optionIds) ? response.optionIds.map(String) : []);
      const correct = new Set(key.correct);
      let hits = 0;
      let wrong = 0;
      chosen.forEach((id) => (correct.has(id) ? hits++ : wrong++));
      const exact = hits === correct.size && wrong === 0;
      const partial = Math.max(0, (hits - wrong) / correct.size);
      return result(q, exact ? 1 : partial, {
        isCorrect: exact,
        correctAnswer: key.correct.map(optionText),
        reveal: { correctOptionIds: key.correct },
      });
    }

    case "gaps": {
      const blanks = has(response, "blanks") && Array.isArray(response.blanks) ? response.blanks.map((b) => String(b ?? "")) : [];
      const parts = key.blanks.map((accepted, i) => matchesAny(blanks[i] ?? "", accepted, q.grading));
      const template = q.data.kind === "gaps" ? q.data.template : "";
      return result(q, parts.filter(Boolean).length / key.blanks.length, {
        parts,
        correctAnswer: [fillTemplate(template, key.blanks.map((b) => b[0]))],
        reveal: { blanks: key.blanks.map((b) => b[0]), accepted: key.blanks },
      });
    }

    case "dropdown": {
      const choices = has(response, "choices") && Array.isArray(response.choices) ? response.choices.map(Number) : [];
      const parts = key.blanks.map((correct, i) => choices[i] === correct);
      const data = q.data.kind === "dropdown" ? q.data : null;
      const words = key.blanks.map((c, i) => data?.choices[i]?.[c] ?? "");
      return result(q, parts.filter(Boolean).length / key.blanks.length, {
        parts,
        correctAnswer: [fillTemplate(data?.template ?? "", words)],
        reveal: { choices: key.blanks },
      });
    }

    case "bank": {
      const blanks = has(response, "blanks") && Array.isArray(response.blanks) ? response.blanks.map((b) => String(b ?? "")) : [];
      const parts = key.blanks.map((correct, i) => normalizeAnswer(blanks[i] ?? "") === normalizeAnswer(correct));
      const template = q.data.kind === "bank" ? q.data.template : "";
      return result(q, parts.filter(Boolean).length / key.blanks.length, {
        parts,
        correctAnswer: [fillTemplate(template, key.blanks)],
        reveal: { blanks: key.blanks },
      });
    }

    case "order": {
      const tokens = q.data.kind === "order" ? q.data.tokens : [];
      const order = has(response, "order") && Array.isArray(response.order) ? response.order.map(String) : [];
      const used = new Set(order);
      const complete = order.length === tokens.length && used.size === tokens.length;
      const sentence = order.map((id) => tokens.find((t) => t.id === id)?.text ?? "").join(" ");
      const ok = complete && matchesAny(sentence, key.answers, { ...q.grading, ignorePunctuation: true });
      return result(q, ok ? 1 : 0, { correctAnswer: [key.answers[0]], reveal: { answers: key.answers } });
    }

    case "matching": {
      const pairs = has(response, "pairs") && typeof response.pairs === "object" && response.pairs ? (response.pairs as Record<string, string>) : {};
      const entries = Object.entries(key.pairs);
      const parts = entries.map(([l, r]) => pairs[l] === r);
      const data = q.data.kind === "matching" ? q.data : null;
      const text = (list: { id: string; text: string }[] | undefined, id: string) => list?.find((t) => t.id === id)?.text ?? "";
      return result(q, parts.filter(Boolean).length / entries.length, {
        parts,
        correctAnswer: entries.map(([l, r]) => `${text(data?.left, l)} → ${text(data?.right, r)}`),
        reveal: { pairs: key.pairs },
      });
    }

    case "segments": {
      const chosen = has(response, "segmentId") ? String(response.segmentId) : null;
      const segs = q.data.kind === "segments" ? q.data.segments : [];
      const wrong = segs.find((s) => s.id === key.segment)?.text ?? "";
      return result(q, chosen === key.segment ? 1 : 0, {
        correctAnswer: [`"${wrong}" → "${key.correction}"`],
        reveal: { segmentId: key.segment, correction: key.correction },
      });
    }

    case "text": {
      const text = has(response, "text") ? String(response.text ?? "") : "";
      return result(q, matchesAny(text, key.answers, q.grading) ? 1 : 0, {
        correctAnswer: key.answers.slice(0, 3),
        reveal: { answers: key.answers },
      });
    }

    case "essay": {
      const text = has(response, "text") ? String(response.text ?? "") : "";
      const data = q.data.kind === "essay" ? q.data : null;
      const words = countWords(text);
      return {
        isCorrect: null,
        score: 0,
        pointsAwarded: 0,
        maxPoints: q.points,
        needsManual: true,
        correctAnswer: [],
        reveal: {
          words,
          withinRange: data ? words >= data.minWords && words <= data.maxWords : true,
          rubric: key.rubric,
        },
      };
    }

    case "speaking": {
      const transcript = has(response, "transcript") ? String(response.transcript ?? "") : "";
      const said = normalizeAnswer(transcript);
      const matched = key.targetPhrases.filter((p) => said.includes(normalizeAnswer(p)));
      return {
        isCorrect: null,
        score: 0,
        pointsAwarded: 0,
        maxPoints: q.points,
        needsManual: true,
        correctAnswer: key.sampleAnswer ? [key.sampleAnswer] : [],
        reveal: { matchedPhrases: matched, targetPhrases: key.targetPhrases, sampleAnswer: key.sampleAnswer ?? null },
      };
    }
  }
}

/** Aggregate score for a set of graded answers (auto-graded only). */
export function summarizeScore(results: Pick<GradeResult, "pointsAwarded" | "maxPoints" | "needsManual">[]) {
  const graded = results.filter((r) => !r.needsManual);
  const points = round2(graded.reduce((s, r) => s + r.pointsAwarded, 0));
  const max = round2(graded.reduce((s, r) => s + r.maxPoints, 0));
  const percent = max > 0 ? round2((points / max) * 100) : 0;
  return { points, max, percent, pendingManual: results.some((r) => r.needsManual) };
}
