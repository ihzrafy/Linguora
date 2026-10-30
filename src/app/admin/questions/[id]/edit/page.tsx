import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionEditor } from "@/components/admin/question-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { questionEditorOptions } from "@/lib/admin/question-options";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Edit soal" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePermission("content.read", `/admin/questions/${id}/edit`);
  const supabase = await createClient();
  const { data: q } = await supabase.from("questions").select("*, question_answer_keys(authored)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const [options, { data: versions }, { data: stats }] = await Promise.all([
    questionEditorOptions(q.level_id),
    supabase.from("content_versions").select("id, version, note, created_at").eq("entity_type", "question").eq("entity_id", id).order("version", { ascending: false }).limit(20),
    supabase.from("assessment_answers").select("is_correct").eq("question_id", id).not("is_correct", "is", null).limit(5000),
  ]);
  const authored = (q.question_answer_keys as { authored: Record<string, unknown> } | null)?.authored ?? {};
  const answered = stats?.length ?? 0;
  const accuracy = answered ? Math.round(((stats ?? []).filter((s) => s.is_correct).length / answered) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bank soal"
        title="Edit soal"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">v{q.version}</Badge>
            <Badge variant="outline">{q.status}</Badge>
            <span className="font-mono text-xs">{q.external_key ?? q.id}</span>
            {accuracy !== null && (
              <span className="text-xs">
                · {answered} jawaban, akurasi {accuracy}%
              </span>
            )}
            {q.reviewed_at && <span className="text-xs">· direview {new Date(q.reviewed_at).toLocaleDateString("id-ID")}</span>}
          </span>
        }
      />
      <QuestionEditor
        id={q.id}
        initialJson={JSON.stringify(authored, null, 2)}
        initialMeta={{
          levelId: q.level_id,
          lessonId: q.lesson_id ?? "",
          unitId: q.unit_id ?? "",
          passageId: q.passage_id ?? "",
          listeningId: q.listening_id ?? "",
          grammarTopicId: q.grammar_topic_id ?? "",
          status: q.status,
        }}
        options={options}
        versions={versions ?? []}
        canPublish={viewer.permissions.has("content.publish")}
      />
    </div>
  );
}
