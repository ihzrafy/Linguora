import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, FilePen, PenLine } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiEnabled } from "@/lib/ai/tutor";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requestAiFeedbackAction } from "./actions";
import { WritingEditor } from "./editor";

export const metadata: Metadata = { title: "Writing Lab" };

const KIND: Record<string, string> = {
  sentence: "Kalimat",
  paragraph: "Paragraf",
  email_formal: "Email formal",
  email_informal: "Email informal",
  essay: "Esai",
  opinion: "Opini",
  summary: "Ringkasan",
  correction: "Koreksi",
};
const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "" },
  submitted: { label: "Menunggu penilaian", className: "bg-warning/20 text-warning-foreground dark:text-warning" },
  reviewed: { label: "Sudah dinilai", className: "bg-success text-success-foreground" },
};

type Criterion = { key: string; label: string; description: string; max: number };

export default async function WritingPage({ searchParams }: { searchParams: Promise<{ prompt?: string; submission?: string; level?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/writing");
  const supabase = await createClient();
  const [{ data: rubric }, { data: submissions }] = await Promise.all([
    supabase.from("writing_rubrics").select("criteria").eq("key", "general-writing").maybeSingle(),
    supabase.from("writing_submissions").select("id, title, status, word_count, updated_at, writing_prompts(title)").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(20),
  ]);
  const criteria = (rubric?.criteria ?? []) as Criterion[];

  // Existing submission (draft → editor, submitted/reviewed → read-only result).
  if (sp.submission) {
    const { data: s } = await supabase.from("writing_submissions").select("*, writing_prompts(id, title, instructions_md, min_words, max_words)").eq("id", sp.submission).eq("user_id", viewer.id).maybeSingle();
    if (s) {
      const prompt = s.writing_prompts as { id: string; title: string; instructions_md: string; min_words: number; max_words: number } | null;
      const ai = (s.ai_feedback as { text?: string } | null)?.text ?? null;
      return (
        <div className="mx-auto max-w-3xl space-y-6">
          <Back />
          <PageHeader eyebrow={STATUS[s.status].label} title={s.title || prompt?.title || "Tulisan bebas"} />
          {prompt && (
            <Card>
              <CardContent>
                <Markdown>{prompt.instructions_md}</Markdown>
              </CardContent>
            </Card>
          )}
          {s.status === "draft" ? (
            <WritingEditor submissionId={s.id} promptId={prompt?.id ?? null} initialTitle={s.title ?? ""} initialContent={s.content} minWords={prompt?.min_words ?? 20} maxWords={prompt?.max_words ?? 400} criteria={criteria} aiEnabled={aiEnabled()} aiFeedback={ai} requestAiFeedback={requestAiFeedbackAction} />
          ) : (
            <Result submission={s} criteria={criteria} ai={ai} />
          )}
        </div>
      );
    }
  }

  if (sp.prompt) {
    const { data: p } = await supabase.from("writing_prompts").select("*, levels(code)").eq("slug", sp.prompt).maybeSingle();
    if (p) {
      return (
        <div className="mx-auto max-w-3xl space-y-6">
          <Back />
          <PageHeader eyebrow={`${(p.levels as { code: string }).code} · ${KIND[p.kind]}`} title={p.title} />
          <Card>
            <CardContent>
              <Markdown>{p.instructions_md}</Markdown>
              <p className="mt-2 text-xs text-muted-foreground">
                Target {p.min_words}–{p.max_words} kata
              </p>
            </CardContent>
          </Card>
          <WritingEditor submissionId={null} promptId={p.id} initialTitle="" initialContent="" minWords={p.min_words} maxWords={p.max_words} criteria={criteria} aiEnabled={aiEnabled()} aiFeedback={null} requestAiFeedback={requestAiFeedbackAction} />
        </div>
      );
    }
  }

  const [{ data: levels }, { data: unlocks }, { data: prompts }] = await Promise.all([
    supabase.from("levels").select("code").order("sort_order"),
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id),
    supabase.from("writing_prompts").select("slug, title, kind, min_words, max_words, level_id, levels(code, sort_order)").eq("status", "published"),
  ]);
  const open = new Set((unlocks ?? []).map((u) => u.level_id));
  const list = (prompts ?? [])
    .filter((p) => !sp.level || (p.levels as { code: string }).code === sp.level)
    .sort((a, b) => (a.levels as { sort_order: number }).sort_order - (b.levels as { sort_order: number }).sort_order);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Writing Lab" title="Writing" description="Tulis kalimat, paragraf, email, esai, opini, atau ringkasan. Draft tersimpan otomatis dan dinilai reviewer dengan rubrik 5 kriteria." />
      <div className="flex flex-wrap gap-1.5 text-sm">
        <Link href="/app/writing" className={cn("rounded-full border px-3 py-1", !sp.level ? "border-primary bg-primary/10" : "hover:bg-muted")}>
          Semua
        </Link>
        {(levels ?? []).map((l) => (
          <Link key={l.code} href={`/app/writing?level=${l.code}`} className={cn("rounded-full border px-3 py-1", sp.level === l.code ? "border-primary bg-primary/10" : "hover:bg-muted")}>
            {l.code}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const locked = !open.has(p.level_id);
          const body = (
            <div className={cn("h-full rounded-2xl border bg-card p-4", locked ? "opacity-60" : "hover:border-primary/50")}>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{(p.levels as { code: string }).code}</Badge>
                <Badge variant="outline">{KIND[p.kind]}</Badge>
                {locked && <Badge variant="secondary">Level terkunci</Badge>}
              </div>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                <PenLine className="size-4 text-primary" /> {p.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.min_words}–{p.max_words} kata
              </p>
            </div>
          );
          return locked ? <div key={p.slug}>{body}</div> : <Link key={p.slug} href={`/app/writing?prompt=${p.slug}`}>{body}</Link>;
        })}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tulisanku</h2>
        {!submissions?.length ? (
          <EmptyState icon={FilePen} title="Belum ada tulisan" description="Pilih prompt di atas untuk mulai menulis." className="py-8" />
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {submissions.map((s) => (
              <li key={s.id}>
                <Link href={`/app/writing?submission=${s.id}`} className="flex items-center justify-between gap-2 p-4 hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.title || (s.writing_prompts as { title: string } | null)?.title || "Tulisan bebas"}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.word_count} kata · {new Date(s.updated_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </span>
                  <Badge variant="outline" className={STATUS[s.status].className}>
                    {s.status === "reviewed" ? <CheckCircle2 className="size-3" /> : s.status === "submitted" ? <Clock className="size-3" /> : null}
                    {STATUS[s.status].label}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Back() {
  return (
    <Link href="/app/writing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Writing Lab
    </Link>
  );
}

function Result({
  submission,
  criteria,
  ai,
}: {
  submission: { content: string; word_count: number; rubric_scores: unknown; reviewer_feedback: string | null; self_assessment: unknown; status: string; reviewed_at: string | null };
  criteria: Criterion[];
  ai: string | null;
}) {
  const scores = (submission.rubric_scores ?? {}) as Record<string, number>;
  const self = (submission.self_assessment ?? {}) as Record<string, number>;
  const total = criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const max = criteria.reduce((s, c) => s + c.max, 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground">{submission.word_count} kata</p>
          <p className="mt-2 leading-7 whitespace-pre-wrap">{submission.content}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{submission.status === "reviewed" ? `Penilaian reviewer: ${total}/${max}` : "Menunggu penilaian reviewer"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-hidden rounded-xl border text-sm">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Kriteria</th>
                  <th className="px-3 py-2 text-right">Penilaian diri</th>
                  <th className="px-3 py-2 text-right">Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c.key} className="border-t">
                    <td className="px-3 py-2">{c.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{self[c.key] ?? "–"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{scores[c.key] ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {submission.reviewer_feedback && (
            <div className="rounded-xl bg-accent/50 p-3 text-sm">
              <p className="mb-1 font-semibold">Feedback reviewer</p>
              <p className="whitespace-pre-wrap">{submission.reviewer_feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
      {ai && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback AI awal (dapat keliru)</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown className="text-sm">{ai}</Markdown>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
