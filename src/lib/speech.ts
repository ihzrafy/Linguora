"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

export type SpeakOptions = {
  rate?: number;
  accent?: "en-US" | "en-GB";
  /** Explicit voice (e.g. a speaker's assigned voice); overrides `accent`. */
  voice?: SpeechSynthesisVoice | null;
  /** 0–2, default 1. Used to tell speakers apart when only one voice exists. */
  pitch?: number;
};

/** Speaks text with an English voice. Resolves when finished (or cancelled). */
export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = opts.voice ?? englishVoice(opts.accent);
    utterance.lang = voice?.lang ?? opts.accent ?? "en-US";
    utterance.rate = opts.rate ?? 1;
    utterance.pitch = opts.pitch ?? 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

// ---------------------------------------------------------------------------
// Distinct voices per speaker (dialogues, interviews, phone calls)
// ---------------------------------------------------------------------------
export type Gender = "female" | "male";

/** Browsers load voices asynchronously; wait briefly for the list to be ready. */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([]);
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length) return resolve(now);
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener("voiceschanged", done);
  });
}

const FEMALE_VOICE = /female|woman|zira|samantha|susan|hazel|libby|sonia|aria|jenny|michelle|karen|moira|tessa|fiona|victoria|allison|ava\b|serena|kate|emma|olivia|natasha|clara|catherine|joanna|salli|kimberly|ivy|kendra|amy|nicole|heather|linda|sara|ana\b|google us english$|google uk english female/i;
const MALE_VOICE = /\bmale|\bman\b|david|mark|george|ryan|guy|daniel|alex\b|fred|thomas|oliver|arthur|rishi|aaron|\btom\b|eric|christopher|brian|liam|james|matthew|joey|justin|russell|william|google uk english male/i;

export function voiceGender(v: SpeechSynthesisVoice): Gender | null {
  if (/female/i.test(v.name)) return "female";
  if (MALE_VOICE.test(v.name)) return "male";
  if (FEMALE_VOICE.test(v.name)) return "female";
  return null;
}

const FEMALE_SPEAKER = /^(mrs|ms|miss|madam|ma'am|mother|mom|mum|wife|sister|daughter|aunt|grandmother|grandma|girl|woman|lady|bu|ibu|mbak)\b|\b(rina|siti|dewi|ayu|putri|linda|sari|maya|nadia|anna|ana|sarah|sara|emma|lisa|maria|jessica|emily|sophie|kate|lucy|amy|mia|olivia|jane|julia|laura|nina|tina|diana|helen|alice|grace|wulan|indah|fitri|ratna|lestari|nina|clara|hannah|rachel|nora|chloe|yuki|mei|lily|priya|novita|citra|intan|nabila|aisyah|anisa|yuni|mega|tania|bella|sinta|vina|lia)\b/i;
const MALE_SPEAKER = /^(mr|sir|father|dad|husband|brother|son|uncle|grandfather|grandpa|boy|man|gentleman|pak|bapak|mas)\b|\b(budi|andi|rudi|ahmad|agus|dimas|joko|rizky|bayu|eko|hendra|arif|tom|john|david|james|mike|michael|daniel|peter|paul|mark|jack|ben|sam|alex|chris|ryan|kevin|robert|richard|george|henry|leo|max|oliver|ethan|adam|kenji|raj|omar|carlos|marco|reza|tomi|adi|ken|rafi|fajar|bambang|yusuf|ilham|luca|hiro|ivan|raka|dani|fikri|bima|gilang|wahyu)\b/i;

/** Best-effort guess from a speaker label ("Mrs. Lewis", "Rina", "Receptionist"). */
export function speakerGender(speaker: string): Gender | null {
  const s = speaker.trim().replace(/\./g, "");
  if (FEMALE_SPEAKER.test(s)) return "female";
  if (MALE_SPEAKER.test(s)) return "male";
  return null;
}

export type SpeakerVoice = { voice: SpeechSynthesisVoice | null; pitch: number; gender: Gender | null; label: string };

const PITCHES: Record<Gender, number[]> = { female: [1.15, 1.3, 1.05], male: [0.8, 0.7, 0.9] };
const ACCENT_LABEL: Record<string, string> = { "en-US": "Amerika", "en-GB": "Inggris", "en-AU": "Australia", "en-IN": "India", "en-CA": "Kanada", "en-IE": "Irlandia", "en-ZA": "Afrika Selatan", "en-NZ": "Selandia Baru" };

/**
 * Gives every distinct speaker a stable, different voice. Prefers a voice whose gender
 * matches the speaker, then a different accent from voices already used. When the device
 * has fewer voices than speakers, speakers are still told apart by pitch.
 */
export function assignSpeakerVoices(speakers: string[], voices: SpeechSynthesisVoice[]): Map<string, SpeakerVoice> {
  const unique = [...new Set(speakers.map((s) => s.trim()))];
  const english = voices
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    // Prefer natural/online voices, then local ones; keep a stable order.
    .sort((a, b) => Number(/natural|neural|online|google/i.test(b.name)) - Number(/natural|neural|online|google/i.test(a.name)) || a.name.localeCompare(b.name));
  const used = new Set<SpeechSynthesisVoice>();
  const usedLangs = new Set<string>();
  const pitchUse: Record<Gender, number> = { female: 0, male: 0 };
  const result = new Map<string, SpeakerVoice>();
  // Known genders first; unknown speakers then balance the conversation (e.g. Ayu + Reza → female + male).
  const known = new Map(unique.map((s) => [s, speakerGender(s)] as const));
  const count: Record<Gender, number> = { female: 0, male: 0 };
  known.forEach((g) => g && count[g]++);
  const genderOf = new Map<string, Gender>();
  for (const speaker of unique) {
    let g = known.get(speaker) ?? null;
    if (!g) {
      g = count.female <= count.male ? "female" : "male";
      count[g]++;
    }
    genderOf.set(speaker, g);
  }

  for (const speaker of unique) {
    const gender = genderOf.get(speaker)!;
    const candidates = english.filter((v) => !used.has(v));
    const byGender = candidates.filter((v) => voiceGender(v) === gender);
    const pool = byGender.length ? byGender : candidates.filter((v) => voiceGender(v) === null);
    const chosen = pool.find((v) => !usedLangs.has(v.lang)) ?? pool[0] ?? null;
    if (chosen) {
      used.add(chosen);
      usedLangs.add(chosen.lang);
    }
    // Same voice as someone else (or no gendered voice found) → separate them by pitch.
    const sharesVoice = !chosen || voiceGender(chosen) !== gender;
    const pitch = sharesVoice ? PITCHES[gender][pitchUse[gender]++ % PITCHES[gender].length] : gender === "female" ? 1.05 : 0.95;
    // Reuse a voice of the right gender (with a different pitch) before any other voice.
    const fallback = chosen ?? english.find((v) => voiceGender(v) === gender) ?? english[0] ?? null;
    const accent = fallback ? (ACCENT_LABEL[fallback.lang] ?? fallback.lang) : "default";
    result.set(speaker, {
      voice: fallback,
      pitch,
      gender,
      label: `${gender === "female" ? "Suara perempuan" : "Suara laki-laki"} · aksen ${accent}${sharesVoice ? " · nada dibedakan" : ""}`,
    });
  }
  return result;
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

/** Loads the device voices and assigns one per speaker (null until ready or when TTS is unsupported). */
export function useSpeakerVoices(speakers: string[]): Map<string, SpeakerVoice> | null {
  const key = [...new Set(speakers)].join("\u0001");
  const [state, setState] = useState<{ key: string; map: Map<string, SpeakerVoice> } | null>(null);
  useEffect(() => {
    if (!ttsSupported()) return;
    let cancelled = false;
    const list = key.split("\u0001");
    const update = () =>
      loadVoices().then((voices) => {
        if (!cancelled) setState({ key, map: assignSpeakerVoices(list, voices) });
      });
    void update();
    // Some browsers add (online) voices later; re-assign when the list changes.
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", update);
    };
  }, [key]);
  return state?.key === key ? state.map : null;
}
