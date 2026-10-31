"use client";

import { Volume2 } from "lucide-react";
import { speak, type SpeakerVoice } from "@/lib/speech";
import { cn } from "@/lib/utils";

type Line = { speaker: string; text: string };

const STYLES = [
  { dot: "bg-primary", text: "text-primary dark:text-brand-lavender", soft: "bg-primary/8 border-primary/25" },
  { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", soft: "bg-orange-500/8 border-orange-500/25" },
  { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", soft: "bg-emerald-500/8 border-emerald-500/25" },
  { dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", soft: "bg-sky-500/8 border-sky-500/25" },
  { dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", soft: "bg-pink-500/8 border-pink-500/25" },
];

export function speakersOf(script: Line[]) {
  return [...new Set(script.map((l) => l.speaker.trim()))];
}

/** Stable colour per speaker, in order of first appearance. */
export function speakerStyle(speakers: string[], speaker: string) {
  return STYLES[Math.max(0, speakers.indexOf(speaker.trim())) % STYLES.length];
}

/** Speaks one line with its speaker's assigned voice and pitch. */
export function speakLine(line: Line, voices: Map<string, SpeakerVoice> | null, rate: number) {
  const v = voices?.get(line.speaker.trim());
  return speak(line.text, { rate, voice: v?.voice ?? null, pitch: v?.pitch ?? 1 });
}

/** Speaks a whole script; pauses briefly when the speaker changes. Returns early if `stopped()`. */
export async function speakScript(
  script: Line[],
  voices: Map<string, SpeakerVoice> | null,
  rate: number,
  opts: { stopped: () => boolean; onLine?: (i: number) => void },
) {
  for (let i = 0; i < script.length; i++) {
    if (opts.stopped()) return;
    if (i > 0 && script[i].speaker !== script[i - 1].speaker) await new Promise((r) => setTimeout(r, 250));
    if (opts.stopped()) return;
    opts.onLine?.(i);
    await speakLine(script[i], voices, rate);
  }
}

/** Who is speaking and which voice they got (only shown for multi-speaker scripts). */
export function SpeakerLegend({ script, voices, rate }: { script: Line[]; voices: Map<string, SpeakerVoice> | null; rate: number }) {
  const speakers = speakersOf(script);
  if (speakers.length < 2 || !voices) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Suara pembicara">
      {speakers.map((s) => {
        const v = voices.get(s);
        const st = speakerStyle(speakers, s);
        return (
          <li key={s} className={cn("flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs", st.soft)}>
            <span className={cn("size-2 rounded-full", st.dot)} aria-hidden />
            <span className={cn("font-semibold", st.text)}>{s}</span>
            <span className="text-muted-foreground">{v?.label}</span>
            <button
              type="button"
              onClick={() => speak(`Hello, this is ${s}.`, { rate, voice: v?.voice ?? null, pitch: v?.pitch ?? 1 })}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={`Dengar contoh suara ${s}`}
            >
              <Volume2 className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
