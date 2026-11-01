import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Award, CheckCircle2, Clock3, RotateCcw, XCircle, Zap } from "lucide-react";
import type { Feedback } from "@/components/questions/question-renderer";
import { ResultCelebration } from "@/components/questions/answer-fx";
import { ReviewQuestion } from "@/components/questions/review-question";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { attemptTitle } from "@/lib/learning/assessments";
import type { PlacementResult } from "@/lib/learning/placement";
import { recommendTrack } from "@/lib/learning/placement";
import { loadClientQuestions, loadGradableQuestions } from "@/lib/learning/questions-server";
import { gradeResponse } from "@/lib/questions/grading";
import type { QuestionResponse } from "@/lib/questions/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hasil" };

const CATEGORY_LABEL: Record<string, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  pronunciation: "Pronunciation",
  conversation: "Conversation",
  academic: "Academic",
  business: "Business",
  mixed: "Mixed",
};

export default async function ResultsPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ celebrate?: string }> }) {
  const [{ attemptId }, { celebrate }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/app/results/${attemptId}`);
  const supabase = await createClient();
  const { data: attempt } = await supabase.from("assessment_attempts").select("*").eq("id", attemptId).eq("user_id", viewer.id).maybeSingle();
  if (!attempt) notFound();
  if (attempt.status === "in_progress") {
    const href = attempt.quiz_id ? `/app/quiz/${attempt.quiz_id}?attempt=${attempt.id}` : attempt.exam_id ? `/app/exam/${attempt.exam_id}?attempt=${attempt.id}` : `/app/practice?attempt=${attempt.id}`;
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">Attempt ini belum dikumpulkan</h1>
        <Button asChild>
          <Link href={href}>Lanjutkan pengerjaan</Link>
        </Button>
      </div>
    );
  }

  const [title, { data: answers }, questions, gradable] = await Promise.all([
    attemptTitle(attempt),
    supabase.from("assessment_answers").select("question_id, response, is_correct, needs_manual_grading, feedback").eq("attempt_id", attemptId),
    loadClientQuestions(attempt.question_ids, attempt.option_orders as Record<string, string[]>),
    loadGradableQuestions(attempt.question_ids),
  ]);
  const result = (attempt.result ?? {}) as {
    categories?: { category: string; correct: number; total: number; percent: number }[];
    placement?: PlacementResult;
    xp_awarded?: number;
    achievements?: string[];
    unlocked_level?: string | null;
    answered?: number;
    total?: number;
  };
  const score = Number(attempt.score_percent ?? 0);
  const isPlacement = attempt.kind === "placement";
  const isPractice = ["practice", "review", "daily_challenge"].includes(attempt.kind);
  const passed = attempt.passed;

  // Where to go next.
  const { data: lesson } = attempt.lesson_id ? await supabase.from("lessons").select("slug, title").eq("id", attempt.lesson_id).maybeSingle() : { data: null };
  const { data: level } = attempt.level_id ? await supabase.from("levels").select("slug, code").eq("id", attempt.level_id).maybeSingle() : { data: null };
  const next = attempt.passed ? await nextStep(supabase, attempt) : null;
  const retryHref = attempt.quiz_id ? `/app/quiz/${attempt.quiz_id}` : attempt.exam_id ? (isPlacement ? "/app/placement-test" : `/app/exam/${attempt.exam_id}`) : "/app/practice";

  const review = questions.map((q) => {
    const answer = answers?.find((a) => a.question_id === q.id);
    const g = gradable.get(q.id);
    const response = (answer?.response ?? null) as QuestionResponse | null;
    const feedback: Feedback | null = g
      ? { ...gradeResponse(g, response), explanation: g.explanation, misconception: g.misconception }
      : null;
    return { q, response, feedback, unanswered: !answer?.response };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {celebrate === "1" && <ResultCelebration outcome={isPlacement || isPractice ? "done" : passed ? "success" : "fail"} />}
      <PageHeader eyebrow="Hasil" title={title} description={`Dikumpulkan ${new Date(attempt.submitted_at ?? attempt.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`} />

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card className={cn("overflow-hidden", !isPlacement && !isPractice && (passed ? "border-success/50" : "border-destructive/40"))}>
          <CardContent className="flex items-center gap-6">
            <ScoreRing value={score} tone={isPlacement || isPractice ? "neutral" : passed ? "success" : "danger"} />
            <div className="space-y-2">
              {isPlacement ? (
                <p className="text-lg font-semibold">Estimasi level kamu: {result.placement?.recommendedLevel}</p>
              ) : isPractice ? (
                <p className="text-lg font-semibold">Latihan selesai</p>
              ) : passed ? (
                <p className="flex items-center gap-2 text-lg font-semibold text-success">
                  <CheckCircle2 className="size-5" /> Lulus!
                </p>
              ) : (
                <p className="flex items-center gap-2 text-lg font-semibold text-destructive">
                  <XCircle className="size-5" /> Belum lulus
                </p>
              )}
              {attempt.pass_threshold !== null && !isPractice && <p className="text-sm text-muted-foreground">Nilai minimum lulus: {attempt.pass_threshold}%</p>}
              {attempt.pending_manual && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock3 className="size-4" /> Sebagian jawaban menunggu penilaian reviewer.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {Boolean(result.xp_awarded) && (
                  <Badge className="bg-brand-blue/15 text-brand-blue">
                    <Zap className="size-3" /> +{result.xp_awarded} XP
                  </Badge>
                )}
                {(result.achievements ?? []).map((a) => (
                  <Badge key={a} variant="secondary">
                    <Award className="size-3" /> Achievement baru
                  </Badge>
                ))}
                {result.unlocked_level && !isPlacement && <Badge className="bg-success text-success-foreground">Level {result.unlocked_level} terbuka!</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(result.categories ?? []).length === 0 && <p className="text-sm text-muted-foreground">Tidak ada rincian kategori.</p>}
            {(result.categories ?? []).map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.correct}/{c.total} · {c.percent}%
                  </span>
                </div>
                <Progress value={c.percent} aria-label={`${c.category} ${c.percent}%`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isPlacement && result.placement && <PlacementSummary placement={result.placement} goal={viewer.profile.learning_goal} />}

      <div className="flex flex-wrap gap-2">
        {passed && (next || (lesson && attempt.kind === "lesson_quiz")) && (
          <Button asChild>
            <Link href={next?.href ?? (level ? `/app/learn/${level.slug}` : "/app/learn")}>
              {next?.label ?? "Lihat learning path"} <ArrowRight />
            </Link>
          </Button>
        )}
        {!passed && lesson && (
          <Button asChild variant="secondary">
            <Link href={`/app/lesson/${lesson.slug}`}>Pelajari ulang materi</Link>
          </Button>
        )}
        {!isPlacement && (
          <Button asChild variant="outline">
            <Link href={retryHref}>
              <RotateCcw /> {isPractice ? "Latihan lagi" : "Coba lagi"}
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/app/dashboard">Ke dashboard</Link>
        </Button>
      </div>

      {isPlacement ? (
        <p className="text-sm text-muted-foreground">
          Pembahasan per soal placement test tidak ditampilkan agar tes tetap valid saat diulang. Hasil di atas adalah estimasi, bukan pengukuran sempurna.
        </p>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pembahasan</h2>
          {review.map(({ q, response, feedback, unanswered }, i) => (
            <Card key={q.id}>
              <CardContent className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Soal {i + 1}
                  {unanswered && " · tidak dijawab"}
                </p>
                <ReviewQuestion question={q} response={response} feedback={feedback} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function ScoreRing({ value, tone }: { value: number; tone: "success" | "danger" | "neutral" }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--destructive)" : "var(--primary)";
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Skor ${value}%`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}

const TRACK_NAMES: Record<string, string> = {
  "general-english": "General English",
  "academic-english": "English for Academic Purposes",
  "business-english": "Business English",
  "career-development": "English for Career Development",
};

function PlacementSummary({ placement, goal }: { placement: PlacementResult; goal: string | null }) {
  const track = recommendTrack(goal);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekomendasi belajar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-accent/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Level yang disarankan</p>
            <p className="mt-1 text-3xl font-bold">{placement.recommendedLevel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Level ini dan semua level di bawahnya sudah terbuka untukmu.</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Learning track</p>
            <p className="mt-1 text-xl font-bold">{TRACK_NAMES[track]}</p>
            <p className="mt-1 text-sm text-muted-foreground">Berdasarkan tujuan belajar di onboarding. Dapat diubah di pengaturan.</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Akurasi per level soal</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {placement.perLevel.map((l) => (
              <div key={l.level} className="rounded-lg border p-2 text-center">
                <p className="text-xs text-muted-foreground">{l.level}</p>
                <p className={cn("font-semibold tabular-nums", l.percent >= 70 ? "text-success" : l.percent >= 40 ? "" : "text-destructive")}>{l.percent}%</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-semibold">Kekuatan</p>
            <p className="text-muted-foreground">{placement.strengths.length ? placement.strengths.map((s) => CATEGORY_LABEL[s] ?? s).join(", ") : "Belum terlihat menonjol — terus berlatih!"}</p>
          </div>
          <div>
            <p className="font-semibold">Perlu ditingkatkan</p>
            <p className="text-muted-foreground">{placement.weaknesses.length ? placement.weaknesses.map((s) => CATEGORY_LABEL[s] ?? s).join(", ") : "Tidak ada kategori dengan akurasi di bawah 50%."}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/app/learn/${placement.recommendedLevel.toLowerCase()}`}>
            Mulai belajar di level {placement.recommendedLevel} <ArrowRight />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Hasil placement test adalah estimasi kemampuan berdasarkan {placement.perLevel.reduce((n, l) => n + l.total, 0)} soal, bukan pengukuran sempurna atau sertifikasi resmi.
        </p>
      </CardContent>
    </Card>
  );
}

type Db = Awaited<ReturnType<typeof createClient>>;

/** Where to go after passing: the next lesson, else the unit assessment; after a unit test, the next unit. */
async function nextStep(supabase: Db, attempt: { kind: string; lesson_id: string | null; unit_id: string | null }): Promise<{ href: string; label: string } | null> {
  if (attempt.kind === "lesson_quiz" && attempt.lesson_id) {
    const { data: cur } = await supabase.from("lessons").select("unit_id, sort_order").eq("id", attempt.lesson_id).maybeSingle();
    if (!cur) return null;
    const [{ data: nextLesson }, { data: unitTest }] = await Promise.all([
      supabase.from("lessons").select("slug").eq("unit_id", cur.unit_id).eq("status", "published").gt("sort_order", cur.sort_order).order("sort_order").limit(1).maybeSingle(),
      supabase.from("quizzes").select("id").eq("unit_id", cur.unit_id).eq("kind", "unit_test").eq("status", "published").maybeSingle(),
    ]);
    if (nextLesson) return { href: `/app/lesson/${nextLesson.slug}`, label: "Lanjut ke lesson berikutnya" };
    if (unitTest) return { href: `/app/quiz/${unitTest.id}`, label: "Lanjut ke unit assessment" };
    return null;
  }
  if (attempt.kind === "unit_test" && attempt.unit_id) {
    const { data: cur } = await supabase.from("units").select("course_id, sort_order").eq("id", attempt.unit_id).maybeSingle();
    if (!cur) return null;
    const { data: nextUnit } = await supabase
      .from("units")
      .select("id, lessons(slug, sort_order)")
      .eq("course_id", cur.course_id)
      .eq("status", "published")
      .gt("sort_order", cur.sort_order)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    const first = [...((nextUnit?.lessons as { slug: string; sort_order: number }[] | null) ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    if (first) return { href: `/app/lesson/${first.slug}`, label: "Lanjut ke unit berikutnya" };
    return null;
  }
  return null;
}
