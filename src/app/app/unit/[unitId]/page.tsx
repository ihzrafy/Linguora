import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Lock } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { StatusBadge } from "@/components/learning/path-map";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { getCoursePath } from "@/lib/learning/lessons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Unit" };

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  await requireViewer(`/app/unit/${unitId}`);
  const supabase = await createClient();
  const { data: unit } = await supabase.from("units").select("id, title, description, objectives, sort_order, course_id, courses(levels(code, slug))").eq("id", unitId).maybeSingle();
  if (!unit) notFound();
  const path = await getCoursePath(unit.course_id);
  const state = path.find((u) => u.id === unitId);
  const level = (unit.courses as { levels: { code: string; slug: string } } | null)?.levels;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={level ? `/app/learn/${level.slug}` : "/app/learn"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Level {level?.code}
      </Link>
      <PageHeader eyebrow={`Unit ${unit.sort_order}`} title={unit.title} description={unit.description} />
      {!state?.unlocked && (
        <Alert tone="warning" icon={Lock} title="Unit ini masih terkunci">
          Selesaikan semua lesson dan unit assessment di unit sebelumnya.
        </Alert>
      )}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-semibold">Tujuan unit</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {unit.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ol className="space-y-2">
        {state?.lessons.map((l) => (
          <li key={l.id}>
            {l.status === "locked" ? (
              <div className="flex items-center justify-between rounded-xl border p-4 opacity-70">
                <span>
                  {l.sort}. {l.title}
                </span>
                <StatusBadge status={l.status} />
              </div>
            ) : (
              <Link href={`/app/lesson/${l.slug}`} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-primary/50">
                <span className="font-medium">
                  {l.sort}. {l.title}
                </span>
                <StatusBadge status={l.status} />
              </Link>
            )}
          </li>
        ))}
      </ol>
      {state?.unitTestQuizId && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="size-6 text-primary" />
              <div>
                <p className="font-semibold">Unit assessment</p>
                <p className="text-sm text-muted-foreground">
                  {state.unitTestPassed ? "Sudah lulus." : state.lessonsDone ? "Semua lesson selesai — siap dikerjakan." : "Terbuka setelah semua lesson selesai."}
                </p>
              </div>
            </div>
            <Button asChild disabled={!state.lessonsDone}>
              {state.lessonsDone && state.unlocked ? <Link href={`/app/quiz/${state.unitTestQuizId}`}>Buka assessment</Link> : <span>Terkunci</span>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
