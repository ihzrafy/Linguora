import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleHelp, MinusCircle, PlusCircle, XCircle } from "lucide-react";
import { BookmarkButton } from "@/components/learning/lesson-client";
import { StartAttemptButton } from "@/components/questions/start-button";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GRAMMAR_CATEGORY } from "@/lib/labels";

export const metadata: Metadata = { title: "Grammar" };

export default async function GrammarTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireViewer(`/app/grammar/${slug}`);
  const supabase = await createClient();
  const { data: topic } = await supabase.from("grammar_topics").select("*, levels(code)").eq("slug", slug).maybeSingle();
  if (!topic) notFound();
  // questions is staff-only under RLS: resolve the topic's question ids server-side, then read the learner's own answers.
  const [{ data: lessons }, { data: bookmark }, { data: topicQuestions }] = await Promise.all([
    topic.related_lesson_ids.length ? supabase.from("lessons").select("slug, title").in("id", topic.related_lesson_ids) : Promise.resolve({ data: [] }),
    supabase.from("bookmarks").select("id").eq("user_id", viewer.id).eq("target_type", "grammar").eq("target_id", topic.id).maybeSingle(),
    createAdminClient().from("questions").select("id").eq("grammar_topic_id", topic.id),
  ]);
  const questionIds = (topicQuestions ?? []).map((q) => q.id);
  const { data: answers } = questionIds.length
    ? await supabase.from("assessment_answers").select("is_correct").eq("user_id", viewer.id).in("question_id", questionIds).not("is_correct", "is", null)
    : { data: [] };
  const formulas = (topic.formulas ?? []) as { label: string; pattern: string }[];
  const examples = (topic.examples ?? {}) as { positive?: string[]; negative?: string[]; interrogative?: string[] };
  const mistakes = (topic.mistakes ?? []) as { wrong: string; right: string; why: string }[];
  const answered = answers?.length ?? 0;
  const mastery = answered ? Math.round(((answers ?? []).filter((a) => a.is_correct).length / answered) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/app/grammar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Grammar reference
      </Link>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Badge>{(topic.levels as { code: string } | null)?.code}</Badge>
          <Badge variant="outline">{GRAMMAR_CATEGORY[topic.category]}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{topic.title}</h1>
        <BookmarkButton targetType="grammar" targetId={topic.id} title={topic.title} href={`/app/grammar/${topic.slug}`} initial={Boolean(bookmark)} />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <Card>
          <CardContent>
            <Markdown>{topic.explanation_md}</Markdown>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Progress mastery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mastery === null ? <p className="text-sm text-muted-foreground">Kerjakan latihan untuk melihat penguasaanmu.</p> : (
              <>
                <p className="text-3xl font-bold">{mastery}%</p>
                <Progress value={mastery} aria-label={`Mastery ${mastery}%`} />
                <p className="text-xs text-muted-foreground">Dari {answered} jawaban pada latihan topik ini.</p>
              </>
            )}
            <StartAttemptButton target={{ kind: "practice", mode: "source", source: { kind: "grammar", id: topic.id } }} hrefFor="/app/practice" className="w-full">
              Kerjakan latihan
            </StartAttemptButton>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Formula</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {formulas.map((f) => (
            <div key={f.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{f.label}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-primary dark:text-brand-lavender">{f.pattern}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { key: "positive", label: "Positif", icon: PlusCircle },
          { key: "negative", label: "Negatif", icon: MinusCircle },
          { key: "interrogative", label: "Tanya", icon: CircleHelp },
        ].map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-4 text-primary" /> {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {(examples[key as keyof typeof examples] ?? []).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      {topic.comparison_md && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Perbandingan dengan konsep yang mirip</h2>
          <Card>
            <CardContent>
              <Markdown>{topic.comparison_md}</Markdown>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kesalahan umum</h2>
        {mistakes.map((m, i) => (
          <div key={i} className="grid gap-2 rounded-xl border p-4 md:grid-cols-2">
            <p className="flex gap-2 text-destructive">
              <XCircle className="mt-0.5 size-4 shrink-0" aria-label="Salah" /> {m.wrong}
            </p>
            <p className="flex gap-2 text-success">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-label="Benar" /> {m.right}
            </p>
            <p className="text-sm text-muted-foreground md:col-span-2">{m.why}</p>
          </div>
        ))}
      </section>

      {Boolean(lessons?.length) && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Lesson terkait</h2>
          <ul className="flex flex-wrap gap-2">
            {lessons!.map((l) => (
              <li key={l.slug}>
                <Link href={`/app/lesson/${l.slug}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
