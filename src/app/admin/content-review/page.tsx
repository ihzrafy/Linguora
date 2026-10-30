import type { Metadata } from "next";
import Link from "next/link";
import { BulkStatusBar } from "@/components/admin/bulk-status";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { ViewTabs } from "@/components/admin/view-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ManualGradeForm } from "./manual-grade";

export const metadata: Metadata = { title: "Admin · Review konten" };

export default async function ContentReviewPage({ searchParams }: { searchParams: Promise<ResourceSearchParams & { view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "blog" ? "blog" : sp.view === "answers" ? "answers" : "queue";
  const viewer = await requirePermission("content.read", "/admin/content-review");
  const tabs = (
    <ViewTabs
      basePath="/admin/content-review"
      current={view}
      views={[
        { key: "queue", label: "Antrean review" },
        { key: "answers", label: "Jawaban manual" },
        { key: "blog", label: "Blog" },
      ]}
    />
  );
  if (view === "blog")
    return (
      <div className="space-y-4">
        {!sp.edit && tabs}
        <ResourcePage resourceKey="blog" sp={sp} basePath="/admin/content-review" />
      </div>
    );

  const supabase = await createClient();
  if (view === "answers") {
    const canGrade = viewer.permissions.has("grading.manage");
    const { data: answers } = canGrade
      ? await supabase.from("assessment_answers").select("id, response, max_points, answered_at, questions(prompt, type, explanation)").eq("needs_manual_grading", true).order("answered_at").limit(30)
      : { data: [] };
    return (
      <div className="space-y-4">
        {tabs}
        <PageHeader title="Jawaban yang perlu dinilai manual" description="Esai dan respons speaking dalam assessment dinilai reviewer; skor attempt diperbarui otomatis setelah semua jawaban dinilai." />
        {!canGrade ? (
          <p className="text-sm text-muted-foreground">Peran kamu tidak memiliki izin penilaian.</p>
        ) : !answers?.length ? (
          <EmptyState title="Tidak ada jawaban yang menunggu" />
        ) : (
          answers.map((a) => {
            const q = a.questions as { prompt: string; type: string; explanation: string } | null;
            const r = (a.response ?? {}) as { text?: string; transcript?: string };
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{q?.prompt}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{r.text ?? r.transcript ?? "(kosong)"}</p>
                  <ManualGradeForm answerId={a.id} maxPoints={Number(a.max_points ?? 1)} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  const [{ data: lessons }, { data: questions }] = await Promise.all([
    supabase.from("lessons").select("id, slug, title, updated_at").eq("status", "in_review").order("updated_at").limit(100),
    supabase.from("questions").select("id, external_key, prompt, type, updated_at, levels(code)").eq("status", "in_review").order("updated_at").limit(200),
  ]);
  const canPublish = viewer.permissions.has("content.publish");
  return (
    <div className="space-y-6">
      {tabs}
      <PageHeader title="Antrean review" description="Content editor mengirim konten ke status “in review”. Reviewer/admin memeriksa, lalu memublikasikan atau mengembalikannya ke draft." />
      <section className="space-y-2">
        <h2 className="font-semibold">Lesson ({lessons?.length ?? 0})</h2>
        {canPublish && <BulkStatusBar resourceKey="lessons" formId="rv-lessons" />}
        {!lessons?.length ? (
          <p className="text-sm text-muted-foreground">Tidak ada lesson dalam review.</p>
        ) : (
          <ul id="rv-lessons" className="divide-y rounded-xl border bg-card text-sm">
            {lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3">
                {canPublish && <input type="checkbox" data-bulk value={l.id} aria-label={`Pilih ${l.title}`} />}
                <Link href={`/admin/lessons/${l.id}`} className="flex-1 hover:underline">
                  {l.title} <span className="font-mono text-xs text-muted-foreground">{l.slug}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Soal ({questions?.length ?? 0})</h2>
        {canPublish && <BulkStatusBar resourceKey="questions" formId="rv-questions" />}
        {!questions?.length ? (
          <p className="text-sm text-muted-foreground">Tidak ada soal dalam review.</p>
        ) : (
          <ul id="rv-questions" className="divide-y rounded-xl border bg-card text-sm">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center gap-3 p-3">
                {canPublish && <input type="checkbox" data-bulk value={q.id} aria-label="Pilih soal" />}
                <Link href={`/admin/questions/${q.id}/edit`} className="min-w-0 flex-1 truncate hover:underline">
                  [{(q.levels as { code: string } | null)?.code}] {q.prompt}
                </Link>
                <span className="text-xs text-muted-foreground">{q.type}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
