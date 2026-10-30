"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Pause, Play, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { saveWordAction } from "@/app/app/personal-actions";
import { lookupWordAction, recordReadingTimeAction } from "@/app/app/skill-actions";
import { SpeakButton } from "@/components/learning/lesson-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Gloss = { word: string; meaning: string };

const stripMd = (s: string) => s.replace(/^#+\s*/gm, "").replace(/[*_`>]/g, "");

/** Renders a passage where glossary words are highlighted and any word can be tapped to translate. */
export function ReadingText({ body, glossary, passageId }: { body: string; glossary: Gloss[]; passageId: string }) {
  const [highlight, setHighlight] = useState(true);
  const glossMap = new Map(glossary.map((g) => [g.word.toLowerCase(), g.meaning]));
  const paragraphs = stripMd(body).split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={highlight} onCheckedChange={setHighlight} /> Sorot kosakata penting
        </label>
        <ReadingTimer passageId={passageId} />
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-5 text-[1.05rem] leading-8 md:p-8">
        {paragraphs.map((p, i) => (
          <p key={i}>
            {p.split(/(\s+)/).map((token, j) => {
              if (/^\s+$/.test(token)) return <Fragment key={j}>{token}</Fragment>;
              const clean = token.toLowerCase().replace(/[^a-z'-]/g, "");
              const meaning = glossMap.get(clean);
              return <Word key={j} token={token} clean={clean} meaning={meaning} highlight={highlight && Boolean(meaning)} />;
            })}
          </p>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Ketuk kata mana pun untuk melihat artinya dan menyimpannya ke wordbook.</p>
    </div>
  );
}

function Word({ token, clean, meaning, highlight }: { token: string; clean: string; meaning?: string; highlight: boolean }) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<{ meaning: string; ipa?: string | null; pos?: string } | null | undefined>(meaning ? { meaning } : undefined);
  const [pending, start] = useTransition();
  if (!clean) return <>{token}</>;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && entry === undefined)
          start(async () => {
            const res = await lookupWordAction(clean);
            setEntry(res.ok && res.data ? { meaning: res.data.meaning_id, ipa: res.data.ipa, pos: res.data.part_of_speech } : null);
          });
      }}
    >
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className={cn("cursor-pointer rounded-sm transition hover:bg-accent", highlight && "bg-brand-lavender/30 font-medium underline decoration-primary/40 decoration-dotted underline-offset-4")}
        >
          {token}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 text-sm">
        <p className="flex items-center gap-1 text-base font-semibold">
          {clean} <SpeakButton text={clean} />
        </p>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : entry ? (
          <>
            {entry.pos && (
              <p className="text-xs text-muted-foreground">
                {entry.pos}
                {entry.ipa && ` · ${entry.ipa}`}
              </p>
            )}
            <p>{entry.meaning}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await saveWordAction({ word: clean, meaning: entry.meaning });
                if (res.ok) toast.success("Disimpan ke wordbook");
                else toast.error(res.error);
              }}
            >
              <Plus /> Simpan kata
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">Belum ada di kamus Linguora. Kamu bisa menambahkannya sendiri dari halaman Vocabulary.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ReadingTimer({ passageId }: { passageId: string }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const saved = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const stop = async () => {
    setRunning(false);
    const delta = seconds - saved.current;
    saved.current = seconds;
    if (delta > 5) await recordReadingTimeAction(passageId, delta);
  };
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-2">
      <Timer className="size-4 text-muted-foreground" aria-hidden />
      <span className="font-mono text-sm tabular-nums" aria-label={`Waktu baca ${mm}:${ss}`}>
        {mm}:{ss}
      </span>
      <Button size="sm" variant="outline" onClick={() => (running ? stop() : setRunning(true))}>
        {running ? <Pause /> : <Play />} {running ? "Selesai membaca" : "Mulai timer"}
      </Button>
    </div>
  );
}
