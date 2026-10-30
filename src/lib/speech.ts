"use client";

import { useSyncExternalStore } from "react";

/**
 * Browser speech helpers (Web Speech API). Everything here degrades gracefully:
 * callers must check the `*Supported()` helpers and show an honest fallback.
 */

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function englishVoice(preferred: "en-US" | "en-GB" = "en-US") {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === preferred) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
}

/** Speaks text with an English voice. Resolves when finished (or cancelled). */
export function speak(text: string, opts: { rate?: number; accent?: "en-US" | "en-GB" } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = opts.accent ?? "en-US";
    utterance.rate = opts.rate ?? 1;
    const voice = englishVoice(opts.accent);
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported() {
  return getRecognition() !== null;
}

export function recordingSupported() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

const noopSubscribe = () => () => {};

/** Browser capability check that is hydration-safe (false on the server). */
export function useBrowserSupport(check: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}
