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
import { LISTENING_KIND_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DictationDrill, ListeningPlayer } from "../player";

export const metadata: Metadata = { title: "Listening" };

export default async function ListeningMaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireViewer(`/app/listening/${slug}`);
  const supabase = await createClient();
  const { data: m } = await supabase.from("listening_materials").select("*, levels(code)").eq("slug", slug).maybeSingle();
  if (!m) notFound();
  const [{ data: unlock }, { data: bookmark }, { count }] = await Promise.all([
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id).eq("level_id", m.level_id).maybeSingle(),
    supabase.from("bookmarks").select("id").eq("user_id", viewer.id).eq("target_type", "listening").eq("target_id", m.id).maybeSingle(),
    // questions is staff-only under RLS; count the same pool the practice session uses.
    createAdminClient().from("questions").select("id", { count: "exact", head: true }).eq("status", "published").not("stage", "in", "(exam,placement)").eq("listening_id", m.id),
  ]);
  const script = (m.script ?? []) as { speaker: string; text: string }[];
  const sentences = script.flatMap((l) => l.text.split(/(?<=[.!?])\s+/)).filter((s) => s.split(" ").length >= 4 && s.split(" ").length <= 16).slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/app/listening" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Listening Lab
      </Link>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Badge>{(m.levels as { code: string }).code}</Badge>
          <Badge variant="outline">{LISTENING_KIND_LABEL[m.kind]}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{m.title}</h1>
        <BookmarkButton targetType="listening" targetId={m.id} title={m.title} href={`/app/listening/${m.slug}`} initial={Boolean(bookmark)} />
      </div>
      {!unlock ? (
        <Alert tone="warning" icon={Lock} title="Materi ini berada di level yang belum terbuka" />
      ) : (
        <>
          <ListeningPlayer materialId={m.id} script={script} audioUrl={m.audio_url} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Listening comprehension</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{count ?? 0} soal tentang materi ini. Dengarkan dulu tanpa transkrip, lalu jawab.</p>
                <StartAttemptButton target={{ kind: "practice", mode: "source", source: { kind: "listening", id: m.id } }} hrefFor="/app/practice">
                  Mulai kuis
                </StartAttemptButton>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latihan dikte</CardTitle>
              </CardHeader>
              <CardContent>
                <DictationDrill lines={sentences} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
