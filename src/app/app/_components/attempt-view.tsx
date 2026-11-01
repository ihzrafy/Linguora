import { notFound, redirect } from "next/navigation";
import { AttemptRunnerClient as AttemptRunner } from "@/components/questions/attempt-runner-client";
import { ActionError, type Viewer } from "@/lib/auth";
import { loadAttemptView } from "@/lib/learning/assessments";

/** Server wrapper: loads an attempt the viewer owns and renders the runner. */
export async function AttemptView({
  viewer,
  attemptId,
  expect,
}: {
  viewer: Viewer;
  attemptId: string;
  expect: (a: { kind: string; quiz_id: string | null; exam_id: string | null }) => boolean;
}) {
  let view;
  try {
    view = await loadAttemptView(viewer, attemptId);
  } catch (error) {
    if (error instanceof ActionError) notFound();
    throw error;
  }
  if (!expect(view.attempt)) notFound();
  if (view.attempt.status !== "in_progress") redirect(`/app/results/${attemptId}`);
  const practice = ["practice", "review", "daily_challenge"].includes(view.attempt.kind);
  return (
    <AttemptRunner
      attemptId={attemptId}
      title={view.title}
      mode={practice ? "practice" : "assessment"}
      questions={view.questions}
      saved={view.saved}
      savedCorrect={view.savedCorrect}
      expiresAt={view.attempt.expires_at}
      passThreshold={view.attempt.pass_threshold}
    />
  );
}
