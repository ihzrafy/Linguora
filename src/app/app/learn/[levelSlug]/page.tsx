import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Target } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { PathMap } from "@/components/learning/path-map";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { getCoursePath } from "@/lib/learning/lessons";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ levelSlug: string }> }): Promise<Metadata> {
  const { levelSlug } = await params;
  return { title: `Level ${levelSlug.toUpperCase()}` };
}

export default async function LevelPage({ params }: { params: Promise<{ levelSlug: string }> }) {
  const { levelSlug } = await params;
  const viewer = await requireViewer(`/app/learn/${levelSlug}`);
  const supabase = await createClient();
  const { data: level } = await supabase.from("levels").select("*").eq("slug", levelSlug).maybeSingle();
  if (!level) notFound();

  const [{ data: unlock }, { data: courses }, { data: exam }, { data: cert }] = await Promise.all([
    supabase.from("user_level_unlocks").select("source").eq("user_id", viewer.id).eq("level_id", level.id).maybeSingle(),
    supabase.from("courses").select("id, slug, title, description, is_core, learning_tracks(name)").eq("level_id", level.id).eq("status", "published").order("sort_order"),
    supabase.from("exams").select("id, title").eq("level_id", level.id).eq("kind", "level_exam").eq("status", "published").maybeSingle(),
    supabase.from("certificates").select("id").eq("user_id", viewer.id).eq("level_id", level.id).maybeSingle(),
  ]);
  const core = courses?.find((c) => c.is_core);
  const extra = (courses ?? []).filter((c) => !c.is_core);
  const units = core ? await getCoursePath(core.id) : [];
  const { data: examUnlocked } = exam ? await createAdminClient().rpc("level_exam_unlocked_for", { p_user: viewer.id, p_level: level.id }) : { data: false };

  return (
    <div className="space-y-8">
      <Link href="/app/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Semua level
      </Link>
      <PageHeader eyebrow={`Level ${level.code} · ${level.name_id}`} title={`${level.code} — ${level.name}`} description={level.description} />

      {!unlock && (
        <Alert tone="warning" icon={Lock} title="Level ini belum terbuka">
          Lulus ujian level sebelumnya, atau ikuti{" "}
          <Link href="/app/placement-test" className="font-medium text-primary underline">
            placement test
          </Link>{" "}
          jika kamu merasa sudah menguasai level sebelumnya. Kamu tetap bisa melihat daftar materinya.
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-primary" /> Tujuan pembelajaran
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {level.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Bahasa penjelasan</p>
            <p>{level.explanation_language}</p>
          </div>
        </CardContent>
      </Card>

      {units.length ? (
        <PathMap
          units={units}
          exam={exam ? { href: `/app/exam/${exam.id}`, unlocked: Boolean(examUnlocked), passed: Boolean(cert), title: exam.title } : null}
        />
      ) : (
        <EmptyState title="Materi level ini sedang disiapkan" description="Unit dan lesson akan muncul di sini setelah dipublikasikan oleh tim kurikulum." />
      )}

      {extra.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Course tambahan</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {extra.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{(c.learning_tracks as { name: string } | null)?.name}</p>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/course/${c.slug}`}>Buka course</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
