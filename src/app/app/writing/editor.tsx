"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, CloudUpload, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/questions/normalize";
import { cn } from "@/lib/utils";
import { saveDraftAction, submitWritingAction } from "./actions";

type Criterion = { key: string; label: string; description: string; max: number };

export function WritingEditor({
  submissionId,
  promptId,
  initialTitle,
  initialContent,
  minWords,
  maxWords,
  criteria,
  aiEnabled,
  aiFeedback,
  requestAiFeedback,
}: {
  submissionId: string | null;
  promptId: string | null;
  initialTitle: string;
  initialContent: string;
  minWords: number;
  maxWords: number;
  criteria: Criterion[];
  aiEnabled: boolean;
  aiFeedback: string | null;
  requestAiFeedback?: (id: string) => Promise<{ ok: true; data: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState(submissionId);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [self, setSelf] = useState<Record<string, number>>(Object.fromEntries(criteria.map((c) => [c.key, 3])));
  const [feedback, setFeedback] = useState(aiFeedback);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const words = countWords(content);

  // Autosave 1.2s after typing stops.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await saveDraftAction({ id, promptId, title, content });
      if (res.ok) {
        setId(res.data.id);
        setStatus("saved");
      } else setStatus("error");
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [title, content]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="w-title">Judul (opsional)</Label>
        <Input id="w-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="w-content">Tulisanmu</Label>
          <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
            {status === "saving" && (
              <>
                <Loader2 className="size-3 animate-spin" /> Menyimpan…
              </>
            )}
            {status === "saved" && (
              <>
                <CloudUpload className="size-3" /> Draft tersimpan
              </>
            )}
            {status === "error" && <span className="text-destructive">Gagal menyimpan draft</span>}
          </span>
        </div>
        <Textarea id="w-content" rows={14} value={content} onChange={(e) => setContent(e.target.value)} className="text-base leading-7" />
        <p className={cn("text-xs", words < minWords || words > maxWords ? "text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
          {words} kata · target {minWords}–{maxWords}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border p-4">
        <p className="text-sm font-semibold">Penilaian diri dengan rubrik (0–5)</p>
        {criteria.map((c) => (
          <div key={c.key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </div>
            <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
              {Array.from({ length: c.max + 1 }, (_, n) => (
                <button key={n} type="button" role="radio" aria-checked={self[c.key] === n} onClick={() => setSelf((s) => ({ ...s, [c.key]: n }))} className={cn("size-8 rounded-md border text-xs", self[c.key] === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger={
            <Button disabled={!id || words < 5 || pending}>
              <Send /> Kirim untuk dinilai reviewer
            </Button>
          }
          title="Kirim tulisan?"
          description="Setelah dikirim, tulisan tidak dapat diubah. Reviewer akan menilai dengan rubrik dan memberi feedback."
          confirmLabel="Kirim"
          onConfirm={async () => {
            if (!id) return;
            const saved = await saveDraftAction({ id, promptId, title, content });
            if (!saved.ok) return void toast.error(saved.error);
            const res = await submitWritingAction({ id, selfAssessment: self });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Tulisan dikirim untuk dinilai");
            router.push(`/app/writing?submission=${id}`);
            router.refresh();
          }}
        />
        {aiEnabled && requestAiFeedback && (
          <Button
            variant="outline"
            disabled={!id || words < 10 || pending}
            onClick={() =>
              start(async () => {
                if (!id) return;
                await saveDraftAction({ id, promptId, title, content });
                const res = await requestAiFeedback(id);
                if (!res.ok) return void toast.error(res.error);
                setFeedback(res.data);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Bot />} Feedback awal dari AI
          </Button>
        )}
      </div>
      {!aiEnabled && <p className="text-xs text-muted-foreground">Feedback AI tidak aktif karena penyedia AI belum dikonfigurasi. Penilaian tetap tersedia melalui reviewer.</p>}
      {feedback && (
        <div className="space-y-2 rounded-2xl border border-info/30 bg-info/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4" /> Feedback AI (dapat keliru — bukan penilaian resmi)
          </p>
          <Markdown className="text-sm">{feedback}</Markdown>
        </div>
      )}
      {status === "saved" && words >= minWords && (
        <p className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="size-3" /> Panjang tulisan sudah memenuhi target minimum.
        </p>
      )}
    </div>
  );
}
