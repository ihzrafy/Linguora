import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LessonEditor, type LessonEditorValue } from "@/components/admin/lesson-editor";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Edit lesson" };

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

export default async function LessonEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ unit?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requirePermission("content.read", `/admin/lessons/${id}`);
  const supabase = await createClient();
  const { data: units } = await supabase.from("units").select("id, slug, title").order("slug");
  let initial: LessonEditorValue | null = null;
  let unitId = sp.unit ?? units?.[0]?.id ?? "";
  let versions: { id: string; version: number; note: string | null; created_at: string }[] = [];
  let quizId: string | null = null;
  let questionCount = 0;

  if (id !== "new") {
    const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
    if (!lesson) notFound();
    const [{ data: sections }, { data: prereqs }, { data: vers }, { data: quiz }, { count }] = await Promise.all([
      supabase.from("lesson_sections").select("kind, title, body_md, data, sort_order").eq("lesson_id", id).order("sort_order"),
      supabase.from("lesson_prerequisites").select("prerequisite_lesson_id").eq("lesson_id", id),
      supabase.from("content_versions").select("id, version, note, created_at").eq("entity_type", "lesson").eq("entity_id", id).order("version", { ascending: false }).limit(20),
      supabase.from("quizzes").select("id").eq("lesson_id", id).eq("kind", "lesson_quiz").maybeSingle(),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("lesson_id", id),
    ]);
    unitId = lesson.unit_id;
    versions = vers ?? [];
    quizId = quiz?.id ?? null;
    questionCount = count ?? 0;
    initial = {
      unitId: lesson.unit_id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      objectives: lesson.objectives.join("\n"),
      completionCriteria: lesson.completion_criteria,
      estimatedMinutes: lesson.estimated_minutes,
      xpReward: lesson.xp_reward,
      status: lesson.status,
      publishAt: toLocalInput(lesson.publish_at),
      sections: (sections ?? []).map((s) => ({ kind: s.kind, title: s.title, body_md: s.body_md, data: s.data && Object.keys(s.data as object).length ? JSON.stringify(s.data, null, 2) : "" })),
      prerequisites: (prereqs ?? []).map((p) => p.prerequisite_lesson_id),
    };
  }
  const { data: siblings } = await supabase.from("lessons").select("id, title, sort_order").eq("unit_id", unitId).order("sort_order");

  return (
    <div className="space-y-6">
      <Link href="/admin/lessons" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Semua lesson
      </Link>
      <PageHeader
        eyebrow="Lesson"
        title={initial?.title || "Lesson baru"}
        description={
          id === "new" ? (
            "Lesson baru disimpan sebagai draft beserta mini quiz kosong. Tautkan soal ke lesson ini dari bank soal."
          ) : (
            <span>
              {questionCount} soal tertaut ·{" "}
              {quizId && (
                <Link href={`/admin/quizzes?edit=${quizId}`} className="text-primary underline">
                  atur mini quiz
                </Link>
              )}
            </span>
          )
        }
      />
      <LessonEditor
        id={id === "new" ? null : id}
        initial={initial}
        units={(units ?? []).map((u) => ({ value: u.id, label: `${u.slug} — ${u.title}` }))}
        siblings={(siblings ?? []).map((s) => ({ value: s.id, label: `${s.sort_order}. ${s.title}` }))}
        versions={versions}
        canPublish={viewer.permissions.has("content.publish")}
      />
    </div>
  );
}
