"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import { recordListeningPlayAction } from "@/app/app/skill-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { matchesAny } from "@/lib/questions/normalize";
import { speak, stopSpeaking, ttsSupported, useBrowserSupport } from "@/lib/speech";
import { cn } from "@/lib/utils";

type Line = { speaker: string; text: string };

export function ListeningPlayer({ materialId, script, audioUrl }: { materialId: string; script: Line[]; audioUrl: string | null }) {
  const tts = useBrowserSupport(ttsSupported);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const stopRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => () => stopSpeaking(), []);

  const playAll = async () => {
    void recordListeningPlayAction(materialId);
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = rate;
      void audioRef.current.play();
      return;
    }
    stopRef.current = false;
    setPlaying(true);
    for (let i = 0; i < script.length; i++) {
      if (stopRef.current) break;
      setCurrent(i);
      await speak(script[i].text, { rate, accent: i % 2 ? "en-GB" : "en-US" });
    }
    setCurrent(null);
    setPlaying(false);
  };
  const stop = () => {
    stopRef.current = true;
    stopSpeaking();
    audioRef.current?.pause();
    setPlaying(false);
    setCurrent(null);
  };

  const available = Boolean(audioUrl) || tts;
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
      {!available ? (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm">Materi ini belum memiliki file audio dan browser kamu tidak mendukung text-to-speech, sehingga audio tidak dapat diputar.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!audioUrl && (
            <Button onClick={playing ? stop : playAll}>
              {playing ? <Pause /> : <Play />} {playing ? "Stop" : "Putar semua"}
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Kecepatan
            <NativeSelect size="sm" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Kecepatan putar" wrapperClassName="w-20">
              {[0.75, 0.9, 1, 1.15, 1.3].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </NativeSelect>
          </label>
          <Button variant="ghost" size="sm" onClick={() => setShowTranscript((s) => !s)} aria-pressed={showTranscript}>
            {showTranscript ? <EyeOff /> : <Eye />} {showTranscript ? "Sembunyikan transkrip" : "Tampilkan transkrip"}
          </Button>
        </div>
      )}
      {!audioUrl && available && <p className="text-xs text-muted-foreground">Audio dihasilkan dengan text-to-speech browser (bukan rekaman penutur asli). Variasi aksen bergantung pada suara yang tersedia di perangkatmu.</p>}
      <ol className="space-y-1.5">
        {script.map((l, i) => (
          <li key={i} className={cn("flex items-start gap-2 rounded-lg p-2 text-sm", current === i && "bg-accent")}>
            {tts && !audioUrl && (
              <Button size="icon-xs" variant="ghost" aria-label={`Putar baris ${i + 1}`} onClick={() => speak(l.text, { rate })}>
                <RotateCcw />
              </Button>
            )}
            <span className="font-semibold">{l.speaker}:</span>
            <span className={cn(!showTranscript && "rounded bg-muted text-transparent select-none")} aria-hidden={!showTranscript}>
              {l.text}
            </span>
            {!showTranscript && <span className="sr-only">Transkrip disembunyikan</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Self-check dictation from the script lines (practice only, not graded). */
export function DictationDrill({ lines }: { lines: string[] }) {
  const tts = useBrowserSupport(ttsSupported);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  if (!tts || !lines.length) return <p className="text-sm text-muted-foreground">Dikte memerlukan text-to-speech browser.</p>;
  const line = lines[i];
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (result !== null) {
          setI((i + 1) % lines.length);
          setValue("");
          setResult(null);
        } else setResult(matchesAny(value, [line]));
      }}
    >
      <p className="text-sm text-muted-foreground">
        Kalimat {i + 1}/{lines.length}: dengarkan lalu tulis kalimatnya.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => speak(line, { rate: 0.85 })}>
          <Volume2 /> Putar
        </Button>
        <Button type="button" variant="ghost" onClick={() => speak(line, { rate: 0.65 })}>
          Pelan
        </Button>
      </div>
      <Input aria-label="Tulis kalimat yang kamu dengar" value={value} onChange={(e) => setValue(e.target.value)} disabled={result !== null} autoCapitalize="off" spellCheck={false} />
      {result !== null && (
        <p className={cn("flex items-start gap-2 text-sm", result ? "text-success" : "text-destructive")}>
          {result ? <Check className="mt-0.5 size-4" /> : <X className="mt-0.5 size-4" />}
          {result ? "Tepat!" : <span>Kalimat aslinya: “{line}”</span>}
        </p>
      )}
      <Button type="submit" size="sm" disabled={!value.trim() && result === null}>
        {result === null ? "Periksa" : "Kalimat berikutnya"}
      </Button>
    </form>
  );
}
