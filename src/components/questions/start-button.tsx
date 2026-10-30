"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import {
  startLessonQuizAction,
  startLevelExamAction,
  startPlacementAction,
  startPracticeAction,
  startUnitTestAction,
} from "@/app/app/learning-actions";
import { Button } from "@/components/ui/button";

type Target =
  | { kind: "lesson_quiz"; lessonId: string }
  | { kind: "unit_test"; unitId: string }
  | { kind: "level_exam"; levelId: string }
  | { kind: "placement"; timed: boolean }
  | {
      kind: "practice";
      mode: "adaptive" | "topic" | "review" | "daily" | "lesson" | "source";
      category?: string;
      topic?: string;
      lessonId?: string;
      count?: number;
      source?: { kind: "grammar" | "reading" | "listening"; id: string };
    };

/** Starts (or resumes) an attempt on the server, then navigates to its runner. */
export function StartAttemptButton({
  target,
  hrefFor,
  children,
  disabled,
  variant,
  size,
  className,
}: {
  target: Target;
  /** Path of the runner page; the attempt id is appended as ?attempt=… */
  hrefFor: string;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const res =
        target.kind === "lesson_quiz"
          ? await startLessonQuizAction(target.lessonId)
          : target.kind === "unit_test"
            ? await startUnitTestAction(target.unitId)
            : target.kind === "level_exam"
              ? await startLevelExamAction(target.levelId)
              : target.kind === "placement"
                ? await startPlacementAction(target.timed)
                : await startPracticeAction({ mode: target.mode, category: target.category, topic: target.topic, lessonId: target.lessonId, count: target.count, source: target.source });
      if (!res.ok) return void toast.error(res.error);
      router.push(`${hrefFor}${hrefFor.includes("?") ? "&" : "?"}attempt=${res.data}`);
    });
  return (
    <Button onClick={run} disabled={disabled || pending} variant={variant} size={size} className={className}>
      {pending ? <Loader2 className="animate-spin" /> : <Play />}
      {children}
    </Button>
  );
}
