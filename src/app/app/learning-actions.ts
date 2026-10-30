"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import {
  answerPractice,
  finishPractice,
  loadAttemptView,
  saveResponse,
  startLessonQuiz,
  startLevelExam,
  startPlacement,
  startUnitTest,
  submitAttempt,
} from "@/lib/learning/assessments";
import { completeLessonMaterial, startLesson } from "@/lib/learning/lessons";
import { startPractice } from "@/lib/learning/practice";

const uuid = z.uuid();

export async function startLessonAction(lessonId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await startLesson(viewer, uuid.parse(lessonId));
  });
}

export async function completeMaterialAction(lessonId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await completeLessonMaterial(viewer, uuid.parse(lessonId));
    revalidatePath("/app/learn", "layout");
  });
}

export async function startLessonQuizAction(lessonId: string) {
  return runAction(async () => startLessonQuiz(await assertViewer(), uuid.parse(lessonId)));
}

export async function startUnitTestAction(unitId: string) {
  return runAction(async () => startUnitTest(await assertViewer(), uuid.parse(unitId)));
}

export async function startLevelExamAction(levelId: string) {
  return runAction(async () => startLevelExam(await assertViewer(), uuid.parse(levelId)));
}

export async function startPlacementAction(timed: boolean) {
  return runAction(async () => startPlacement(await assertViewer(), { timed: Boolean(timed) }));
}

export async function saveResponseAction(attemptId: string, questionId: string, response: unknown) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`save:${viewer.id}`, 240, 60);
    await saveResponse(viewer, uuid.parse(attemptId), uuid.parse(questionId), response);
  });
}

export async function submitAttemptAction(attemptId: string, responses: Record<string, unknown>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`submit:${viewer.id}`, 20, 60);
    const result = await submitAttempt(viewer, uuid.parse(attemptId), z.record(z.string(), z.unknown()).parse(responses ?? {}));
    revalidatePath("/app", "layout");
    return result;
  });
}

const practiceSchema = z.object({
  mode: z.enum(["adaptive", "topic", "review", "daily", "lesson", "source"]),
  count: z.number().int().min(5).max(30).optional(),
  category: z.string().max(40).optional(),
  topic: z.string().max(120).optional(),
  levelId: z.uuid().optional(),
  lessonId: z.uuid().optional(),
  source: z.object({ kind: z.enum(["grammar", "reading", "listening"]), id: z.uuid() }).optional(),
});

export async function startPracticeAction(input: z.input<typeof practiceSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`practice:${viewer.id}`, 30, 60);
    return startPractice(viewer, practiceSchema.parse(input));
  });
}

export async function answerPracticeAction(attemptId: string, questionId: string, response: unknown) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`answer:${viewer.id}`, 120, 60);
    return answerPractice(viewer, uuid.parse(attemptId), uuid.parse(questionId), response);
  });
}

/** Guided + independent practice embedded in a lesson (reuses one open practice attempt per lesson). */
export async function lessonPracticeAction(lessonId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const attemptId = await startPractice(viewer, { mode: "lesson", lessonId: uuid.parse(lessonId) });
    const view = await loadAttemptView(viewer, attemptId);
    return { attemptId, questions: view.questions, saved: view.saved };
  });
}

export async function finishPracticeAction(attemptId: string) {
  return runAction(async () => {
    const result = await finishPractice(await assertViewer(), uuid.parse(attemptId));
    revalidatePath("/app", "layout");
    return result;
  });
}
