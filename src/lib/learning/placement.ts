/**
 * Placement estimation — transparent rule, documented in docs/LEARNING_ENGINE.md:
 * the recommended level is the first CEFR level whose questions the learner
 * answers with < 70% accuracy (A1..C2). It is an estimate, not a certification.
 */
import { LEVEL_CODES, type LevelCode, type SkillCategory } from "@/lib/content/schema";

export const PLACEMENT_MASTERY = 0.7;
export const PLACEMENT_MIN_CATEGORY_ITEMS = 3;

export type PlacementItem = { level: LevelCode; category: SkillCategory; correct: boolean };

export type PlacementResult = {
  recommendedLevel: LevelCode;
  perLevel: { level: LevelCode; correct: number; total: number; percent: number }[];
  perCategory: { category: SkillCategory; correct: number; count: number; percent: number; estimatedLevel: LevelCode | null }[];
  strengths: SkillCategory[];
  weaknesses: SkillCategory[];
};

const pct = (c: number, t: number) => (t ? Math.round((c / t) * 1000) / 10 : 0);

function firstUnmastered(items: PlacementItem[]): LevelCode {
  for (const level of LEVEL_CODES) {
    const band = items.filter((i) => i.level === level);
    if (!band.length) continue;
    const accuracy = band.filter((i) => i.correct).length / band.length;
    if (accuracy < PLACEMENT_MASTERY) return level;
  }
  // Everything mastered → highest level present (or C2).
  const present = LEVEL_CODES.filter((l) => items.some((i) => i.level === l));
  return present[present.length - 1] ?? "A1";
}

export function estimatePlacement(items: PlacementItem[]): PlacementResult {
  const perLevel = LEVEL_CODES.map((level) => {
    const band = items.filter((i) => i.level === level);
    const correct = band.filter((i) => i.correct).length;
    return { level, correct, total: band.length, percent: pct(correct, band.length) };
  }).filter((l) => l.total > 0);

  const categories = [...new Set(items.map((i) => i.category))];
  const perCategory = categories
    .map((category) => {
      const subset = items.filter((i) => i.category === category);
      const correct = subset.filter((i) => i.correct).length;
      return {
        category,
        correct,
        count: subset.length,
        percent: pct(correct, subset.length),
        estimatedLevel: subset.length >= PLACEMENT_MIN_CATEGORY_ITEMS ? firstUnmastered(subset) : null,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return {
    recommendedLevel: items.length ? firstUnmastered(items) : "A1",
    perLevel,
    perCategory,
    strengths: perCategory.filter((c) => c.count >= PLACEMENT_MIN_CATEGORY_ITEMS && c.percent >= 70).map((c) => c.category),
    weaknesses: perCategory.filter((c) => c.count >= PLACEMENT_MIN_CATEGORY_ITEMS && c.percent < 50).map((c) => c.category),
  };
}

const GOAL_TO_TRACK: Record<string, string> = {
  daily: "general-english",
  travel: "general-english",
  academic: "academic-english",
  exam: "academic-english",
  business: "business-english",
  career: "career-development",
};

export function recommendTrack(goal: string | null | undefined): string {
  return (goal && GOAL_TO_TRACK[goal]) || "general-english";
}
