"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { gradeWritingAction } from "../grading-actions";

type Criterion = { key: string; label: string; description: string; max: number };

export function WritingGradeForm({ submissionId, criteria, selfAssessment }: { submissionId: string; criteria: Criterion[]; selfAssessment: Record<string, number> }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(criteria.map((c) => [c.key, Math.round(c.max / 2)])));
  const [feedback, setFeedback] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await gradeWritingAction(submissionId, scores, feedback);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Penilaian dikirim ke pelajar");
          router.refresh();
        });
      }}
    >
      {criteria.map((c) => (
        <div key={c.key} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted-foreground">
              {c.description} · penilaian diri: {selfAssessment[c.key] ?? "–"}
            </p>
          </div>
          <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
            {Array.from({ length: c.max + 1 }, (_, n) => (
              <button key={n} type="button" role="radio" aria-checked={scores[c.key] === n} onClick={() => setScores((s) => ({ ...s, [c.key]: n }))} className={cn("size-8 rounded-md border text-xs", scores[c.key] === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="space-y-1">
        <Label htmlFor={`fb-${submissionId}`}>Feedback untuk pelajar</Label>
        <Textarea id={`fb-${submissionId}`} rows={4} maxLength={5000} value={feedback} onChange={(e) => setFeedback(e.target.value)} required />
      </div>
      <Button type="submit" disabled={pending || !feedback.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />} Kirim penilaian
      </Button>
    </form>
  );
}
