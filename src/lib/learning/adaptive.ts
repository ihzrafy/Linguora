/**
 * Rule-based adaptive practice selection (no machine learning).
 *
 * Each candidate question gets a transparent score:
 *   score = topicWeight × typeWeight × difficultyFit × novelty
 * - topicWeight: 1 + 2 × (1 − accuracy) for topics with ≥ 3 answers, 1.2 for unseen topics
 * - typeWeight: same formula per question type
 * - difficultyFit: 1 / (1 + |difficulty − target|)
 * - novelty: unseen 1.0 · last wrong 0.9 (0.4 if seen < 24h ago) · last right 0.15
 * Due review questions are inserted first (up to 30%), and no topic may take more than
 * ⌈n / 3⌉ slots.
 */
export type Candidate = { id: string; topic: string; type: string; difficulty: number };
export type QuestionHistory = { timesSeen: number; timesCorrect: number; lastCorrect: boolean | null; lastSeenAt: string };
export type Performance = { correct: number; total: number };

export type AdaptiveInput = {
  candidates: Candidate[];
  history: Map<string, QuestionHistory>;
  topicPerformance: Map<string, Performance>;
  typePerformance: Map<string, Performance>;
  /** Accuracy over the learner's recent answers (0..1), null when unknown. */
  recentAccuracy: number | null;
  baseDifficulty: number;
  dueReviewIds: string[];
  count: number;
  now?: Date;
  seed?: number;
};

export type Pick = { id: string; reason: "review" | "weak-topic" | "new" | "reinforce"; score: number };

export function targetDifficulty(base: number, recentAccuracy: number | null): number {
  let target = base;
  if (recentAccuracy !== null) {
    if (recentAccuracy >= 0.85) target += 1;
    else if (recentAccuracy < 0.6) target -= 1;
  }
  return Math.max(1, Math.min(5, target));
}

export function weaknessWeight(perf: Performance | undefined, unseen = 1.2): number {
  if (!perf || perf.total < 3) return unseen;
  return 1 + 2 * (1 - perf.correct / perf.total);
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectAdaptive(input: AdaptiveInput): Pick[] {
  const now = input.now ?? new Date();
  const random = rng(input.seed ?? Date.now());
  const target = targetDifficulty(input.baseDifficulty, input.recentAccuracy);
  const maxPerTopic = Math.max(1, Math.ceil(input.count / 3));
  const byId = new Map(input.candidates.map((c) => [c.id, c]));

  const picks: Pick[] = [];
  const perTopic = new Map<string, number>();
  const take = (c: Candidate, reason: Pick["reason"], score: number) => {
    picks.push({ id: c.id, reason, score });
    perTopic.set(c.topic, (perTopic.get(c.topic) ?? 0) + 1);
  };

  // 1. Due reviews first (max 30%).
  const reviewSlots = Math.floor(input.count * 0.3);
  for (const id of input.dueReviewIds) {
    if (picks.length >= reviewSlots) break;
    const c = byId.get(id);
    if (c) take(c, "review", 10);
  }

  // 2. Score the rest.
  const scored = input.candidates
    .filter((c) => !picks.some((p) => p.id === c.id))
    .map((c) => {
      const h = input.history.get(c.id);
      let novelty = 1;
      let reason: Pick["reason"] = "new";
      if (h) {
        const hoursAgo = (now.getTime() - new Date(h.lastSeenAt).getTime()) / 3_600_000;
        if (h.lastCorrect === false) {
          novelty = hoursAgo < 24 ? 0.4 : 0.9;
          reason = "weak-topic";
        } else {
          novelty = 0.15;
          reason = "reinforce";
        }
      }
      const topicW = weaknessWeight(input.topicPerformance.get(c.topic));
      const typeW = weaknessWeight(input.typePerformance.get(c.type), 1);
      if (!h && topicW > 1.6) reason = "weak-topic";
      const fit = 1 / (1 + Math.abs(c.difficulty - target));
      // small jitter breaks ties without hiding the rule
      const score = topicW * typeW * fit * novelty * (0.9 + random() * 0.2);
      return { c, score, reason };
    })
    .sort((a, b) => b.score - a.score);

  for (const { c, score, reason } of scored) {
    if (picks.length >= input.count) break;
    if ((perTopic.get(c.topic) ?? 0) >= maxPerTopic) continue;
    take(c, reason, Math.round(score * 1000) / 1000);
  }
  // 3. If topic caps left gaps, fill with the best remaining.
  for (const { c, score, reason } of scored) {
    if (picks.length >= input.count) break;
    if (!picks.some((p) => p.id === c.id)) take(c, reason, Math.round(score * 1000) / 1000);
  }
  return picks;
}
