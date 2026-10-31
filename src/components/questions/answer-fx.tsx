"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { playSound, setSoundEnabled, useSoundEnabled, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Speaker button that turns answer sound effects on/off (persisted per device). */
export function SoundToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const enabled = useSoundEnabled();
  const label = enabled ? "Matikan efek suara" : "Nyalakan efek suara";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={showLabel ? "sm" : "icon-sm"}
          aria-pressed={enabled}
          aria-label={label}
          onClick={() => setSoundEnabled(!enabled)}
          className={cn(!enabled && "text-muted-foreground", className)}
        >
          {enabled ? <Volume2 /> : <VolumeX />}
          {showLabel && (enabled ? "Suara aktif" : "Suara mati")}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(motionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** True when the learner prefers reduced motion (decorative animations are skipped). */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);
}

/** Discrete interactions that deserve a "tap" sound (typing in text fields stays silent). */
const TAP_KINDS = new Set(["choice", "multi", "dropdown", "bank", "order", "matching", "segments"]);
export function tapFor(kind: string) {
  if (TAP_KINDS.has(kind)) playSound("tap");
}

export type FxResult = { isCorrect: boolean | null; score: number; needsManual: boolean };
export type Burst = { id: number; kind: "correct" | "partial" | "wrong"; combo: number };

const COMBO_MILESTONES = new Set([3, 5, 10, 15, 20]);

/**
 * Sound + haptics + visual burst for a graded answer. Call `react(result)` right after
 * the server returns feedback (not for restored answers, so reloads stay quiet).
 */
export function useAnswerFx() {
  const [burst, setBurst] = useState<Burst | null>(null);
  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);

  const react = useCallback((r: FxResult) => {
    if (r.needsManual) return;
    const kind: Burst["kind"] = r.isCorrect ? "correct" : r.score > 0 ? "partial" : "wrong";
    streakRef.current = kind === "correct" ? streakRef.current + 1 : 0;
    const combo = streakRef.current;
    setStreak(combo);
    if (kind === "correct" && COMBO_MILESTONES.has(combo)) {
      playSound("combo");
      vibrate([20, 40, 20, 40, 30]);
    } else {
      playSound(kind);
      vibrate(kind === "wrong" ? [40, 60, 40] : 25);
    }
    setBurst({ id: Date.now(), kind, combo });
  }, []);

  /** Clears the visual burst (call when moving to another question). */
  const reset = useCallback(() => setBurst(null), []);

  return { burst, streak, react, reset };
}

const COLORS = ["var(--primary)", "var(--brand-blue)", "var(--brand-lavender)", "var(--success)", "var(--warning)", "#f472b6"];

function particles(seed: number, count: number, spread: number) {
  let s = seed % 2147483647 || 1;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.6;
    const dist = spread * (0.55 + rand() * 0.6);
    return {
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - spread * 0.35}px`,
      rot: `${Math.round(rand() * 540 - 270)}deg`,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.round(rand() * 5),
      round: rand() > 0.5,
      delay: `${Math.round(rand() * 80)}ms`,
    };
  });
}

/** Confetti burst rendered from a point (absolute; parent must be `relative`). */
export function Confetti({ seed, count = 22, spread = 120, className }: { seed: number; count?: number; spread?: number; className?: string }) {
  const reduced = useReducedMotion();
  const items = useMemo(() => particles(seed, count, spread), [seed, count, spread]);
  if (reduced) return null;
  return (
    <span aria-hidden className={cn("pointer-events-none absolute z-30 size-0", className)}>
      {items.map((p, i) => (
        <span
          key={i}
          className={cn("absolute animate-confetti", p.round ? "rounded-full" : "rounded-[2px]")}
          style={{ width: p.size, height: p.size, background: p.color, animationDelay: p.delay, ["--dx" as string]: p.dx, ["--dy" as string]: p.dy, ["--rot" as string]: p.rot }}
        />
      ))}
    </span>
  );
}

/** Visual reaction layered over the question card: confetti for correct, combo badge for streaks. */
export function AnswerBurst({ burst }: { burst: Burst | null }) {
  if (!burst || burst.kind === "wrong") return null;
  return (
    <>
      {burst.kind === "correct" && <Confetti key={burst.id} seed={burst.id} className="top-16 left-1/2" />}
      {burst.combo >= 3 && COMBO_MILESTONES.has(burst.combo) && (
        <span key={`c-${burst.id}`} role="status" className="pointer-events-none absolute top-3 left-1/2 z-30 animate-float-up rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-1 text-sm font-bold whitespace-nowrap text-white shadow-lg">
          🔥 Combo ×{burst.combo}!
        </span>
      )}
    </>
  );
}

/** Class names that animate the question card after an answer (restarted via `key`). */
export function burstClass(burst: Burst | null) {
  if (!burst) return "";
  return burst.kind === "wrong" ? "animate-shake" : burst.kind === "correct" ? "animate-glow-success" : "";
}

/** Live "x correct in a row" chip. */
export function StreakChip({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span key={streak} className="inline-flex animate-bounce-in items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400" aria-label={`${streak} jawaban benar beruntun`}>
      🔥 {streak}
    </span>
  );
}

/** One-time celebration on the results page right after submitting (`?celebrate=1`). */
export function ResultCelebration({ outcome }: { outcome: "success" | "fail" | "done" }) {
  const [seed] = useState(() => Date.now());
  useEffect(() => {
    playSound(outcome === "fail" ? "fail" : "success");
    if (outcome !== "fail") vibrate([30, 50, 30]);
    // Drop the flag so a reload does not celebrate again.
    const url = new URL(window.location.href);
    url.searchParams.delete("celebrate");
    window.history.replaceState(null, "", url.toString());
  }, [outcome]);
  if (outcome === "fail") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center">
      <span className="relative">
        <Confetti seed={seed} count={36} spread={220} />
        <Confetti seed={seed + 7} count={24} spread={150} />
      </span>
    </div>
  );
}

/** Settings switch for answer sound effects (same preference as the speaker buttons). */
export function SoundSetting() {
  const enabled = useSoundEnabled();
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <Label htmlFor="sound-fx" className="flex flex-col items-start gap-1">
        <span>Efek suara saat mengerjakan soal</span>
        <span className="text-xs font-normal text-muted-foreground">Bunyi saat memilih, benar, salah, combo, dan selesai. Getar ringan di ponsel. Tersimpan di perangkat ini.</span>
      </Label>
      <Switch id="sound-fx" checked={enabled} onCheckedChange={setSoundEnabled} />
    </div>
  );
}
