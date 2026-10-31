"use client";

import { useSyncExternalStore } from "react";

/**
 * Answer sound effects, synthesized with the Web Audio API (no audio files, no licensing).
 * The on/off preference is stored per device and shared by every toggle on the page.
 */

const STORAGE_KEY = "linguora:sound";
const CHANGE_EVENT = "linguora:sound-change";

export type SoundName = "tap" | "correct" | "partial" | "wrong" | "combo" | "success" | "fail";

// ---------------------------------------------------------------------------
// Preference store
// ---------------------------------------------------------------------------
function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && callback();
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (enabled) playSound("tap");
}

/** Sound preference (hydration-safe: reports "off" during server render). */
export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, readEnabled, () => false);
}

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number; slideTo?: number };

function play(notes: Note[]) {
  const ac = audio();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  const now = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.freq, now + n.at);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.at + n.dur);
    const peak = n.gain ?? 0.12;
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(peak, now + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    osc.connect(g).connect(master);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.dur + 0.02);
  }
}

const SOUNDS: Record<SoundName, Note[]> = {
  // soft click when choosing an option
  tap: [{ freq: 740, at: 0, dur: 0.07, type: "triangle", gain: 0.05 }],
  // bright rising two-note chime
  correct: [
    { freq: 659, at: 0, dur: 0.12, gain: 0.11 },
    { freq: 988, at: 0.08, dur: 0.22, gain: 0.11 },
    { freq: 1976, at: 0.08, dur: 0.18, type: "triangle", gain: 0.025 },
  ],
  partial: [
    { freq: 523, at: 0, dur: 0.12, gain: 0.1 },
    { freq: 622, at: 0.09, dur: 0.18, gain: 0.09 },
  ],
  // gentle low "bonk" — informative, not punishing
  wrong: [
    { freq: 233, at: 0, dur: 0.16, type: "triangle", gain: 0.12, slideTo: 196 },
    { freq: 175, at: 0.13, dur: 0.22, type: "triangle", gain: 0.1, slideTo: 147 },
  ],
  // quick arpeggio for answer streaks
  combo: [523, 659, 784, 1047].map((freq, i) => ({ freq, at: i * 0.06, dur: 0.16, type: "triangle" as const, gain: 0.08 })),
  // fanfare for passing / finishing
  success: [
    ...[523, 659, 784].map((freq, i) => ({ freq, at: i * 0.1, dur: 0.18, gain: 0.1 })),
    { freq: 1047, at: 0.32, dur: 0.5, gain: 0.11 },
    { freq: 784, at: 0.32, dur: 0.5, gain: 0.06 },
    { freq: 659, at: 0.32, dur: 0.5, gain: 0.05 },
  ],
  // calm descending tones when an assessment is not passed yet
  fail: [392, 330, 262].map((freq, i) => ({ freq, at: i * 0.14, dur: 0.24, type: "triangle" as const, gain: 0.08 })),
};

/** Plays a sound effect if the learner has sounds turned on. Safe to call anywhere on the client. */
export function playSound(name: SoundName) {
  if (typeof window === "undefined" || !readEnabled()) return;
  try {
    play(SOUNDS[name]);
  } catch {
    /* audio blocked by the browser: stay silent */
  }
}

/** Short haptic pulse on supporting phones (follows the same on/off preference). */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !readEnabled() || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
