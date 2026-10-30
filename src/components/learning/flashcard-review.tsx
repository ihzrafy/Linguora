"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { gradeReviewAction } from "@/app/app/review-actions";
import { SpeakButton } from "@/components/learning/lesson-client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ReviewCard } from "@/lib/learning/srs-server";
import { cn } from "@/lib/utils";

const GRADES = [
  { key: "again", label: "Lupa", hint: "lagi 10 menit", className: "border-destructive/40 hover:bg-destructive/10" },
  { key: "hard", label: "Sulit", hint: "interval pendek", className: "border-warning/60 hover:bg-warning/10" },
  { key: "good", label: "Baik", hint: "interval normal", className: "border-success/50 hover:bg-success/10" },
  { key: "easy", label: "Mudah", hint: "interval panjang", className: "border-primary/50 hover:bg-primary/10" },
] as const;

/** Spaced-repetition flashcards with SM-2 self-grading. */
export function FlashcardReview({ cards }: { cards: ReviewCard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(0);

  if (index >= cards.length)
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="text-lg font-semibold">Review kartu selesai!</p>
        <p className="text-sm text-muted-foreground">{done} kartu dijadwalkan ulang sesuai tingkat ingatanmu.</p>
      </div>
    );

  const card = cards[index];
  const grade = (g: (typeof GRADES)[number]["key"]) =>
    start(async () => {
      const res = await gradeReviewAction(card.scheduleId, g);
      if (!res.ok) return void toast.error(res.error);
      setDone((d) => d + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    });

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Kartu {index + 1} dari {cards.length}
        </span>
        <span className="capitalize">{card.mastery}</span>
      </div>
      <Progress value={(index / cards.length) * 100} aria-label="Progres review" />
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? "Sisi belakang kartu" : "Sisi depan kartu. Ketuk untuk membalik."}
        className="block h-72 w-full [perspective:1200px]"
      >
        <span className={cn("relative block size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none", flipped && "[transform:rotateY(180deg)]")}>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-card p-6 [backface-visibility:hidden]">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{card.kind === "word" ? "Kosakata" : "Review lesson"}</span>
            <span className="text-3xl font-bold">{card.front}</span>
            {card.ipa && <span className="text-sm text-muted-foreground">{card.ipa}</span>}
            <span className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCw className="size-3" /> Ketuk untuk membalik
            </span>
          </span>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-2xl border-2 border-primary/40 bg-accent p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {card.kind === "word" ? (
              <>
                <span className="text-2xl font-semibold">{card.back}</span>
                {card.detail && <span className="text-sm text-muted-foreground italic">{card.detail}</span>}
              </>
            ) : (
              <span className="w-full space-y-2 text-left text-sm">
                {(card.cards ?? []).map((c, i) => (
                  <span key={i} className="block rounded-lg bg-card/70 p-2">
                    <strong>{c.front}</strong> — {c.back}
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
      </button>
      <div className="flex items-center justify-center gap-2">
        {card.kind === "word" && <SpeakButton text={card.front} />}
        {card.href && (
          <Button asChild variant="link" size="sm">
            <Link href={card.href}>Buka lesson</Link>
          </Button>
        )}
      </div>
      {flipped ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Seberapa baik kamu mengingat?">
          {GRADES.map((g) => (
            <button key={g.key} type="button" disabled={pending} onClick={() => grade(g.key)} className={cn("rounded-xl border-2 px-3 py-2.5 text-sm transition disabled:opacity-60", g.className)}>
              <span className="block font-semibold">{g.label}</span>
              <span className="block text-xs text-muted-foreground">{g.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button className="w-full" variant="secondary" onClick={() => setFlipped(true)}>
          Tampilkan jawaban
        </Button>
      )}
    </div>
  );
}
