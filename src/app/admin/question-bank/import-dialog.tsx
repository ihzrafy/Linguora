"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { importQuestionsAction } from "@/app/admin/question-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function ImportDialog() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [status, setStatus] = useState<"draft" | "in_review">("draft");
  const [report, setReport] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog onOpenChange={() => setReport(null)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import soal</DialogTitle>
          <DialogDescription>
            JSON: array soal format authoring + <code>level</code> (lihat content/AUTHORING.md). CSV: kolom <code>level,type,category,topic,difficulty,stage,prompt,options,answer,explanation</code> dengan opsi dipisah “|”. Semua baris divalidasi; soal disimpan sebagai draft/in review.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(["json", "csv"] as const).map((f) => (
            <label key={f} className="flex items-center gap-1.5">
              <input type="radio" checked={format === f} onChange={() => setFormat(f)} /> {f.toUpperCase()}
            </label>
          ))}
          <NativeSelect size="sm" value={status} onChange={(e) => setStatus(e.target.value as "draft")} aria-label="Status awal">
            <option value="draft">Simpan sebagai draft</option>
            <option value="in_review">Kirim ke review</option>
          </NativeSelect>
          <label className="ml-auto cursor-pointer text-primary underline">
            Pilih berkas
            <input
              type="file"
              accept=".json,.csv"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFormat(f.name.endsWith(".csv") ? "csv" : "json");
                setText(await f.text());
              }}
            />
          </label>
        </div>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" aria-label="Isi impor" />
        {report && (
          <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              {report.imported} soal diimpor, {report.failed} gagal.
            </p>
            {report.errors.map((e) => (
              <p key={e} className="text-destructive">
                {e}
              </p>
            ))}
          </div>
        )}
        <Button
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              const res = await importQuestionsAction(text, format, status);
              if (!res.ok) return void toast.error(res.error);
              setReport(res.data);
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Validasi & import
        </Button>
      </DialogContent>
    </Dialog>
  );
}
