import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ListChecks, RotateCcw, Target } from "lucide-react";
import { AttemptHistory } from "@/app/app/_components/attempt-history";
import { AttemptView } from "@/app/app/_components/attempt-view";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const [{ quizId }, { attempt }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/app/quiz/${quizId}`);
  if (attempt) return <AttemptView viewer={viewer} attemptId={attempt} expect={(a) => a.quiz_id === quizId} />;

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, kind, title, description, pass_threshold, time_limit_seconds, max_attempts, question_count, lesson_id, unit_id, lessons(slug, title), units(title, slug)")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) notFound();
  const { data: attempts } = await supabase
    .from("assessment_attempts")
    .select("id, status, score_percent, passed, submitted_at, started_at, attempt_number")
    .eq("user_id", viewer.id)
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false })
    .limit(20);
  const { count: poolSize } = await supabase.from("quiz_questions").select("question_id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const lesson = quiz.lessons as { slug: string; title: string } | null;
  const open = attempts?.find((a) => a.status === "in_progress");
  const used = (attempts ?? []).filter((a) => a.status !== "in_progress").length;
  const exhausted = quiz.max_attempts !== null && used >= quiz.max_attempts;
  const questionCount = quiz.question_count ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={lesson ? `/app/lesson/${lesson.slug}` : "/app/learn"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {lesson ? `Kembali ke lesson: ${lesson.title}` : "Kembali ke learning path"}
      </Link>
      <PageHeader eyebrow={quiz.kind === "unit_test" ? "Unit assessment" : "Mini quiz"} title={quiz.title} description={quiz.description} />
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Info icon={ListChecks} label="Jumlah soal" value={String(questionCount ?? poolSize ?? "–")} />
          <Info icon={Target} label="Nilai lulus" value={`${quiz.pass_threshold}%`} />
          <Info icon={Clock} label="Batas waktu" value={quiz.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} menit` : "Tidak ada"} />
          <Info icon={RotateCcw} label="Percobaan" value={quiz.max_attempts ? `${used}/${quiz.max_attempts}` : `${used} (tanpa batas)`} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        {quiz.kind === "lesson_quiz" && quiz.lesson_id ? (
          <StartAttemptButton target={{ kind: "lesson_quiz", lessonId: quiz.lesson_id }} hrefFor={`/app/quiz/${quizId}`} disabled={exhausted && !open}>
            {open ? "Lanjutkan attempt" : used ? "Ulangi quiz" : "Mulai quiz"}
          </StartAttemptButton>
        ) : quiz.unit_id ? (
          <StartAttemptButton target={{ kind: "unit_test", unitId: quiz.unit_id }} hrefFor={`/app/quiz/${quizId}`} disabled={exhausted && !open}>
            {open ? "Lanjutkan attempt" : used ? "Ulangi assessment" : "Mulai assessment"}
          </StartAttemptButton>
        ) : null}
        <p className="text-xs text-muted-foreground">Soal dan urutan opsi diacak. Jawaban dinilai di server setelah dikumpulkan.</p>
      </div>
      <AttemptHistory attempts={attempts ?? []} />
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-accent p-2 text-accent-foreground">
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
