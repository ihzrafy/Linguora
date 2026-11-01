import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ListChecks, Lock, RotateCcw, Target } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { AttemptHistory } from "@/app/app/_components/attempt-history";
import { AttemptView } from "@/app/app/_components/attempt-view";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
    .select("id, kind, title, description, pass_threshold, time_limit_seconds, max_attempts, question_count, lesson_id, unit_id, lessons(slug, title), units(title, slug, course_id, courses(levels(slug)))")
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
  // quiz_questions is staff-only under RLS; only the count is needed here.
  const [{ count: poolSize }, lockReason] = await Promise.all([
    createAdminClient().from("quiz_questions").select("question_id", { count: "exact", head: true }).eq("quiz_id", quizId),
    quizLockReason(viewer, quiz),
  ]);
  const lesson = quiz.lessons as { slug: string; title: string } | null;
  const unit = quiz.units as { title: string; slug: string; course_id: string; courses: { levels: { slug: string } | null } | null } | null;
  const levelSlug = unit?.courses?.levels?.slug;
  const open = attempts?.find((a) => a.status === "in_progress");
  const used = (attempts ?? []).filter((a) => a.status !== "in_progress").length;
  const exhausted = quiz.max_attempts !== null && used >= quiz.max_attempts;
  const questionCount = quiz.question_count ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={lesson ? `/app/lesson/${lesson.slug}` : levelSlug ? `/app/learn/${levelSlug}` : "/app/learn"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
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
      {lockReason && !open && (
        <Alert tone="warning" icon={Lock} title={quiz.kind === "unit_test" ? "Unit assessment belum terbuka" : "Mini quiz belum terbuka"}>
          {lockReason}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {quiz.kind === "lesson_quiz" && quiz.lesson_id ? (
          <StartAttemptButton target={{ kind: "lesson_quiz", lessonId: quiz.lesson_id }} hrefFor={`/app/quiz/${quizId}`} disabled={!open && (exhausted || Boolean(lockReason))}>
            {open ? "Lanjutkan attempt" : used ? "Ulangi quiz" : "Mulai quiz"}
          </StartAttemptButton>
        ) : quiz.unit_id ? (
          <StartAttemptButton target={{ kind: "unit_test", unitId: quiz.unit_id }} hrefFor={`/app/quiz/${quizId}`} disabled={!open && (exhausted || Boolean(lockReason))}>
            {open ? "Lanjutkan attempt" : used ? "Ulangi assessment" : "Mulai assessment"}
          </StartAttemptButton>
        ) : null}
        <p className="text-xs text-muted-foreground">Soal dan urutan opsi diacak. Jawaban dinilai di server setelah dikumpulkan.</p>
      </div>
      <AttemptHistory attempts={attempts ?? []} />
    </div>
  );
}

/** Same prerequisites the start actions enforce, shown up front instead of as a toast after clicking. */
async function quizLockReason(viewer: Viewer, quiz: { kind: string; lesson_id: string | null; unit_id: string | null; units: unknown }): Promise<string | null> {
  const db = createAdminClient();
  if (quiz.kind === "lesson_quiz" && quiz.lesson_id) {
    const [{ data: accessible }, { data: progress }] = await Promise.all([
      db.rpc("lesson_accessible_for", { p_user: viewer.id, p_lesson: quiz.lesson_id }),
      db.from("learning_progress").select("material_completed_at").eq("user_id", viewer.id).eq("lesson_id", quiz.lesson_id).maybeSingle(),
    ]);
    if (!accessible) return "Lesson ini masih terkunci. Selesaikan lesson sebelumnya terlebih dahulu.";
    if (!progress?.material_completed_at) return "Pelajari materi lesson sampai selesai, lalu tandai materi selesai untuk membuka mini quiz.";
    return null;
  }
  const courseId = (quiz.units as { course_id: string } | null)?.course_id;
  if (quiz.kind === "unit_test" && quiz.unit_id && courseId) {
    const { data: path } = await db.rpc("course_path_for", { p_user: viewer.id, p_course: courseId });
    const row = (path ?? []).find((r) => r.unit_id === quiz.unit_id);
    if (!row?.unit_unlocked) return "Unit ini masih terkunci. Lulus unit assessment sebelumnya terlebih dahulu.";
    if (!row.lessons_done) return "Selesaikan semua lesson di unit ini untuk membuka unit assessment.";
  }
  return null;
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
