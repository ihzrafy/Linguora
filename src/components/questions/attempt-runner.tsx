"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, CloudOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { answerPracticeAction, finishPracticeAction, saveResponseAction, submitAttemptAction } from "@/app/app/learning-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";
import { cn } from "@/lib/utils";
import { hasAnswer, QuestionRenderer, type Feedback } from "./question-renderer";

type Props = {
  attemptId: string;
  title: string;
  mode: "assessment" | "practice";
  questions: ClientQuestion[];
  saved: Record<string, QuestionResponse>;
  expiresAt: string | null;
  passThreshold: number | null;
};

const storageKey = (id: string) => `linguora:attempt:${id}`;

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AttemptRunner(props: Props) {
  return props.mode === "practice" ? <PracticeRunner {...props} /> : <AssessmentRunner {...props} />;
}

// ---------------------------------------------------------------------------
// Quizzes, unit tests, level exams, placement
// ---------------------------------------------------------------------------
function AssessmentRunner({ attemptId, title, questions, saved, expiresAt, passThreshold }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // Rendered client-only (see attempt-runner-client.tsx), so device storage can seed the state:
  // answers that never reached the server (e.g. connection lost) are restored and re-synced.
  const [initial] = useState(() => {
    let local: Record<string, QuestionResponse> = {};
    try {
      local = JSON.parse(localStorage.getItem(storageKey(attemptId)) ?? "{}");
    } catch {
      /* ignore corrupt storage */
    }
    const pending = Object.keys(local).filter((qid) => JSON.stringify(saved[qid]) !== JSON.stringify(local[qid]));
    return { responses: { ...saved, ...local }, pending };
  });
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(initial.responses);
  const [unsynced, setUnsynced] = useState<Set<string>>(() => new Set(initial.pending));
  const [submitting, startSubmit] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const submittedRef = useRef(false);

  const question = questions[index];
  const answered = questions.filter((q) => hasAnswer(q, responses[q.id] ?? null)).length;

  const persist = useCallback(
    (qid: string, value: QuestionResponse) => {
      clearTimeout(timers.current[qid]);
      timers.current[qid] = setTimeout(async () => {
        const res = await saveResponseAction(attemptId, qid, value).catch(() => null);
        setUnsynced((prev) => {
          const next = new Set(prev);
          if (res?.ok) next.delete(qid);
          else next.add(qid);
          return next;
        });
      }, 600);
    },
    [attemptId],
  );

  useEffect(() => {
    initial.pending.forEach((qid) => persist(qid, initial.responses[qid]));
  }, [initial, persist]);

  const change = (value: QuestionResponse) => {
    setResponses((prev) => {
      const next = { ...prev, [question.id]: value };
      try {
        localStorage.setItem(storageKey(attemptId), JSON.stringify(next));
      } catch {
        /* storage full or disabled */
      }
      return next;
    });
    setUnsynced((prev) => new Set(prev).add(question.id));
    persist(question.id, value);
  };

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      Object.values(timers.current).forEach(clearTimeout);
      const res = await submitAttemptAction(attemptId, responses);
      if (!res.ok) {
        submittedRef.current = false;
        toast.error(res.error);
        return;
      }
      localStorage.removeItem(storageKey(attemptId));
      router.replace(`/app/results/${attemptId}`);
      router.refresh();
    });
  }, [attemptId, responses, router]);

  // Countdown with auto-submit.
  const [remaining, setRemaining] = useState<number | null>(() =>
    expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null,
  );
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(t);
        toast.info("Waktu habis — jawaban dikumpulkan otomatis.");
        submit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, submit]);

  // Retry unsynced answers when the connection returns.
  useEffect(() => {
    const retry = () => unsynced.forEach((qid) => responses[qid] && persist(qid, responses[qid]));
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [unsynced, responses, persist]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              Soal {index + 1} dari {questions.length} · {answered} terjawab
              {passThreshold !== null && ` · lulus ≥ ${passThreshold}%`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unsynced.size > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Jawaban disimpan di perangkat dan akan disinkronkan">
                <CloudOff className="size-3.5" /> menyimpan…
              </span>
            )}
            {remaining !== null && (
              <span
                className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-sm tabular-nums", remaining < 60 && "border-destructive text-destructive")}
                aria-live="off"
                aria-label={`Sisa waktu ${formatSeconds(remaining)}`}
              >
                <Clock className="size-3.5" /> {formatSeconds(remaining)}
              </span>
            )}
          </div>
        </div>
        <Progress value={(answered / questions.length) * 100} aria-label="Progres pengerjaan" />
      </div>

      <section aria-live="polite" className="rounded-2xl border bg-card p-5 shadow-xs md:p-7">
        <QuestionRenderer key={question.id} question={question} value={responses[question.id] ?? null} onChange={change} disabled={submitting} />
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft /> Sebelumnya
        </Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            Berikutnya <ArrowRight />
          </Button>
        ) : (
          <ConfirmDialog
            trigger={
              <Button disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Send />} Kumpulkan
              </Button>
            }
            title="Kumpulkan jawaban?"
            description={
              answered < questions.length
                ? `Masih ada ${questions.length - answered} soal yang belum dijawab. Soal kosong dinilai salah.`
                : "Semua soal sudah dijawab. Jawaban akan dinilai di server dan tidak dapat diubah lagi."
            }
            confirmLabel="Kumpulkan"
            onConfirm={submit}
          />
        )}
      </div>

      <nav aria-label="Navigasi soal" className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const done = hasAnswer(q, responses[q.id] ?? null);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "step" : undefined}
              aria-label={`Soal ${i + 1}${done ? ", sudah dijawab" : ""}`}
              className={cn(
                "size-9 rounded-lg border text-sm font-medium transition",
                i === index && "ring-2 ring-primary",
                done ? "border-primary bg-primary/10 text-primary dark:text-brand-lavender" : "hover:bg-muted",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Practice / review / daily challenge: instant feedback per question
// ---------------------------------------------------------------------------
function PracticeRunner({ attemptId, title, questions, saved }: Props) {
  const router = useRouter();
  const firstOpen = Math.max(0, questions.findIndex((q) => !saved[q.id]));
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(saved);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [checking, startCheck] = useTransition();
  const [finishing, startFinish] = useTransition();
  const [xp, setXp] = useState(0);
  const question = questions[index];
  const current = feedback[question.id];
  const done = useMemo(() => questions.filter((q) => feedback[q.id] || saved[q.id]).length, [questions, feedback, saved]);

  // Load feedback for questions answered before a reload.
  useEffect(() => {
    if (saved[question.id] && !feedback[question.id]) {
      startCheck(async () => {
        const res = await answerPracticeAction(attemptId, question.id, saved[question.id]);
        if (res.ok) setFeedback((f) => ({ ...f, [question.id]: res.data }));
      });
    }
  }, [attemptId, question.id, saved, feedback]);

  const check = () =>
    startCheck(async () => {
      const res = await answerPracticeAction(attemptId, question.id, responses[question.id]);
      if (!res.ok) return void toast.error(res.error);
      setFeedback((f) => ({ ...f, [question.id]: res.data }));
      if (res.data.xp > 0) setXp((x) => x + res.data.xp);
    });

  const finish = () =>
    startFinish(async () => {
      const res = await finishPracticeAction(attemptId);
      if (!res.ok) return void toast.error(res.error);
      router.replace(`/app/results/${attemptId}`);
      router.refresh();
    });

  const correctCount = Object.values(feedback).filter((f) => f.isCorrect).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3 rounded-xl border bg-card px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              Soal {index + 1} dari {questions.length} · {correctCount} benar{xp > 0 && ` · +${xp} XP`}
            </p>
          </div>
          {done === questions.length && (
            <Button size="sm" onClick={finish} disabled={finishing}>
              {finishing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Selesai
            </Button>
          )}
        </div>
        <Progress value={(done / questions.length) * 100} aria-label="Progres latihan" />
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-xs md:p-7">
        <QuestionRenderer
          key={question.id}
          question={question}
          value={responses[question.id] ?? null}
          onChange={(v) => setResponses((r) => ({ ...r, [question.id]: v }))}
          disabled={Boolean(current) || checking}
          feedback={current}
        />
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft /> Sebelumnya
        </Button>
        {!current ? (
          <Button onClick={check} disabled={checking || !hasAnswer(question, responses[question.id] ?? null)}>
            {checking && <Loader2 className="animate-spin" />} Periksa jawaban
          </Button>
        ) : index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            Lanjut <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={finishing || done < questions.length}>
            {finishing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Lihat hasil
          </Button>
        )}
      </div>
    </div>
  );
}
