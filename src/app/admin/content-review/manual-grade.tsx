"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gradeAnswerAction } from "@/app/admin/grading-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ManualGradeForm({ answerId, maxPoints }: { answerId: string; maxPoints: number }) {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await gradeAnswerAction(answerId, points, feedback);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Nilai disimpan");
          router.refresh();
        });
      }}
    >
      <Label htmlFor={`pts-${answerId}`}>Poin (0–{maxPoints})</Label>
      <Input id={`pts-${answerId}`} type="number" min={0} max={maxPoints} step={0.5} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
      <Textarea rows={3} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback untuk pelajar" aria-label="Feedback" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Simpan nilai
      </Button>
    </form>
  );
}
