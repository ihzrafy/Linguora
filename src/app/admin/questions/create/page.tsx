import type { Metadata } from "next";
import { QuestionEditor } from "@/components/admin/question-editor";
import { PageHeader } from "@/components/shared/page-header";
import { questionEditorOptions } from "@/lib/admin/question-options";
import { questionTemplate } from "@/lib/admin/questions";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Soal baru" };

export default async function CreateQuestionPage({ searchParams }: { searchParams: Promise<{ level?: string; type?: string }> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("content.write", "/admin/questions/create");
  const base = await questionEditorOptions(null);
  const levelId = sp.level && base.levels.some((l) => l.value === sp.level) ? sp.level : base.levels[0]?.value ?? "";
  const options = await questionEditorOptions(levelId);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bank soal"
        title="Soal baru"
        description="Soal baru disimpan sebagai draft. Content editor mengirim soal ke review; reviewer/admin memublikasikannya. Pilih level di URL (?level=…) untuk memfilter daftar lesson dan unit."
      />
      <QuestionEditor
        id={null}
        initialJson={JSON.stringify(questionTemplate(sp.type ?? "single_choice"), null, 2)}
        initialMeta={{ levelId, lessonId: "", unitId: "", passageId: "", listeningId: "", grammarTopicId: "", status: "draft" }}
        options={options}
        versions={[]}
        canPublish={viewer.permissions.has("content.publish")}
      />
    </div>
  );
}
