import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { BookmarkButton } from "@/components/learning/lesson-client";
import { StartAttemptButton } from "@/components/questions/start-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { GENRE_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ReadingText } from "../reading-text";

export const metadata: Metadata = { title: "Reading" };

export default async function PassagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireViewer(`/app/reading/${slug}`);
  const supabase = await createClient();
  const { data: p } = await supabase.from("reading_passages").select("*, levels(code)").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  const [{ data: unlock }, { data: bookmark }, { count }, { data: progress }] = await Promise.all([
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id).eq("level_id", p.level_id).maybeSingle(),
    supabase.from("bookmarks").select("id").eq("user_id", viewer.id).eq("target_type", "reading").eq("target_id", p.id).maybeSingle(),
    // questions is staff-only under RLS; count the same pool the practice session uses.
    createAdminClient().from("questions").select("id", { count: "exact", head: true }).eq("status", "published").not("stage", "in", "(exam,placement)").eq("passage_id", p.id),
    supabase.from("reading_progress").select("best_score").eq("user_id", viewer.id).eq("passage_id", p.id).maybeSingle(),
  ]);
  const glossary = (p.glossary ?? []) as { word: string; meaning: string }[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/app/reading" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Reading Lab
      </Link>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Badge>{(p.levels as { code: string }).code}</Badge>
          <Badge variant="outline">{GENRE_LABEL[p.genre]}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <p className="text-sm text-muted-foreground">
          {p.word_count} kata · ±{p.estimated_minutes} menit · {p.attribution}
        </p>
        <BookmarkButton targetType="reading" targetId={p.id} title={p.title} href={`/app/reading/${p.slug}`} initial={Boolean(bookmark)} />
      </div>
      {!unlock ? (
        <Alert tone="warning" icon={Lock} title="Bacaan ini berada di level yang belum terbuka">
          Lulus ujian level sebelumnya atau ikuti placement test.
        </Alert>
      ) : (
        <>
          <ReadingText body={p.body_md} glossary={glossary} passageId={p.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Glosarium</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {glossary.map((g) => (
                    <div key={g.word} className="contents">
                      <dt className="font-semibold">{g.word}</dt>
                      <dd className="text-muted-foreground">{g.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Kuis pemahaman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{count ?? 0} soal: ide utama, detail, inferensi, dan kosakata dalam konteks. Pembahasan muncul setelah setiap jawaban.</p>
                {progress?.best_score !== null && progress?.best_score !== undefined && <p>Skor terbaik: {Number(progress.best_score)}%</p>}
                <StartAttemptButton target={{ kind: "practice", mode: "source", source: { kind: "reading", id: p.id } }} hrefFor="/app/practice">
                  Mulai kuis
                </StartAttemptButton>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
