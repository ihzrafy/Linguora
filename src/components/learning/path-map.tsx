"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Check, CircleDot, ClipboardCheck, Crown, Flag, Lock, Play, RotateCcw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LessonStatus, PathUnit } from "@/lib/learning/lessons";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export const STATUS_META: Record<LessonStatus, { label: string; icon: typeof Lock; node: string }> = {
  locked: { label: "Terkunci", icon: Lock, node: "border-border bg-muted text-muted-foreground" },
  available: { label: "Tersedia", icon: Play, node: "border-primary bg-card text-primary ring-4 ring-primary/15 dark:text-brand-lavender" },
  in_progress: { label: "Sedang dipelajari", icon: CircleDot, node: "border-brand-blue bg-brand-blue/10 text-brand-blue ring-4 ring-brand-blue/15" },
  completed: { label: "Selesai", icon: Check, node: "border-success bg-success text-success-foreground" },
  mastered: { label: "Dikuasai", icon: Crown, node: "border-amber-500 bg-amber-400 text-amber-950" },
  needs_review: { label: "Perlu review", icon: RotateCcw, node: "border-warning bg-warning/20 text-warning-foreground dark:text-warning" },
};

export function StatusBadge({ status }: { status: LessonStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className="gap-1 font-medium">
      <meta.icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function PathMap({ units, exam }: { units: PathUnit[]; exam: { href: string; unlocked: boolean; passed: boolean; title: string } | null }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-path-node]", { opacity: 0, y: 16, scale: 0.92, duration: 0.45, stagger: 0.035, ease: "power2.out" });
        gsap.from("[data-path-line]", { scaleY: 0, transformOrigin: "top", duration: 0.8, ease: "power1.out" });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative space-y-10">
      {units.map((unit) => {
        const done = unit.lessons.filter((l) => ["completed", "mastered", "needs_review"].includes(l.status)).length;
        return (
          <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="relative">
            <div className={cn("mb-5 flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", unit.unlocked ? "bg-card" : "bg-muted/40")}>
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Unit {unit.sort}</p>
                <h2 id={`unit-${unit.id}`} className="text-lg font-semibold">
                  <Link href={`/app/unit/${unit.id}`} className="hover:underline">
                    {unit.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{unit.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {!unit.unlocked && (
                  <Badge variant="outline">
                    <Lock className="size-3" /> Terkunci
                  </Badge>
                )}
                {unit.completed ? (
                  <Badge className="bg-success text-success-foreground">
                    <Flag className="size-3" /> Unit selesai
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {done}/{unit.lessons.length} lesson
                  </span>
                )}
              </div>
            </div>

            <ol className="relative ml-6 space-y-4 border-l-2 border-dashed border-border pl-8" data-path-line>
              {unit.lessons.map((lesson) => {
                const meta = STATUS_META[lesson.status];
                const locked = lesson.status === "locked";
                const content = (
                  <>
                    <span data-path-node className={cn("absolute -left-[3.05rem] flex size-11 items-center justify-center rounded-full border-2 shadow-xs", meta.node)}>
                      <meta.icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {lesson.sort}. {lesson.title}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">{lesson.summary}</span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <StatusBadge status={lesson.status} />
                      <span className="text-xs text-muted-foreground">
                        {lesson.estimatedMinutes} menit{lesson.bestScore !== null && ` · skor ${lesson.bestScore}%`}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={lesson.id} className="relative">
                    {locked ? (
                      <div aria-disabled className="flex items-center gap-3 rounded-xl border border-transparent p-3 opacity-70">
                        <span className="sr-only">Terkunci: </span>
                        {content}
                      </div>
                    ) : (
                      <Link
                        href={`/app/lesson/${lesson.slug}`}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/50 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
              {unit.unitTestQuizId && (
                <li className="relative">
                  <span
                    data-path-node
                    className={cn(
                      "absolute -left-[3.05rem] flex size-11 items-center justify-center rounded-xl border-2",
                      unit.unitTestPassed ? "border-success bg-success text-success-foreground" : unit.lessonsDone && unit.unlocked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <ClipboardCheck className="size-5" aria-hidden />
                  </span>
                  {unit.lessonsDone && unit.unlocked ? (
                    <Link href={`/app/quiz/${unit.unitTestQuizId}`} className="flex items-center justify-between rounded-xl border-2 border-primary/30 bg-primary/5 p-3 font-medium hover:border-primary">
                      Unit assessment
                      <span className="text-sm text-muted-foreground">{unit.unitTestPassed ? "Lulus ✓" : "Siap dikerjakan"}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl p-3 font-medium text-muted-foreground">
                      Unit assessment <span className="text-sm">Selesaikan semua lesson</span>
                    </div>
                  )}
                </li>
              )}
            </ol>
          </section>
        );
      })}

      {exam && (
        <div data-path-node className={cn("flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center", exam.passed ? "border-success bg-success/5" : exam.unlocked ? "border-primary bg-primary/5" : "border-dashed")}>
          <Trophy className={cn("size-10", exam.passed ? "text-success" : exam.unlocked ? "text-primary" : "text-muted-foreground")} aria-hidden />
          <p className="text-lg font-semibold">{exam.title}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {exam.passed ? "Kamu sudah lulus ujian level ini." : exam.unlocked ? "Semua prasyarat terpenuhi. Lulus ujian untuk membuka level berikutnya." : "Terbuka setelah semua unit dan unit assessment di level ini selesai."}
          </p>
          {(exam.unlocked || exam.passed) && (
            <Link href={exam.href} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {exam.passed ? "Lihat ujian" : "Ke ujian level"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
