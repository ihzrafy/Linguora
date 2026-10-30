/**
 * Spaced repetition scheduler based on SM-2 (SuperMemo 2).
 * Transparent and deterministic: same input → same schedule.
 */
export type ReviewGrade = "again" | "hard" | "good" | "easy";
export type Mastery = "new" | "learning" | "review" | "mastered";

export type SrsState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
};

export const INITIAL_SRS: SrsState = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
export const MASTERED_INTERVAL_DAYS = 21;

const QUALITY: Record<ReviewGrade, number> = { again: 1, hard: 3, good: 4, easy: 5 };
const DAY_MS = 86_400_000;

export function scheduleReview(state: SrsState, grade: ReviewGrade, now: Date = new Date()) {
  const q = QUALITY[grade];
  let { easeFactor, intervalDays, repetitions, lapses } = state;

  easeFactor = Math.max(1.3, Math.round((easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))) * 100) / 100);

  let dueAt: Date;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 0;
    lapses += 1;
    dueAt = new Date(now.getTime() + 10 * 60_000); // see it again in 10 minutes
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = grade === "easy" ? 3 : 1;
    else if (repetitions === 2) intervalDays = grade === "hard" ? 3 : 6;
    else intervalDays = Math.round(intervalDays * (grade === "hard" ? 1.2 : easeFactor) * (grade === "easy" ? 1.3 : 1));
    intervalDays = Math.max(1, Math.min(intervalDays, 365));
    dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  }

  const mastery: Mastery =
    intervalDays >= MASTERED_INTERVAL_DAYS ? "mastered" : repetitions >= 2 ? "review" : repetitions === 0 && lapses === 0 ? "new" : "learning";

  return { state: { easeFactor, intervalDays, repetitions, lapses }, dueAt, mastery };
}
