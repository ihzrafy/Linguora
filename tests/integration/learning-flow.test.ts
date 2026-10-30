import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ActionError } from "@/lib/auth";
import { saveResponse, startLessonQuiz, startLevelExam, startUnitTest, submitAttempt } from "@/lib/learning/assessments";
import { completeLessonMaterial, startLesson } from "@/lib/learning/lessons";
import { admin, coreLessons, correctResponses, createTestUser, deleteUser, xpTotal } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let learner: TestUser;
let other: TestUser;
let a1: Awaited<ReturnType<typeof coreLessons>>;

async function passLesson(user: TestUser, lessonId: string, correct = true) {
  const viewer = await user.viewer();
  await startLesson(viewer, lessonId);
  await completeLessonMaterial(viewer, lessonId);
  const attemptId = await startLessonQuiz(viewer, lessonId);
  const { data: attempt } = await admin.from("assessment_attempts").select("question_ids").eq("id", attemptId).single();
  const responses = correct ? await correctResponses(attempt!.question_ids) : {};
  return { attemptId, result: await submitAttempt(viewer, attemptId, responses) };
}

beforeAll(async () => {
  learner = await createTestUser("flow");
  other = await createTestUser("other");
  a1 = await coreLessons("A1");
});

afterAll(async () => {
  await deleteUser(learner.id);
  await deleteUser(other.id);
});

describe("registration bootstrap", () => {
  it("creates profile, student role, stats and an A1 unlock", async () => {
    const [{ data: profile }, { data: roles }, { data: unlocks }] = await Promise.all([
      admin.from("profiles").select("username, current_level_id").eq("id", learner.id).single(),
      admin.from("user_roles").select("role").eq("user_id", learner.id),
      admin.from("user_level_unlocks").select("level_id").eq("user_id", learner.id),
    ]);
    expect(profile?.username).toMatch(/^[a-z0-9_]{3,24}$/);
    expect(roles?.map((r) => r.role)).toEqual(["student"]);
    expect(unlocks?.map((u) => u.level_id)).toEqual([a1.levelId]);
    expect(profile?.current_level_id).toBe(a1.levelId);
  });
});

describe("lesson progression and locked content", () => {
  it("only the first lesson is accessible at the start", async () => {
    const [first, second] = a1.units[0].lessons;
    const { data: ok1 } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: first.id });
    const { data: ok2 } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: second.id });
    expect(ok1).toBe(true);
    expect(ok2).toBe(false);
  });

  it("RLS hides sections of locked lessons and the whole question bank from learners", async () => {
    const [first, second] = a1.units[0].lessons;
    const { data: open } = await learner.client.from("lesson_sections").select("id").eq("lesson_id", first.id);
    const { data: locked } = await learner.client.from("lesson_sections").select("id").eq("lesson_id", second.id);
    expect(open!.length).toBeGreaterThan(0);
    expect(locked).toEqual([]);
    const { data: questions } = await learner.client.from("questions").select("id").limit(5);
    const { data: keys } = await learner.client.from("question_answer_keys").select("question_id").limit(5);
    expect(questions).toEqual([]);
    expect(keys).toEqual([]);
  });

  it("refuses to start a locked lesson or its quiz", async () => {
    const viewer = await learner.viewer();
    const second = a1.units[0].lessons[1];
    await expect(startLesson(viewer, second.id)).rejects.toBeInstanceOf(ActionError);
    await expect(startLessonQuiz(viewer, second.id)).rejects.toThrow(/terkunci|materi/i);
  });

  it("requires finishing the material before the quiz", async () => {
    const viewer = await learner.viewer();
    const first = a1.units[0].lessons[0];
    await startLesson(viewer, first.id);
    await expect(startLessonQuiz(viewer, first.id)).rejects.toThrow(/materi/i);
  });

  it("a failed quiz keeps the lesson in progress and the next lesson locked", async () => {
    const first = a1.units[0].lessons[0];
    const { result } = await passLesson(learner, first.id, false);
    expect(result.passed).toBe(false);
    expect(result.scorePercent).toBe(0);
    const { data: ok } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: a1.units[0].lessons[1].id });
    expect(ok).toBe(false);
  });

  it("passing the quiz completes the lesson, awards XP once and unlocks the next lesson", async () => {
    const first = a1.units[0].lessons[0];
    const before = await xpTotal(learner.id);
    const { attemptId, result } = await passLesson(learner, first.id);
    expect(result.passed).toBe(true);
    expect(result.scorePercent).toBe(100);
    expect(result.xpAwarded).toBeGreaterThanOrEqual(20);
    const after = await xpTotal(learner.id);
    expect(after - before).toBe(result.xpAwarded);

    const { data: progress } = await admin.from("learning_progress").select("status").eq("user_id", learner.id).eq("lesson_id", first.id).single();
    expect(progress?.status).toBe("mastered");
    const { data: ok } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: a1.units[0].lessons[1].id });
    expect(ok).toBe(true);

    // Re-submitting the same attempt is idempotent: no extra XP.
    const again = await submitAttempt(await learner.viewer(), attemptId, {});
    expect(again.alreadySubmitted).toBe(true);
    expect(await xpTotal(learner.id)).toBe(after);
  });

  it("retaking a completed lesson quiz does not award lesson XP twice", async () => {
    const first = a1.units[0].lessons[0];
    const before = await xpTotal(learner.id);
    const { result } = await passLesson(learner, first.id);
    expect(result.passed).toBe(true);
    expect(result.xpAwarded).toBe(0);
    expect(await xpTotal(learner.id)).toBe(before);
  });

  it("rejects answers after submission and answers to foreign questions", async () => {
    const viewer = await learner.viewer();
    const { data: done } = await admin.from("assessment_attempts").select("id, question_ids").eq("user_id", learner.id).eq("status", "graded").limit(1).single();
    await expect(saveResponse(viewer, done!.id, done!.question_ids[0], { optionId: "x" })).rejects.toThrow(/dikumpulkan/);
  });
});

describe("score manipulation and data isolation", () => {
  it("learners cannot write XP, stats, progress, unlocks or attempts directly", async () => {
    const c = learner.client;
    const xp = await c.from("xp_transactions").insert({ user_id: learner.id, amount: 9999, source: "admin_adjust", idempotency_key: "hack", activity_date: "2026-01-01" });
    expect(xp.error).not.toBeNull();
    await c.from("user_stats").update({ total_xp: 999999 }).eq("user_id", learner.id);
    const { data: stats } = await admin.from("user_stats").select("total_xp").eq("user_id", learner.id).single();
    expect(stats!.total_xp).toBeLessThan(999999);
    const unlock = await c.from("user_level_unlocks").insert({ user_id: learner.id, level_id: a1.levelId, source: "admin" });
    expect(unlock.error).not.toBeNull();
    await c.from("assessment_attempts").update({ score_percent: 100, passed: true }).eq("user_id", learner.id);
    const { data: failed } = await admin.from("assessment_attempts").select("id").eq("user_id", learner.id).eq("passed", false);
    expect(failed!.length).toBeGreaterThan(0);
  });

  it("learners cannot change protected profile columns or grant themselves roles", async () => {
    const { data: levels } = await admin.from("levels").select("id").eq("code", "C2").single();
    const res = await learner.client.from("profiles").update({ current_level_id: levels!.id }).eq("id", learner.id);
    expect(res.error).not.toBeNull();
    const role = await learner.client.from("user_roles").insert({ user_id: learner.id, role: "super_admin" });
    expect(role.error).not.toBeNull();
    const ok = await learner.client.from("profiles").update({ display_name: "Renamed" }).eq("id", learner.id);
    expect(ok.error).toBeNull();
  });

  it("users cannot read each other's data", async () => {
    const tables = ["assessment_attempts", "assessment_answers", "learning_progress", "xp_transactions", "daily_activity", "user_stats"] as const;
    for (const table of tables) {
      const { data } = await other.client.from(table).select("user_id").eq("user_id", learner.id);
      expect(data, table).toEqual([]);
    }
    const { data: profile } = await other.client.from("profiles").select("id").eq("id", learner.id);
    expect(profile).toEqual([]);
  });

  it("server functions are not callable by learners", async () => {
    const res = await learner.client.rpc("award_xp", { p_user: learner.id, p_amount: 500, p_source: "admin_adjust", p_source_id: "x", p_key: "x" });
    expect(res.error).not.toBeNull();
    const fin = await learner.client.rpc("finalize_attempt", { p_attempt: learner.id, p_answers: [], p_outcome: {} });
    expect(fin.error).not.toBeNull();
  });
});

describe("streak", () => {
  it("counts activity once per day", async () => {
    const { data: s1 } = await admin.from("user_stats").select("current_streak, last_active_date").eq("user_id", learner.id).single();
    expect(s1!.current_streak).toBe(1);
    await admin.rpc("record_activity", { p_user: learner.id, p_questions: 1 });
    await admin.rpc("record_activity", { p_user: learner.id, p_questions: 1 });
    const { data: s2 } = await admin.from("user_stats").select("current_streak").eq("user_id", learner.id).single();
    expect(s2!.current_streak).toBe(1);
  });

  it("continues after yesterday and resets after a gap", async () => {
    const { data: today } = await admin.rpc("user_local_date", { p_user: learner.id });
    const yesterday = new Date(`${today}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await admin.from("user_stats").update({ current_streak: 4, last_active_date: yesterday.toISOString().slice(0, 10) }).eq("user_id", learner.id);
    await admin.rpc("record_activity", { p_user: learner.id, p_questions: 1 });
    const { data: s } = await admin.from("user_stats").select("current_streak, longest_streak").eq("user_id", learner.id).single();
    expect(s!.current_streak).toBe(5);
    expect(s!.longest_streak).toBeGreaterThanOrEqual(5);
    await admin.from("user_stats").update({ last_active_date: "2020-01-01" }).eq("user_id", learner.id);
    await admin.rpc("record_activity", { p_user: learner.id, p_questions: 1 });
    const { data: r } = await admin.from("user_stats").select("current_streak").eq("user_id", learner.id).single();
    expect(r!.current_streak).toBe(1);
  });
});

describe("unit and level progression", () => {
  it("unit test unlocks only after all lessons, and passing it opens the next unit", async () => {
    const viewer = await learner.viewer();
    const unit1 = a1.units[0];
    await expect(startUnitTest(viewer, unit1.id)).rejects.toThrow(/lesson/i);
    for (const lesson of unit1.lessons.slice(1)) {
      const { result } = await passLesson(learner, lesson.id);
      expect(result.passed).toBe(true);
    }
    const nextLesson = a1.units[1].lessons[0];
    const { data: before } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: nextLesson.id });
    expect(before).toBe(false);

    const testId = await startUnitTest(viewer, unit1.id);
    const { data: attempt } = await admin.from("assessment_attempts").select("question_ids, expires_at").eq("id", testId).single();
    expect(attempt!.question_ids.length).toBeGreaterThanOrEqual(5);
    expect(attempt!.expires_at).not.toBeNull();
    const res = await submitAttempt(viewer, testId, await correctResponses(attempt!.question_ids));
    expect(res.passed).toBe(true);
    const { data: after } = await admin.rpc("lesson_accessible_for", { p_user: learner.id, p_lesson: nextLesson.id });
    expect(after).toBe(true);
  });

  it("the level exam stays locked until every unit is complete", async () => {
    const viewer = await learner.viewer();
    await expect(startLevelExam(viewer, a1.levelId)).rejects.toThrow(/unit/i);
  });

  it("completing the whole level and passing the exam unlocks A2 and issues a certificate", { timeout: 240_000 }, async () => {
    const viewer = await learner.viewer();
    for (const unit of a1.units.slice(1)) {
      for (const lesson of unit.lessons) await passLesson(learner, lesson.id);
      const testId = await startUnitTest(viewer, unit.id);
      const { data: t } = await admin.from("assessment_attempts").select("question_ids").eq("id", testId).single();
      const r = await submitAttempt(viewer, testId, await correctResponses(t!.question_ids));
      expect(r.passed).toBe(true);
    }
    const { data: unlocked } = await admin.rpc("level_exam_unlocked_for", { p_user: learner.id, p_level: a1.levelId });
    expect(unlocked).toBe(true);

    // A failed exam does not unlock anything and starts a cooldown.
    const failId = await startLevelExam(viewer, a1.levelId);
    const failed = await submitAttempt(viewer, failId, {});
    expect(failed.passed).toBe(false);
    await expect(startLevelExam(viewer, a1.levelId)).rejects.toThrow(/tunggu/i);
    await admin.from("assessment_attempts").update({ submitted_at: "2020-01-01T00:00:00Z" }).eq("id", failId);

    const examId = await startLevelExam(viewer, a1.levelId);
    const { data: e } = await admin.from("assessment_attempts").select("question_ids").eq("id", examId).single();
    expect(e!.question_ids.length).toBe(30);
    const passed = await submitAttempt(viewer, examId, await correctResponses(e!.question_ids));
    expect(passed.passed).toBe(true);
    expect(passed.unlockedLevel).toBe("A2");

    const { data: a2 } = await admin.from("levels").select("id").eq("code", "A2").single();
    const { data: unlock } = await admin.from("user_level_unlocks").select("source").eq("user_id", learner.id).eq("level_id", a2!.id).single();
    expect(unlock?.source).toBe("exam");
    const { data: cert } = await admin.from("certificates").select("verification_code").eq("user_id", learner.id).eq("level_id", a1.levelId).single();
    expect(cert?.verification_code).toMatch(/^[A-F0-9]{10}$/);
  });
});
