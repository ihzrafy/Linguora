import type { Metadata } from "next";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { ViewTabs } from "@/components/admin/view-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WritingGradeForm } from "./grading";

export const metadata: Metadata = { title: "Admin · Writing" };

export default async function WritingAdminPage({ searchParams }: { searchParams: Promise<ResourceSearchParams & { view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "prompts" ? "prompts" : sp.view === "grading" ? "grading" : "rubrics";
  const tabs = (
    <ViewTabs
      basePath="/admin/writing-rubrics"
      current={view}
      views={[
        { key: "rubrics", label: "Rubrik" },
        { key: "prompts", label: "Prompt writing" },
        { key: "grading", label: "Antrean penilaian" },
      ]}
    />
  );
  if (view !== "grading")
    return (
      <div className="space-y-4">
        {!sp.edit && tabs}
        <ResourcePage resourceKey={view === "prompts" ? "writing-prompts" : "rubrics"} sp={sp} basePath="/admin/writing-rubrics" />
      </div>
    );

  await requirePermission("grading.manage", "/admin/writing-rubrics?view=grading");
  const supabase = await createClient();
  const [{ data: rubric }, { data: queue }] = await Promise.all([
    supabase.from("writing_rubrics").select("criteria").eq("key", "general-writing").maybeSingle(),
    supabase.from("writing_submissions").select("id, title, content, word_count, submitted_at, self_assessment, writing_prompts(title, instructions_md, levels(code))").eq("status", "submitted").order("submitted_at").limit(20),
  ]);
  const criteria = (rubric?.criteria ?? []) as { key: string; label: string; description: string; max: number }[];
  return (
    <div className="space-y-4">
      {tabs}
      <PageHeader eyebrow="Penilaian manual" title="Antrean penilaian writing" description="Tulisan dinilai dengan rubrik 5 kriteria. Identitas pelajar tidak ditampilkan untuk mengurangi bias." />
      {!queue?.length ? (
        <EmptyState title="Tidak ada tulisan yang menunggu penilaian" />
      ) : (
        queue.map((s) => {
          const prompt = s.writing_prompts as { title: string; instructions_md: string; levels: { code: string } } | null;
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {prompt && <Badge>{prompt.levels.code}</Badge>} {s.title || prompt?.title || "Tulisan bebas"}
                  <span className="text-xs font-normal text-muted-foreground">
                    {s.word_count} kata · dikirim {new Date(s.submitted_at!).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  {prompt && <p className="text-xs text-muted-foreground">{prompt.instructions_md.slice(0, 300)}</p>}
                  <p className="rounded-xl bg-muted p-4 text-sm leading-6 whitespace-pre-wrap">{s.content}</p>
                </div>
                <WritingGradeForm submissionId={s.id} criteria={criteria} selfAssessment={(s.self_assessment ?? {}) as Record<string, number>} />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
