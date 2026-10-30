"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, History, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { gradePreviewAction, previewQuestionAction, restoreVersionAction, saveQuestionAction, templateAction } from "@/app/admin/question-actions";
import { hasAnswer, QuestionRenderer, type Feedback } from "@/components/questions/question-renderer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPES } from "@/lib/content/schema";
import { TYPE_LABEL } from "@/lib/labels";
import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";

type Opt = { value: string; label: string };
type Meta = { levelId: string; lessonId: string; unitId: string; passageId: string; listeningId: string; grammarTopicId: string; status: string };

export function QuestionEditor({
  id,
  initialJson,
  initialMeta,
  options,
  versions,
  canPublish,
}: {
  id: string | null;
  initialJson: string;
  initialMeta: Meta;
  options: { levels: Opt[]; lessons: Opt[]; units: Opt[]; passages: Opt[]; listening: Opt[]; grammar: Opt[] };
  versions: { id: string; version: number; note: string | null; created_at: string }[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [json, setJson] = useState(initialJson);
  const [meta, setMeta] = useState(initialMeta);
  const [preview, setPreview] = useState<ClientQuestion | null>(null);
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const currentType = (() => {
    try {
      return (JSON.parse(json) as { type?: string }).type ?? "";
    } catch {
      return "";
    }
  })();

  const runPreview = () =>
    start(async () => {
      setFeedback(null);
      setResponse(null);
      const res = await previewQuestionAction(json);
      if (!res.ok) return void setError(res.error);
      setError(null);
      setPreview(res.data.question);
    });

  const select = (key: keyof Meta, label: string, opts: Opt[], required = false) => (
    <div className="space-y-1">
      <Label htmlFor={`m-${key}`}>{label}</Label>
      <NativeSelect id={`m-${key}`} value={meta[key]} onChange={(e) => setMeta({ ...meta, [key]: e.target.value })} required={required}>
        {!required && <option value="">—</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konten soal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="tpl">Template tipe soal</Label>
                <NativeSelect
                  id="tpl"
                  value={currentType}
                  onChange={(e) =>
                    start(async () => {
                      const res = await templateAction(e.target.value);
                      if (res.ok) setJson(res.data);
                    })
                  }
                >
                  {!currentType && <option value="">—</option>}
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]} ({t})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <p className="pb-2 text-xs text-muted-foreground">Mengganti template menimpa isi editor. Format mengikuti content/AUTHORING.md.</p>
            </div>
            <Textarea aria-label="JSON soal" rows={22} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-xs" spellCheck={false} />
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penempatan & status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {select("levelId", "Level", options.levels, true)}
            {select("status", "Status", [
              { value: "draft", label: "Draft" },
              { value: "in_review", label: "In review" },
              ...(canPublish ? [{ value: "published", label: "Published" }, { value: "archived", label: "Archived" }] : []),
            ], true)}
            {select("lessonId", "Lesson", options.lessons)}
            {select("unitId", "Unit (untuk unit test)", options.units)}
            {select("passageId", "Reading passage", options.passages)}
            {select("listeningId", "Listening material", options.listening)}
            {select("grammarTopicId", "Topik grammar", options.grammar)}
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveQuestionAction(json, {
                  id,
                  levelId: meta.levelId,
                  lessonId: meta.lessonId || null,
                  unitId: meta.unitId || null,
                  passageId: meta.passageId || null,
                  listeningId: meta.listeningId || null,
                  grammarTopicId: meta.grammarTopicId || null,
                  status: meta.status as "draft",
                });
                if (!res.ok) return void setError(res.error);
                setError(null);
                toast.success("Soal disimpan");
                if (!id) router.replace(`/admin/questions/${res.data.id}/edit`);
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
          </Button>
          <Button variant="outline" onClick={runPreview} disabled={pending}>
            <Eye /> Preview & uji jawaban
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview pelajar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <p className="text-sm text-muted-foreground">Klik “Preview” untuk melihat soal seperti yang ditampilkan kepada pelajar, lalu uji apakah kunci jawaban sudah benar.</p>
            ) : (
              <>
                <QuestionRenderer question={preview} value={response} onChange={setResponse} disabled={Boolean(feedback)} feedback={feedback} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!hasAnswer(preview, response) || Boolean(feedback) || pending}
                    onClick={() =>
                      start(async () => {
                        const res = await gradePreviewAction(json, response);
                        if (!res.ok) return void setError(res.error);
                        setFeedback(res.data);
                      })
                    }
                  >
                    Periksa
                  </Button>
                  {feedback && (
                    <Button size="sm" variant="ghost" onClick={() => (setFeedback(null), setResponse(null))}>
                      Ulangi
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Riwayat versi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!versions.length ? (
                <p className="text-sm text-muted-foreground">Belum ada versi sebelumnya.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                      <span>
                        v{v.version} · {v.note ?? "edit"}
                        <span className="block text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </span>
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost">
                            <RotateCcw /> Rollback
                          </Button>
                        }
                        title={`Kembalikan ke versi ${v.version}?`}
                        description="Versi saat ini akan disimpan dulu sebagai snapshot baru, sehingga rollback dapat dibatalkan."
                        confirmLabel="Rollback"
                        onConfirm={async () => {
                          const res = await restoreVersionAction(v.id);
                          if (!res.ok) return void toast.error(res.error);
                          toast.success("Versi dipulihkan");
                          router.refresh();
                          window.location.reload();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
