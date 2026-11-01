import { describe, expect, it } from "vitest";
import type { AuthoredQuestion } from "@/lib/content/schema";
import { authoredQuestionSchema } from "@/lib/content/schema";
import { gradeResponse, summarizeScore } from "@/lib/questions/grading";
import { expandContractions, matchesAny, normalizeAnswer } from "@/lib/questions/normalize";
import { prepareQuestion } from "@/lib/questions/transform";

const base = { category: "grammar", topic: "test", difficulty: 1, stage: "quiz", explanation: "x" } as const;

function prep(q: Record<string, unknown>) {
  const parsed = authoredQuestionSchema.parse({ ...base, ...q }) as AuthoredQuestion;
  const p = prepareQuestion(parsed);
  return { ...p, gradable: { points: p.points, data: p.data, options: p.options, answerKey: p.answerKey, grading: p.grading } };
}

describe("normalizeAnswer", () => {
  it("collapses whitespace, unifies quotes and lowercases", () => {
    expect(normalizeAnswer("  I’m   FINE.  ")).toBe("i'm fine");
  });
  it("keeps punctuation spacing when punctuation matters", () => {
    expect(normalizeAnswer("Hello , world !", { ignorePunctuation: false })).toBe("hello, world!");
  });
  it("respects case sensitivity", () => {
    expect(normalizeAnswer("London", { caseSensitive: true })).toBe("London");
  });
  it("expands unambiguous contractions", () => {
    expect(expandContractions("i'm sure they won't come and she can't")).toBe("i am sure they will not come and she can not");
  });
  it("accepts contraction variants", () => {
    expect(matchesAny("I do not like coffee", ["I don't like coffee."])).toBe(true);
    expect(matchesAny("I don't like coffee", ["I do not like coffee"])).toBe(true);
    expect(matchesAny("I don't like coffee", ["I do not like coffee"], { strictContractions: true })).toBe(false);
  });
  it("rejects empty answers", () => {
    expect(matchesAny("   ", ["anything"])).toBe(false);
  });
});

describe("prepareQuestion", () => {
  it("never puts the answer in public data for choice questions", () => {
    const q = prep({ id: "t-q1", type: "single_choice", prompt: "Pick", options: ["a", "b", "c"], answer: 1 });
    expect(JSON.stringify(q.data)).not.toContain(q.options[1].id);
    expect(q.answerKey).toEqual({ kind: "choice", correct: q.options[1].id });
  });
  it("is deterministic", () => {
    const a = prep({ id: "t-q2", type: "word_order", prompt: "Order", words: ["I", "am", "a", "student"] });
    const b = prep({ id: "t-q2", type: "word_order", prompt: "Order", words: ["I", "am", "a", "student"] });
    expect(a.data).toEqual(b.data);
    expect(a.contentHash).toBe(b.contentHash);
  });
  it("shuffles word order so it differs from the answer", () => {
    const q = prep({ id: "t-q3", type: "word_order", prompt: "Order", words: ["She", "is", "my", "sister"] });
    if (q.data.kind !== "order") throw new Error("kind");
    expect(q.data.tokens.map((t) => t.text).join(" ")).not.toBe("She is my sister");
  });
  it("does not leak matching pairs via ids", () => {
    const q = prep({
      id: "t-q4",
      type: "matching",
      prompt: "Match",
      pairs: [
        { left: "cat", right: "kucing" },
        { left: "dog", right: "anjing" },
        { left: "bird", right: "burung" },
      ],
    });
    if (q.data.kind !== "matching") throw new Error("kind");
    const leftNums = q.data.left.map((l) => l.id.slice(1));
    const rightNums = q.data.right.map((r) => r.id.slice(1));
    expect(leftNums.some((n) => rightNums.includes(n))).toBe(false);
  });
  it("marks dictation and essays as practice-only", () => {
    expect(prep({ id: "t-q5", type: "dictation", prompt: "Write", text: "Hello there." }).practiceOnly).toBe(true);
    expect(prep({ id: "t-q6", type: "essay", prompt: "Write", minWords: 50, maxWords: 120 }).autoGradable).toBe(false);
  });
});

describe("gradeResponse", () => {
  it("grades single choice", () => {
    const q = prep({ id: "g-1", type: "single_choice", prompt: "p", options: ["am", "is", "are"], answer: 0 });
    expect(gradeResponse(q.gradable, { optionId: q.options[0].id }).isCorrect).toBe(true);
    const wrong = gradeResponse(q.gradable, { optionId: q.options[1].id });
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.pointsAwarded).toBe(0);
    expect(wrong.correctAnswer).toEqual(["am"]);
  });

  it("gives partial credit for multiple select and penalises wrong picks", () => {
    const q = prep({ id: "g-2", type: "multiple_select", prompt: "p", options: ["a", "b", "c", "d"], answers: [0, 1] });
    const [a, b, c] = q.options;
    expect(gradeResponse(q.gradable, { optionIds: [a.id, b.id] }).score).toBe(1);
    expect(gradeResponse(q.gradable, { optionIds: [a.id] }).score).toBe(0.5);
    const mixed = gradeResponse(q.gradable, { optionIds: [a.id, c.id] });
    expect(mixed.score).toBe(0);
    expect(mixed.isCorrect).toBe(false);
  });

  it("grades fill in the blanks with variants and partial credit", () => {
    const q = prep({ id: "g-3", type: "fill_blank", prompt: "p", text: "She ___ a doctor and he ___ a nurse.", answers: [["is"], ["is", "'s"]] });
    expect(gradeResponse(q.gradable, { blanks: ["is", "IS"] }).isCorrect).toBe(true);
    const half = gradeResponse(q.gradable, { blanks: ["is", "are"] });
    expect(half.score).toBe(0.5);
    expect(half.parts).toEqual([true, false]);
    expect(half.correctAnswer[0]).toBe("She is a doctor and he is a nurse.");
  });

  it("grades dropdown and drag & drop", () => {
    const d = prep({ id: "g-4", type: "dropdown", prompt: "p", text: "I ___ happy.", choices: [["is", "am", "are"]], answers: [1] });
    expect(gradeResponse(d.gradable, { choices: [1] }).isCorrect).toBe(true);
    expect(gradeResponse(d.gradable, { choices: [0] }).isCorrect).toBe(false);
    const b = prep({ id: "g-5", type: "drag_drop", prompt: "p", text: "They ___ from Bali.", bank: ["are", "is", "am"], answers: ["are"] });
    expect(gradeResponse(b.gradable, { blanks: ["are"] }).isCorrect).toBe(true);
  });

  it("grades word ordering by token ids", () => {
    const q = prep({ id: "g-6", type: "word_order", prompt: "p", words: ["Where", "are", "you", "from", "?"] });
    if (q.data.kind !== "order") throw new Error("kind");
    const tokens = q.data.tokens;
    const byText = (t: string) => tokens.find((x) => x.text === t)!.id;
    const right = ["Where", "are", "you", "from", "?"].map(byText);
    expect(gradeResponse(q.gradable, { order: right }).isCorrect).toBe(true);
    expect(gradeResponse(q.gradable, { order: right.slice(0, 4) }).isCorrect).toBe(false);
    expect(gradeResponse(q.gradable, { order: [...right].reverse() }).isCorrect).toBe(false);
  });

  it("grades matching with partial credit", () => {
    const q = prep({
      id: "g-7",
      type: "matching",
      prompt: "p",
      pairs: [
        { left: "one", right: "satu" },
        { left: "two", right: "dua" },
        { left: "three", right: "tiga" },
        { left: "four", right: "empat" },
      ],
    });
    if (q.answerKey.kind !== "matching") throw new Error("kind");
    const pairs = { ...q.answerKey.pairs };
    expect(gradeResponse(q.gradable, { pairs }).isCorrect).toBe(true);
    const [l0, l1] = Object.keys(pairs);
    const swapped = { ...pairs, [l0]: pairs[l1], [l1]: pairs[l0] };
    expect(gradeResponse(q.gradable, { pairs: swapped }).score).toBe(0.5);
  });

  it("reports matching parts in displayed row order even if the stored key order differs", () => {
    const q = prep({
      id: "g-7b",
      type: "matching",
      prompt: "p",
      pairs: [
        { left: "one", right: "satu" },
        { left: "two", right: "dua" },
        { left: "three", right: "tiga" },
      ],
    });
    if (q.answerKey.kind !== "matching" || q.data.kind !== "matching") throw new Error("kind");
    // jsonb may return the key's object entries in any order.
    const reversedKey = { ...q.answerKey, pairs: Object.fromEntries(Object.entries(q.answerKey.pairs).reverse()) };
    const rows = q.data.left;
    // Only the last displayed row is answered correctly.
    const last = rows[rows.length - 1].id;
    const result = gradeResponse({ ...q.gradable, answerKey: reversedKey }, { pairs: { [last]: q.answerKey.pairs[last] } });
    expect(result.parts).toEqual(rows.map((r) => r.id === last));
  });

  it("grades error identification", () => {
    const q = prep({ id: "g-8", type: "error_identification", prompt: "p", segments: ["She", "go", "to school", "every day."], errorIndex: 1, correction: "goes" });
    if (q.data.kind !== "segments") throw new Error("kind");
    expect(gradeResponse(q.gradable, { segmentId: q.data.segments[1].id }).isCorrect).toBe(true);
    expect(gradeResponse(q.gradable, { segmentId: q.data.segments[0].id }).isCorrect).toBe(false);
  });

  it("grades free text with accepted answers", () => {
    const q = prep({ id: "g-9", type: "translation", prompt: "p", source: "Saya seorang guru.", direction: "id-en", answers: ["I am a teacher."] });
    expect(gradeResponse(q.gradable, { text: "i'm a teacher" }).isCorrect).toBe(true);
    expect(gradeResponse(q.gradable, { text: "I am teacher" }).isCorrect).toBe(false);
  });

  it("flags essays for manual grading without auto score", () => {
    const q = prep({ id: "g-10", type: "essay", prompt: "Write", minWords: 10, maxWords: 50 });
    const r = gradeResponse(q.gradable, { text: "This is my short essay." });
    expect(r.reveal.withinRange).toBe(false);
    expect(r.needsManual).toBe(true);
    expect(r.isCorrect).toBeNull();
    expect(r.reveal.words).toBe(5);
  });

  it("never throws on malformed responses", () => {
    const q = prep({ id: "g-11", type: "fill_blank", prompt: "p", text: "A ___ B", answers: [["x"]] });
    expect(gradeResponse(q.gradable, null).score).toBe(0);
    expect(gradeResponse(q.gradable, { text: "x" } as never).score).toBe(0);
  });
});

describe("summarizeScore", () => {
  it("excludes manual items and computes percent", () => {
    const s = summarizeScore([
      { pointsAwarded: 1, maxPoints: 1, needsManual: false },
      { pointsAwarded: 0.5, maxPoints: 1, needsManual: false },
      { pointsAwarded: 0, maxPoints: 2, needsManual: true },
    ]);
    expect(s).toEqual({ points: 1.5, max: 2, percent: 75, pendingManual: true });
  });
});
