"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, CheckCircle2, Loader2, Plus, RotateCw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  answerPracticeAction,
  completeMaterialAction,
  lessonPracticeAction,
  startLessonAction,
  startLessonQuizAction,
} from "@/app/app/learning-actions";
import { saveWordAction, toggleBookmarkAction } from "@/app/app/personal-actions";
import { AnswerBurst, burstClass, SoundToggle, tapFor, useAnswerFx } from "@/components/questions/answer-fx";
import { hasAnswer, QuestionRenderer, type Feedback } from "@/components/questions/question-renderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";
import { speak, ttsSupported, useBrowserSupport } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** Marks the lesson as started once it is opened. */
export function LessonStarter({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    void startLessonAction(lessonId);
  }, [lessonId]);
  return null;
}

export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const supported = useBrowserSupport(ttsSupported);
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={label ?? `Dengarkan: ${text}`}
    >
      <Volume2 className="size-4" />
    </button>
  );
}

export function SaveWordButton({ word, meaning, example }: { word: string; meaning: string; example?: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending || saved}
      onClick={() =>
        start(async () => {
          const res = await saveWordAction({ word, meaning, example });
          if (res.ok || res.code === "conflict") setSaved(true);
          if (res.ok) toast.success(`"${word}" disimpan ke wordbook`);
          else if (res.code !== "conflict") toast.error(res.error);
        })
      }
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
      aria-label={saved ? `${word} sudah di wordbook` : `Simpan ${word} ke wordbook`}
    >
      {saved ? <CheckCircle2 className="size-4 text-success" /> : <Plus className="size-4" />}
    </button>
  );
}

export function BookmarkButton({ targetType, targetId, title, href, initial }: { targetType: "lesson" | "grammar" | "reading" | "listening"; targetId: string; title: string; href: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          const res = await toggleBookmarkAction({ targetType, targetId, title, href });
          if (!res.ok) return void toast.error(res.error);
          setOn(res.data.bookmarked);
        })
      }
    >
      {on ? <BookmarkCheck className="text-primary" /> : <Bookmark />} {on ? "Tersimpan" : "Bookmark"}
    </Button>
  );
}

// Both practice sections of a lesson share one request (and one practice attempt).
const practiceRequests = new Map<string, ReturnType<typeof lessonPracticeAction>>();
function loadLessonPractice(lessonId: string) {
  let request = practiceRequests.get(lessonId);
  if (!request) {
    request = lessonPracticeAction(lessonId);
    practiceRequests.set(lessonId, request);
    void request.then((r) => !r.ok && practiceRequests.delete(lessonId));
  }
  return request;
}

/** Guided / independent practice inside a lesson, with instant server-side feedback. */
export function LessonPractice({ lessonId, questionIds, guided }: { lessonId: string; questionIds: string[]; guided: boolean }) {
  const [state, setState] = useState<{ attemptId: string; questions: ClientQuestion[]; saved: Record<string, QuestionResponse> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLessonPractice(lessonId).then((res) => {
      if (cancelled) return;
      if (res.ok) setState(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!state) return <Skeleton className="h-48 w-full rounded-xl" />;
  const questions = state.questions.filter((q) => questionIds.includes(q.id));
  if (!questions.length) return <p className="text-sm text-muted-foreground">Tidak ada soal latihan di bagian ini.</p>;
  return (
    <div className="space-y-4">
      {guided && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">Jawab soal berikut. Setelah diperiksa, kamu langsung mendapat pembahasan — gunakan untuk memastikan pemahamanmu sebelum mini quiz.</p>
          <SoundToggle showLabel className="shrink-0" />
        </div>
      )}
      {questions.map((q) => (
        <PracticeCard key={q.id} attemptId={state.attemptId} question={q} initial={state.saved[q.id] ?? null} />
      ))}
    </div>
  );
}

function PracticeCard({ attemptId, question, initial }: { attemptId: string; question: ClientQuestion; initial: QuestionResponse | null }) {
  const [value, setValue] = useState<QuestionResponse | null>(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, start] = useTransition();
  const fx = useAnswerFx();
  const check = (response: QuestionResponse | null, restore = false) =>
    start(async () => {
      const res = await answerPracticeAction(attemptId, question.id, response);
      if (!res.ok) return void toast.error(res.error);
      setFeedback(res.data);
      // Answers restored after a reload stay quiet; only fresh answers get sound & animation.
      if (!restore && !res.data.alreadyAnswered) fx.react(res.data);
      if (res.data.xp > 0) toast.success(`+${res.data.xp} XP`);
    });
  // Restore feedback for questions answered earlier.
  useEffect(() => {
    if (initial) check(initial, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div key={fx.burst?.id ?? 0} className={cn("relative rounded-2xl border bg-card p-5", burstClass(fx.burst))}>
      <AnswerBurst burst={fx.burst} />
      <QuestionRenderer
        question={question}
        value={value}
        onChange={(v) => {
          tapFor(question.data.kind);
          setValue(v);
        }}
        disabled={Boolean(feedback) || pending}
        feedback={feedback}
      />
      {!feedback && (
        <Button className="mt-4" onClick={() => check(value)} disabled={pending || !hasAnswer(question, value)}>
          {pending && <Loader2 className="animate-spin" />} Periksa jawaban
        </Button>
      )}
    </div>
  );
}

export function ReviewCards({ cards }: { cards: { front: string; back: string }[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          aria-pressed={Boolean(flipped[i])}
          aria-label={flipped[i] ? `Belakang kartu: ${c.back}` : `Depan kartu: ${c.front}. Ketuk untuk membalik.`}
          className="group h-36 [perspective:1000px]"
        >
          <span className={cn("relative block size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none", flipped[i] && "[transform:rotateY(180deg)]")}>
            <span className="absolute inset-0 flex items-center justify-center rounded-xl border bg-card p-4 text-center font-semibold [backface-visibility:hidden]">{c.front}</span>
            <span className="absolute inset-0 flex items-center justify-center rounded-xl border border-primary/40 bg-accent p-4 text-center text-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {c.back}
            </span>
          </span>
        </button>
      ))}
      <p className="flex items-center gap-1 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
        <RotateCw className="size-3" /> Ketuk kartu untuk membalik. Kartu ini juga masuk ke jadwal review setelah lesson selesai.
      </p>
    </div>
  );
}

export function CompleteAndQuiz({
  lessonId,
  quizId,
  materialDone,
  status,
}: {
  lessonId: string;
  quizId: string | null;
  materialDone: boolean;
  status: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      if (!materialDone) {
        const done = await completeMaterialAction(lessonId);
        if (!done.ok) return void toast.error(done.error);
      }
      if (!quizId) return router.refresh();
      const res = await startLessonQuizAction(lessonId);
      if (!res.ok) return void toast.error(res.error);
      router.push(`/app/quiz/${quizId}?attempt=${res.data}`);
    });
  const completed = status === "completed" || status === "mastered" || status === "needs_review";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button size="lg" onClick={go} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
        {materialDone ? (completed ? "Ulangi mini quiz" : "Mulai mini quiz") : "Saya sudah mempelajari materi — mulai mini quiz"}
      </Button>
      {quizId && (
        <Button variant="ghost" onClick={() => router.push(`/app/quiz/${quizId}`)}>
          Riwayat quiz
        </Button>
      )}
    </div>
  );
}
