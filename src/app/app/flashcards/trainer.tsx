"use client";

import { useMemo, useState } from "react";
import { Check, RotateCw, Shuffle, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { normalizeAnswer } from "@/lib/questions/normalize";
import { speak, ttsSupported, useBrowserSupport } from "@/lib/speech";
import { cn } from "@/lib/utils";

export type DeckItem = { word: string; meaning: string; ipa: string | null; example: string | null };
type Mode = "flip" | "quiz" | "spelling" | "match";

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const onClient = () => true;

export function FlashcardTrainer({ deck }: { deck: DeckItem[] }) {
  const [mode, setMode] = useState<Mode>("flip");
  const [seed, setSeed] = useState(0);
  // Shuffle only in the browser: a server-side shuffle would differ from the client's and break hydration.
  const hydrated = useBrowserSupport(onClient);
  const items = useMemo(() => (hydrated ? shuffled(deck) : deck).slice(0, 20), [deck, seed, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  const modes: { key: Mode; label: string }[] = [
    { key: "flip", label: "Flip card" },
    { key: "quiz", label: "Pilihan ganda" },
    { key: "spelling", label: "Ejaan" },
    { key: "match", label: "Cocokkan" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border bg-muted/40 p-1" role="tablist" aria-label="Mode latihan">
          {modes.map((m) => (
            <button key={m.key} role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", mode === m.key ? "bg-background shadow-xs" : "text-muted-foreground")}>
              {m.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSeed((s) => s + 1)}>
          <Shuffle /> Acak ulang
        </Button>
      </div>
      {mode === "flip" && <Flip key={seed} items={items} />}
      {mode === "quiz" && <Quiz key={seed} items={items} pool={deck} />}
      {mode === "spelling" && <Spelling key={seed} items={items} />}
      {mode === "match" && <Match key={seed} items={items.slice(0, 6)} />}
      <p className="text-xs text-muted-foreground">Latihan mandiri ini tidak memengaruhi jadwal review dan tidak memberi XP. Gunakan Review Queue untuk spaced repetition.</p>
    </div>
  );
}

function Flip({ items }: { items: DeckItem[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const tts = useBrowserSupport(ttsSupported);
  const item = items[i];
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Progress value={((i + 1) / items.length) * 100} aria-label="Progres" />
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} className="block h-64 w-full [perspective:1200px]">
        <span className={cn("relative block size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none", flipped && "[transform:rotateY(180deg)]")}>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-card [backface-visibility:hidden]">
            <span className="text-3xl font-bold">{item.word}</span>
            {item.ipa && <span className="text-sm text-muted-foreground">{item.ipa}</span>}
            <span className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCw className="size-3" /> Ketuk untuk membalik
            </span>
          </span>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-accent p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-2xl font-semibold">{item.meaning}</span>
            {item.example && <span className="text-sm text-muted-foreground italic">“{item.example}”</span>}
          </span>
        </span>
      </button>
      <div className="flex justify-between">
        <Button variant="outline" disabled={i === 0} onClick={() => (setI(i - 1), setFlipped(false))}>
          Sebelumnya
        </Button>
        {tts && (
          <Button variant="ghost" onClick={() => speak(item.word)} aria-label={`Dengarkan ${item.word}`}>
            <Volume2 />
          </Button>
        )}
        <Button disabled={i === items.length - 1} onClick={() => (setI(i + 1), setFlipped(false))}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

function Quiz({ items, pool }: { items: DeckItem[]; pool: DeckItem[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const item = items[i];
  const options = useMemo(() => {
    if (!item) return [];
    const others = shuffled(pool.filter((p) => p.meaning !== item.meaning)).slice(0, 3).map((p) => p.meaning);
    return shuffled([item.meaning, ...others]);
  }, [item, pool]);
  if (i >= items.length) return <Done score={score} total={items.length} />;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        {i + 1}/{items.length} · Skor {score}
      </p>
      <p className="text-center text-3xl font-bold">{item.word}</p>
      <div className="grid gap-2">
        {options.map((o) => {
          const state = picked ? (o === item.meaning ? "correct" : o === picked ? "wrong" : "idle") : "idle";
          return (
            <button
              key={o}
              type="button"
              disabled={Boolean(picked)}
              onClick={() => {
                setPicked(o);
                if (o === item.meaning) setScore((s) => s + 1);
              }}
              className={cn("rounded-xl border-2 px-4 py-3 text-left", state === "correct" && "border-success bg-success/10", state === "wrong" && "border-destructive bg-destructive/10", state === "idle" && "hover:border-primary/40")}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <Button className="w-full" onClick={() => (setI(i + 1), setPicked(null))}>
          Lanjut
        </Button>
      )}
    </div>
  );
}

function Spelling({ items }: { items: DeckItem[] }) {
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const tts = useBrowserSupport(ttsSupported);
  if (i >= items.length) return <Done score={score} total={items.length} />;
  const item = items[i];
  return (
    <form
      className="mx-auto max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (result !== null) {
          setI(i + 1);
          setValue("");
          setResult(null);
          return;
        }
        const ok = normalizeAnswer(value) === normalizeAnswer(item.word);
        setResult(ok);
        if (ok) setScore((s) => s + 1);
      }}
    >
      <p className="text-sm text-muted-foreground">
        {i + 1}/{items.length} · Tulis kata bahasa Inggris untuk arti berikut
      </p>
      <p className="text-center text-2xl font-semibold">{item.meaning}</p>
      {tts && (
        <Button type="button" variant="secondary" className="w-full" onClick={() => speak(item.word, { rate: 0.85 })}>
          <Volume2 /> Dengarkan pelafalan
        </Button>
      )}
      <Input aria-label="Ejaan kata" value={value} onChange={(e) => setValue(e.target.value)} disabled={result !== null} autoCapitalize="off" autoComplete="off" spellCheck={false} className="h-11 text-center text-lg" />
      {result !== null && (
        <p className={cn("flex items-center justify-center gap-2 font-medium", result ? "text-success" : "text-destructive")}>
          {result ? <Check className="size-4" /> : <X className="size-4" />} {result ? "Benar!" : `Jawaban: ${item.word}`}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!value.trim() && result === null}>
        {result === null ? "Periksa" : "Lanjut"}
      </Button>
    </form>
  );
}

function Match({ items }: { items: DeckItem[] }) {
  const right = useMemo(() => shuffled(items.map((x) => x.meaning)), [items]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const done = Object.keys(matched).length === items.length;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">Pilih kata, lalu pilih artinya.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {items.map((x) => (
            <button
              key={x.word}
              type="button"
              disabled={Boolean(matched[x.word])}
              onClick={() => setSelected(x.word)}
              className={cn("w-full rounded-xl border-2 px-3 py-2.5 text-left font-medium", matched[x.word] ? "border-success bg-success/10 opacity-70" : selected === x.word ? "border-primary bg-primary/5" : "hover:border-primary/40")}
            >
              {x.word}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((m) => {
            const used = Object.values(matched).includes(m);
            return (
              <button
                key={m}
                type="button"
                disabled={used || !selected}
                onClick={() => {
                  const item = items.find((x) => x.word === selected);
                  if (item?.meaning === m) {
                    setMatched((s) => ({ ...s, [item.word]: m }));
                    setSelected(null);
                  } else {
                    setWrong(m);
                    setTimeout(() => setWrong(null), 600);
                  }
                }}
                className={cn("w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm", used ? "border-success bg-success/10 opacity-70" : wrong === m ? "border-destructive bg-destructive/10" : "hover:border-primary/40")}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      {done && <Done score={items.length} total={items.length} />}
    </div>
  );
}

function Done({ score, total }: { score: number; total: number }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <p className="text-lg font-semibold">Selesai!</p>
      <p className="text-muted-foreground">
        Skor {score}/{total}
      </p>
    </div>
  );
}
