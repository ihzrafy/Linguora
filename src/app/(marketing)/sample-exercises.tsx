"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { hasAnswer, QuestionRenderer, type Feedback } from "@/components/questions/question-renderer";
import { Button } from "@/components/ui/button";
import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";
import { cn } from "@/lib/utils";
import { checkSampleAction } from "./sample-actions";

export function SampleExercises({ questions }: { questions: ClientQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, QuestionResponse>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [pending, start] = useTransition();
  if (!questions.length) return null;
  const q = questions[index];
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label="Contoh soal">
        {questions.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={cn("rounded-full border px-3 py-1 text-sm", i === index ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Soal {i + 1}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <QuestionRenderer
          key={q.id}
          question={q}
          value={values[q.id] ?? null}
          onChange={(v) => setValues((s) => ({ ...s, [q.id]: v }))}
          disabled={Boolean(feedback[q.id]) || pending}
          feedback={feedback[q.id]}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {!feedback[q.id] ? (
            <Button
              disabled={pending || !hasAnswer(q, values[q.id] ?? null)}
              onClick={() =>
                start(async () => {
                  const res = await checkSampleAction(q.id, values[q.id]);
                  if (!res.ok) return void toast.error(res.error);
                  setFeedback((f) => ({ ...f, [q.id]: res.data }));
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Periksa jawaban
            </Button>
          ) : index < questions.length - 1 ? (
            <Button onClick={() => setIndex(index + 1)}>Soal berikutnya</Button>
          ) : (
            <Button asChild>
              <Link href="/register">Lanjutkan belajar — daftar gratis</Link>
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Jawaban diperiksa oleh grading engine Linguora di server — sama seperti di aplikasi.</p>
    </div>
  );
}
