import { describe, expect, it } from "vitest";
import { selectAdaptive, targetDifficulty, weaknessWeight, type Candidate } from "@/lib/learning/adaptive";
import { estimatePlacement, recommendTrack, type PlacementItem } from "@/lib/learning/placement";
import { INITIAL_SRS, scheduleReview } from "@/lib/learning/srs";
import { addDays, effectiveStreak, localDate, nextStreak, weekStart, weeklyStreak } from "@/lib/learning/streak";

describe("spaced repetition (SM-2)", () => {
  const now = new Date("2026-01-01T08:00:00Z");

  it("schedules good answers at 1, 6, then ×EF days", () => {
    const r1 = scheduleReview(INITIAL_SRS, "good", now);
    expect(r1.state.intervalDays).toBe(1);
    const r2 = scheduleReview(r1.state, "good", now);
    expect(r2.state.intervalDays).toBe(6);
    const r3 = scheduleReview(r2.state, "good", now);
    expect(r3.state.intervalDays).toBe(Math.round(6 * r2.state.easeFactor));
    expect(r3.dueAt.getTime()).toBe(now.getTime() + r3.state.intervalDays * 86_400_000);
  });

  it("resets on 'again' and counts a lapse", () => {
    const learned = scheduleReview(scheduleReview(INITIAL_SRS, "good", now).state, "good", now).state;
    const lapse = scheduleReview(learned, "again", now);
    expect(lapse.state.repetitions).toBe(0);
    expect(lapse.state.lapses).toBe(1);
    expect(lapse.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(lapse.mastery).toBe("learning");
  });

  it("never lets ease factor drop below 1.3", () => {
    let s = INITIAL_SRS;
    for (let i = 0; i < 20; i++) s = scheduleReview(s, "again", now).state;
    expect(s.easeFactor).toBe(1.3);
  });

  it("marks long intervals as mastered", () => {
    let s = INITIAL_SRS;
    let mastery = "new";
    for (let i = 0; i < 6; i++) {
      const r = scheduleReview(s, "easy", now);
      s = r.state;
      mastery = r.mastery;
    }
    expect(s.intervalDays).toBeGreaterThanOrEqual(21);
    expect(mastery).toBe("mastered");
  });
});

describe("streaks", () => {
  it("formats local dates by timezone", () => {
    const instant = new Date("2026-03-01T20:00:00Z");
    expect(localDate("Asia/Jakarta", instant)).toBe("2026-03-02");
    expect(localDate("America/New_York", instant)).toBe("2026-03-01");
  });

  it("increments on consecutive days and is idempotent within a day", () => {
    expect(nextStreak(0, null, "2026-01-10")).toBe(1);
    expect(nextStreak(4, "2026-01-09", "2026-01-10")).toBe(5);
    expect(nextStreak(5, "2026-01-10", "2026-01-10")).toBe(5);
    expect(nextStreak(5, "2026-01-07", "2026-01-10")).toBe(1);
  });

  it("shows a broken streak as 0", () => {
    expect(effectiveStreak(7, "2026-01-09", "2026-01-10")).toBe(7);
    expect(effectiveStreak(7, "2026-01-08", "2026-01-10")).toBe(0);
  });

  it("counts weekly streaks", () => {
    expect(weekStart("2026-01-07")).toBe("2026-01-05"); // Wednesday → Monday
    const dates = ["2026-01-06", "2025-12-30", "2025-12-22", "2025-12-01"];
    expect(weeklyStreak(dates, "2026-01-07")).toBe(3);
    expect(weeklyStreak(dates, "2026-01-14")).toBe(3); // this week empty, last week counts
    expect(weeklyStreak(dates, "2026-01-21")).toBe(0);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("placement estimation", () => {
  const band = (level: PlacementItem["level"], correct: number, total = 8, category: PlacementItem["category"] = "grammar") =>
    Array.from({ length: total }, (_, i) => ({ level, category, correct: i < correct }));

  it("recommends the first level below 70%", () => {
    const items = [...band("A1", 8), ...band("A2", 7), ...band("B1", 4), ...band("B2", 1), ...band("C1", 0), ...band("C2", 0)];
    const r = estimatePlacement(items);
    expect(r.recommendedLevel).toBe("B1");
    expect(r.perLevel.find((l) => l.level === "A2")?.percent).toBe(87.5);
  });

  it("recommends A1 for beginners and C2 when everything is mastered", () => {
    expect(estimatePlacement(band("A1", 2)).recommendedLevel).toBe("A1");
    const all = (["A1", "A2", "B1", "B2", "C1", "C2"] as const).flatMap((l) => band(l, 8));
    expect(estimatePlacement(all).recommendedLevel).toBe("C2");
  });

  it("reports strengths and weaknesses per category", () => {
    const items = [...band("A1", 8, 8, "vocabulary"), ...band("A1", 1, 4, "reading")];
    const r = estimatePlacement(items);
    expect(r.strengths).toContain("vocabulary");
    expect(r.weaknesses).toContain("reading");
  });

  it("maps goals to tracks", () => {
    expect(recommendTrack("business")).toBe("business-english");
    expect(recommendTrack(null)).toBe("general-english");
  });
});

describe("adaptive practice", () => {
  const cands: Candidate[] = Array.from({ length: 30 }, (_, i) => ({
    id: `q${i}`,
    topic: i < 10 ? "articles" : i < 20 ? "plurals" : "to-be",
    type: "single_choice",
    difficulty: (i % 5) + 1,
  }));

  it("adjusts target difficulty from recent accuracy", () => {
    expect(targetDifficulty(2, 0.9)).toBe(3);
    expect(targetDifficulty(2, 0.5)).toBe(1);
    expect(targetDifficulty(5, 0.95)).toBe(5);
    expect(targetDifficulty(3, null)).toBe(3);
  });

  it("weights weak topics higher", () => {
    expect(weaknessWeight({ correct: 1, total: 10 })).toBeCloseTo(2.8);
    expect(weaknessWeight({ correct: 10, total: 10 })).toBe(1);
    expect(weaknessWeight({ correct: 0, total: 1 })).toBe(1.2);
  });

  it("prioritises due reviews, respects topic caps and avoids repeats", () => {
    const history = new Map(
      cands.filter((c) => c.topic === "to-be").map((c) => [c.id, { timesSeen: 3, timesCorrect: 3, lastCorrect: true, lastSeenAt: "2026-01-01T00:00:00Z" }]),
    );
    const picks = selectAdaptive({
      candidates: cands,
      history,
      topicPerformance: new Map([["articles", { correct: 2, total: 10 }], ["plurals", { correct: 9, total: 10 }]]),
      typePerformance: new Map(),
      recentAccuracy: 0.7,
      baseDifficulty: 2,
      dueReviewIds: ["q25", "q26", "q27", "q28"],
      count: 10,
      now: new Date("2026-01-03T00:00:00Z"),
      seed: 42,
    });
    expect(picks).toHaveLength(10);
    expect(new Set(picks.map((p) => p.id)).size).toBe(10);
    expect(picks.slice(0, 3).map((p) => p.reason)).toEqual(["review", "review", "review"]);
    const articleCount = picks.filter((p) => cands.find((c) => c.id === p.id)!.topic === "articles").length;
    expect(articleCount).toBeLessThanOrEqual(4);
    expect(articleCount).toBeGreaterThanOrEqual(3); // weakest topic gets the most new slots
  });
});
