"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { speak, stopSpeaking, ttsSupported, useBrowserSupport } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** Plays the specimen sentence with the browser's text-to-speech (hidden if unsupported). */
export function SpecimenPlay({ text }: { text: string }) {
  const supported = useBrowserSupport(ttsSupported);
  const [playing, setPlaying] = useState(false);
  if (!supported) return <span className="text-xs text-muted-foreground">Contoh dari Level A1</span>;
  return (
    <button
      type="button"
      onClick={async () => {
        if (playing) {
          stopSpeaking();
          setPlaying(false);
          return;
        }
        setPlaying(true);
        await speak(text, { rate: 0.9 });
        setPlaying(false);
      }}
      className="group inline-flex items-center gap-3 text-sm font-medium"
      aria-label={playing ? "Hentikan" : `Dengarkan: ${text}`}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-105",
          playing && "bg-lime text-lime-ink",
        )}
      >
        {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </span>
      Dengarkan
    </button>
  );
}
