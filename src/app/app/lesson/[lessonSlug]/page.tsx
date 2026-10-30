import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, Target } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { StatusBadge } from "@/components/learning/path-map";
import { BookmarkButton, CompleteAndQuiz, LessonPractice, LessonStarter, ReviewCards, SaveWordButton, SpeakButton } from "@/components/learning/lesson-client";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth";
import { getCoursePath, type LessonStatus } from "@/lib/learning/lessons";
import { createClient } from "@/lib/supabase/server";

type Items<T> = { items?: T[]; questionIds?: string[] };

export async function generateMetadata({ params }: { params: Promise<{ lessonSlug: string }> }): Promise<Metadata> {
  const { lessonSlug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("title").eq("slug", lessonSlug).maybeSingle();
  return { title: data?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;
  const viewer = await requireViewer(`/app/lesson/${lessonSlug}`);
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, slug, title, summary, objectives, completion_criteria, estimated_minutes, xp_reward, sort_order, unit_id, units(id, title, sort_order, course_id, courses(levels(code, slug)))")
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson) notFound();
  const unit = lesson.units as unknown as { id: string; title: string; sort_order: number; course_id: string; courses: { levels: { code: string; slug: string } } };
  const level = unit.courses.levels;

  const path = await getCoursePath(unit.course_id);
  const flat = path.flatMap((u) => u.lessons);
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const status: LessonStatus = flat[idx]?.status ?? "locked";
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  if (status === "locked") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href={`/app/learn/${level.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Level {level.code}
        </Link>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <Alert tone="warning" icon={Lock} title="Lesson ini masih terkunci">
          Selesaikan lesson sebelumnya{prev ? ` ("${prev.title}")` : ""} dan unit assessment pada unit sebelumnya untuk membuka lesson ini.
        </Alert>
        {prev && prev.status !== "locked" && (
          <Button asChild>
            <Link href={`/app/lesson/${prev.slug}`}>Ke lesson sebelumnya</Link>
          </Button>
        )}
      </div>
    );
  }

  // Sections are protected by RLS: they are only returned for unlocked lessons.
  const [{ data: sections }, { data: progress }, { data: quiz }, { data: bookmark }] = await Promise.all([
    supabase.from("lesson_sections").select("id, kind, title, body_md, data, sort_order").eq("lesson_id", lesson.id).order("sort_order"),
    supabase.from("learning_progress").select("status, material_completed_at, best_quiz_score").eq("user_id", viewer.id).eq("lesson_id", lesson.id).maybeSingle(),
    supabase.from("quizzes").select("id").eq("lesson_id", lesson.id).eq("kind", "lesson_quiz").maybeSingle(),
    supabase.from("bookmarks").select("id").eq("user_id", viewer.id).eq("target_type", "lesson").eq("target_id", lesson.id).maybeSingle(),
  ]);
  const toc = (sections ?? []).map((s) => ({ id: `s-${s.sort_order}`, title: s.title }));

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_15rem]">
      <LessonStarter lessonId={lesson.id} />
      <article className="min-w-0 space-y-8">
        <header className="space-y-4">
          <Link href={`/app/learn/${level.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {level.code} · Unit {unit.sort_order}: {unit.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Badge variant="outline">
              <Clock className="size-3" /> {lesson.estimated_minutes} menit
            </Badge>
            <Badge variant="outline">+{lesson.xp_reward} XP</Badge>
            {progress?.best_quiz_score !== null && progress?.best_quiz_score !== undefined && <Badge variant="secondary">Skor terbaik {Number(progress.best_quiz_score)}%</Badge>}
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">{lesson.title}</h1>
          <p className="text-lg text-muted-foreground">{lesson.summary}</p>
          <BookmarkButton targetType="lesson" targetId={lesson.id} title={lesson.title} href={`/app/lesson/${lesson.slug}`} initial={Boolean(bookmark)} />
        </header>

        {(sections ?? []).map((s) => {
          const data = (s.data ?? {}) as Items<never>;
          const anchor = `s-${s.sort_order}`;
          return (
            <section key={s.id} id={anchor} aria-labelledby={`${anchor}-h`} className="scroll-mt-24 space-y-4">
              <h2 id={`${anchor}-h`} className="flex items-center gap-2 text-xl font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">{s.sort_order}</span>
                {s.title}
              </h2>
              <SectionBody kind={s.kind} body={s.body_md} data={data} lessonId={lesson.id} quizId={quiz?.id ?? null} materialDone={Boolean(progress?.material_completed_at)} status={progress?.status ?? null} criteria={lesson.completion_criteria} />
            </section>
          );
        })}

        <nav className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between" aria-label="Navigasi lesson">
          {prev ? (
            <Button asChild variant="outline">
              <Link href={`/app/lesson/${prev.slug}`}>
                <ArrowLeft /> {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && next.status !== "locked" && (
            <Button asChild>
              <Link href={`/app/lesson/${next.slug}`}>
                {next.title} <ArrowRight />
              </Link>
            </Button>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <nav aria-label="Daftar isi" className="sticky top-24 space-y-1 text-sm">
          <p className="mb-2 font-semibold">Isi lesson</p>
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              {t.title}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}

function SectionBody({
  kind,
  body,
  data,
  lessonId,
  quizId,
  materialDone,
  status,
  criteria,
}: {
  kind: string;
  body: string;
  data: Items<never>;
  lessonId: string;
  quizId: string | null;
  materialDone: boolean;
  status: string | null;
  criteria: string;
}) {
  const items = (data.items ?? []) as unknown[];
  switch (kind) {
    case "objectives":
      return (
        <ul className="space-y-2">
          {(items as string[]).map((o) => (
            <li key={o} className="flex gap-2">
              <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {o}
            </li>
          ))}
        </ul>
      );
    case "explanation":
    case "summary":
      return <Markdown>{body}</Markdown>;
    case "examples":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {(items as { en: string; id: string; note?: string }[]).map((e, i) => (
            <Card key={i} className="gap-1 py-4">
              <CardContent className="space-y-1">
                <p className="flex items-start justify-between gap-2 font-medium">
                  {e.en} <SpeakButton text={e.en} />
                </p>
                <p className="text-sm text-muted-foreground">{e.id}</p>
                {e.note && <p className="text-xs text-primary dark:text-brand-lavender">{e.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    case "vocabulary":
      return (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kata</TableHead>
                <TableHead>Arti</TableHead>
                <TableHead className="hidden md:table-cell">Contoh</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as { word: string; pos: string; ipa?: string; meaning: string; example: string }[]).map((v) => (
                <TableRow key={v.word}>
                  <TableCell>
                    <p className="font-semibold">{v.word}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.pos}
                      {v.ipa && ` · ${v.ipa}`}
                    </p>
                  </TableCell>
                  <TableCell>{v.meaning}</TableCell>
                  <TableCell className="hidden text-sm whitespace-normal text-muted-foreground md:table-cell">{v.example}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <SpeakButton text={v.word} />
                      <SaveWordButton word={v.word} meaning={v.meaning} example={v.example} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    case "grammar":
      return (
        <div className="space-y-3">
          {(items as { pattern: string; example: string; note?: string }[]).map((g, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <p className="font-mono text-sm font-semibold text-primary dark:text-brand-lavender">{g.pattern}</p>
              <p className="mt-1">{g.example}</p>
              {g.note && <p className="mt-1 text-sm text-muted-foreground">{g.note}</p>}
            </div>
          ))}
        </div>
      );
    case "mistakes":
      return (
        <div className="space-y-3">
          {(items as { wrong: string; right: string; why: string }[]).map((m, i) => (
            <div key={i} className="grid gap-2 rounded-xl border p-4 md:grid-cols-2">
              <p className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-label="Salah" /> <span className="line-through decoration-destructive/50">{m.wrong}</span>
              </p>
              <p className="flex items-start gap-2 text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-label="Benar" /> {m.right}
              </p>
              <p className="text-sm text-muted-foreground md:col-span-2">{m.why}</p>
            </div>
          ))}
        </div>
      );
    case "guided_practice":
    case "independent_practice":
      return <LessonPractice lessonId={lessonId} questionIds={data.questionIds ?? []} guided={kind === "guided_practice"} />;
    case "mini_assessment":
      return (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mini quiz menilai pemahamanmu tentang lesson ini. Raih minimal 70% untuk menyelesaikan lesson (≥ 90% = <strong>Mastered</strong>). Pembahasan ditampilkan setelah quiz dikumpulkan.
            </p>
            <CompleteAndQuiz lessonId={lessonId} quizId={quizId} materialDone={materialDone} status={status} />
          </CardContent>
        </Card>
      );
    case "review_cards":
      return <ReviewCards cards={items as { front: string; back: string }[]} />;
    case "completion":
      return (
        <Alert tone={status && status !== "in_progress" ? "success" : "info"} icon={CheckCircle2} title={status && status !== "in_progress" ? "Lesson selesai" : "Untuk menyelesaikan lesson ini"}>
          {body || criteria}
        </Alert>
      );
    default:
      return body ? <Markdown>{body}</Markdown> : null;
  }
}
