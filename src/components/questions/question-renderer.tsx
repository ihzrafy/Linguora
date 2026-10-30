"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Headphones, Mic, MicOff, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/questions/normalize";
import type { ClientQuestion, GradeResult, QuestionResponse } from "@/lib/questions/types";
import { getRecognition, recognitionSupported, speak, stopSpeaking, ttsSupported, useBrowserSupport } from "@/lib/speech";
import { TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type Feedback = GradeResult & { explanation?: string; misconception?: string | null };
type Value = QuestionResponse | null;
type Props = { question: ClientQuestion; value: Value; onChange: (v: QuestionResponse) => void; disabled?: boolean; feedback?: Feedback | null };

const LETTERS = "ABCDEFG";
const get = <T,>(v: Value, key: string, fallback: T): T => (v && key in v ? ((v as Record<string, unknown>)[key] as T) : fallback);


/** Renders any question type from its public data. Never receives answer keys. */
export function QuestionRenderer(props: Props) {
  const { question } = props;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TYPE_LABEL[question.type] ?? question.type}</Badge>
          <Badge variant="outline" className="capitalize">
            {question.category}
          </Badge>
        </div>
        <h2 className="text-lg leading-snug font-semibold md:text-xl">{question.prompt}</h2>
        {question.instructions && <p className="text-sm text-muted-foreground">{question.instructions}</p>}
      </div>

      {question.passage && (
        <details className="group rounded-xl border bg-card p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">Teks bacaan: {question.passage.title}</summary>
          <Markdown className="mt-3 max-h-80 overflow-y-auto pr-2">{question.passage.bodyMd}</Markdown>
        </details>
      )}
      {question.listening && <ListeningPlayer listening={question.listening} revealTranscript={Boolean(props.feedback)} />}
      {question.contextMd && (
        <div className="rounded-xl border-l-4 border-primary/50 bg-accent/40 px-4 py-3">
          <Markdown>{question.contextMd}</Markdown>
        </div>
      )}

      <Body {...props} />

      {props.feedback && <FeedbackPanel feedback={props.feedback} />}
    </div>
  );
}

function Body(props: Props) {
  const { data } = props.question;
  switch (data.kind) {
    case "choice":
      return (
        <>
          {data.dialogue && <Dialogue lines={data.dialogue} />}
          <SingleChoice {...props} />
        </>
      );
    case "multi":
      return <MultiChoice {...props} />;
    case "gaps":
      return <Gaps {...props} template={data.template} />;
    case "dropdown":
      return <Dropdowns {...props} template={data.template} choices={data.choices} />;
    case "bank":
      return <WordBank {...props} template={data.template} bank={data.bank} />;
    case "order":
      return <Ordering {...props} tokens={data.tokens} />;
    case "matching":
      return <Matching {...props} left={data.left} right={data.right} />;
    case "segments":
      return <Segments {...props} segments={data.segments} />;
    case "text":
      return <FreeText {...props} sentence={data.sentence} cue={data.cue} source={data.source} direction={data.direction} />;
    case "essay":
      return <Essay {...props} min={data.minWords} max={data.maxWords} />;
    case "dictation":
      return <Dictation {...props} text={data.text} />;
    case "speaking":
      return <Speaking {...props} targetPhrases={data.targetPhrases} />;
  }
}

// ---------------------------------------------------------------------------

function Dialogue({ lines }: { lines: { speaker: string; text: string | null }[] }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      {lines.map((l, i) => (
        <p key={i} className="text-sm">
          <span className="font-semibold">{l.speaker}:</span>{" "}
          {l.text ?? <span className="inline-block min-w-24 rounded border-b-2 border-dashed border-primary px-2 text-primary">?</span>}
        </p>
      ))}
    </div>
  );
}

function optionState(id: string, selected: boolean, feedback?: Feedback | null) {
  const correctIds = (feedback?.reveal.correctOptionIds as string[] | undefined) ?? [];
  if (!feedback) return selected ? "selected" : "idle";
  if (correctIds.includes(id)) return "correct";
  if (selected) return "wrong";
  return "idle";
}

const optionClass: Record<string, string> = {
  idle: "border-border hover:border-primary/50 hover:bg-accent/40",
  selected: "border-primary bg-primary/5 ring-2 ring-primary/30",
  correct: "border-success bg-success/10",
  wrong: "border-destructive bg-destructive/10",
};

function SingleChoice({ question, value, onChange, disabled, feedback }: Props) {
  const chosen = get<string | null>(value, "optionId", null);
  return (
    <div role="radiogroup" aria-label="Pilihan jawaban" className="grid gap-2.5">
      {question.options.map((o, i) => {
        const state = optionState(o.id, chosen === o.id, feedback);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={chosen === o.id}
            disabled={disabled}
            onClick={() => onChange({ optionId: o.id })}
            className={cn("flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors disabled:cursor-default md:text-base", optionClass[state])}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">{LETTERS[i]}</span>
            <span className="flex-1">{o.content}</span>
            {state === "correct" && <Check className="size-5 text-success" aria-label="Benar" />}
            {state === "wrong" && <X className="size-5 text-destructive" aria-label="Salah" />}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({ question, value, onChange, disabled, feedback }: Props) {
  const chosen = get<string[]>(value, "optionIds", []);
  return (
    <div role="group" aria-label="Pilih semua jawaban yang benar" className="grid gap-2.5">
      {question.options.map((o) => {
        const selected = chosen.includes(o.id);
        const state = optionState(o.id, selected, feedback);
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange({ optionIds: selected ? chosen.filter((x) => x !== o.id) : [...chosen, o.id] })}
            className={cn("flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors md:text-base", optionClass[state])}
          >
            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border-2", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
              {selected && <Check className="size-3.5" />}
            </span>
            <span className="flex-1">{o.content}</span>
            {state === "correct" && <Check className="size-5 text-success" aria-label="Benar" />}
            {state === "wrong" && <X className="size-5 text-destructive" aria-label="Salah" />}
          </button>
        );
      })}
    </div>
  );
}

function splitTemplate(template: string) {
  return template.split("___");
}

function partClass(feedback: Feedback | null | undefined, i: number) {
  if (!feedback?.parts) return "";
  return feedback.parts[i] ? "border-success bg-success/10" : "border-destructive bg-destructive/10";
}

function Gaps({ value, onChange, disabled, feedback, template }: Props & { template: string }) {
  const pieces = splitTemplate(template);
  const blanks = get<string[]>(value, "blanks", Array(pieces.length - 1).fill(""));
  return (
    <p className="text-base leading-[2.6rem] md:text-lg">
      {pieces.map((piece, i) => (
        <span key={i}>
          {piece}
          {i < pieces.length - 1 && (
            <Input
              aria-label={`Isian ${i + 1}`}
              value={blanks[i] ?? ""}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => {
                const next = [...blanks];
                next[i] = e.target.value;
                onChange({ blanks: next });
              }}
              className={cn("mx-1 inline-flex h-9 w-36 align-middle text-base", partClass(feedback, i))}
            />
          )}
        </span>
      ))}
    </p>
  );
}

function Dropdowns({ value, onChange, disabled, feedback, template, choices }: Props & { template: string; choices: string[][] }) {
  const pieces = splitTemplate(template);
  const selected = get<number[]>(value, "choices", Array(choices.length).fill(-1));
  return (
    <p className="text-base leading-[2.6rem] md:text-lg">
      {pieces.map((piece, i) => (
        <span key={i}>
          {piece}
          {i < pieces.length - 1 && (
            <NativeSelect
              aria-label={`Pilihan ${i + 1}`}
              disabled={disabled}
              value={selected[i] ?? -1}
              onChange={(e) => {
                const next = [...selected];
                next[i] = Number(e.target.value);
                onChange({ choices: next });
              }}
              variant="inline"
              wrapperClassName="mx-1.5 inline-flex align-middle"
              className={cn("h-9 border-2 text-base font-medium", partClass(feedback, i))}
            >
              <option value={-1}>— pilih —</option>
              {choices[i]?.map((c, ci) => (
                <option key={ci} value={ci}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          )}
        </span>
      ))}
    </p>
  );
}

function WordBank({ value, onChange, disabled, feedback, template, bank }: Props & { template: string; bank: string[] }) {
  const pieces = splitTemplate(template);
  const count = pieces.length - 1;
  const blanks = get<string[]>(value, "blanks", Array(count).fill(""));
  const [dragWord, setDragWord] = useState<string | null>(null);
  const used = blanks.filter(Boolean);
  const available = bank.filter((w, i) => bank.slice(0, i).filter((x) => x === w).length >= used.filter((u) => u === w).length);

  const place = (word: string, index?: number) => {
    const next = [...blanks];
    const target = index ?? next.findIndex((b) => !b);
    if (target < 0) return;
    next[target] = word;
    onChange({ blanks: next });
  };
  return (
    <div className="space-y-4">
      <p className="text-base leading-[2.8rem] md:text-lg">
        {pieces.map((piece, i) => (
          <span key={i}>
            {piece}
            {i < count && (
              <button
                type="button"
                disabled={disabled}
                aria-label={blanks[i] ? `Isian ${i + 1}: ${blanks[i]} (ketuk untuk menghapus)` : `Isian ${i + 1} kosong`}
                onClick={() => {
                  const next = [...blanks];
                  next[i] = "";
                  onChange({ blanks: next });
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragWord && place(dragWord, i)}
                className={cn(
                  "mx-1 inline-flex h-9 min-w-24 items-center justify-center rounded-lg border-2 border-dashed px-3 align-middle text-base",
                  blanks[i] ? "border-solid border-primary bg-primary/5 font-medium" : "border-muted-foreground/40",
                  partClass(feedback, i),
                )}
              >
                {blanks[i] || " "}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Bank kata">
        {available.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            draggable={!disabled}
            disabled={disabled}
            onDragStart={() => setDragWord(w)}
            onClick={() => place(w)}
            className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-xs transition hover:border-primary hover:bg-accent/50"
          >
            {w}
          </button>
        ))}
      </div>
      {!disabled && <p className="text-xs text-muted-foreground">Ketuk atau seret kata ke tempat kosong. Ketuk isian untuk menghapusnya.</p>}
    </div>
  );
}

function Ordering({ value, onChange, disabled, feedback, tokens }: Props & { tokens: { id: string; text: string }[] }) {
  const order = get<string[]>(value, "order", []);
  const remaining = tokens.filter((t) => !order.includes(t.id));
  const text = (id: string) => tokens.find((t) => t.id === id)?.text ?? "";
  return (
    <div className="space-y-4">
      <div
        aria-label="Jawaban tersusun"
        className={cn(
          "flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-3",
          feedback && (feedback.isCorrect ? "border-success bg-success/5" : "border-destructive bg-destructive/5"),
        )}
      >
        {order.length === 0 && <span className="text-sm text-muted-foreground">Ketuk kata di bawah sesuai urutan yang benar.</span>}
        {order.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ order: order.filter((x) => x !== id) })}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            aria-label={`${text(id)} (ketuk untuk mengembalikan)`}
          >
            {text(id)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ order: [...order, t.id] })}
            className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-xs transition hover:border-primary hover:bg-accent/50"
          >
            {t.text}
          </button>
        ))}
      </div>
      {order.length > 0 && !disabled && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ order: [] })}>
          <RotateCcw /> Ulangi susunan
        </Button>
      )}
    </div>
  );
}

function Matching({ value, onChange, disabled, feedback, left, right }: Props & { left: { id: string; text: string }[]; right: { id: string; text: string }[] }) {
  const pairs = get<Record<string, string>>(value, "pairs", {});
  return (
    <div className="space-y-2.5">
      {left.map((l, i) => (
        <div key={l.id} className={cn("grid items-center gap-2 rounded-xl border-2 p-3 sm:grid-cols-[1fr_auto_1fr]", partClass(feedback, i) || "border-border")}>
          <span className="font-medium">{l.text}</span>
          <span className="hidden text-muted-foreground sm:block" aria-hidden>
            →
          </span>
          <NativeSelect
            aria-label={`Pasangan untuk ${l.text}`}
            disabled={disabled}
            value={pairs[l.id] ?? ""}
            onChange={(e) => onChange({ pairs: { ...pairs, [l.id]: e.target.value } })}
            className="h-10"
          >
            <option value="">— pilih pasangan —</option>
            {right.map((r) => (
              <option key={r.id} value={r.id}>
                {r.text}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
    </div>
  );
}

function Segments({ value, onChange, disabled, feedback, segments }: Props & { segments: { id: string; text: string }[] }) {
  const chosen = get<string | null>(value, "segmentId", null);
  const wrongId = feedback?.reveal.segmentId as string | undefined;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-base md:text-lg" role="radiogroup" aria-label="Bagian kalimat">
        {segments.map((s) => {
          const isChosen = chosen === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={disabled}
              onClick={() => onChange({ segmentId: s.id })}
              className={cn(
                "rounded-lg border-2 px-3 py-1.5 transition-colors",
                feedback ? (s.id === wrongId ? "border-success bg-success/10" : isChosen ? "border-destructive bg-destructive/10" : "border-transparent") : isChosen ? "border-primary bg-primary/5" : "border-transparent bg-muted hover:border-primary/40",
              )}
            >
              {s.text}
            </button>
          );
        })}
      </div>
      {feedback && typeof feedback.reveal.correction === "string" && (
        <p className="text-sm">
          Perbaikan: <strong>{feedback.reveal.correction}</strong>
        </p>
      )}
    </div>
  );
}

function FreeText({ value, onChange, disabled, feedback, sentence, cue, source, direction }: Props & { sentence?: string; cue?: string; source?: string; direction?: string }) {
  const text = get<string>(value, "text", "");
  return (
    <div className="space-y-3">
      {sentence && <p className="rounded-xl bg-muted px-4 py-3 text-base font-medium">{sentence}</p>}
      {cue && <p className="text-sm text-muted-foreground">Petunjuk: {cue}</p>}
      {source && (
        <div className="rounded-xl bg-muted px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{direction === "en-id" ? "Inggris → Indonesia" : "Indonesia → Inggris"}</p>
          <p className="mt-1 text-base font-medium">{source}</p>
        </div>
      )}
      <Textarea
        aria-label="Jawaban kamu"
        value={text}
        rows={2}
        disabled={disabled}
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Tulis jawabanmu di sini…"
        className={cn("text-base", feedback && (feedback.isCorrect ? "border-success" : "border-destructive"))}
      />
    </div>
  );
}

function Essay({ value, onChange, disabled, min, max }: Props & { min: number; max: number }) {
  const text = get<string>(value, "text", "");
  const words = countWords(text);
  return (
    <div className="space-y-2">
      <Textarea aria-label="Esai kamu" value={text} rows={10} disabled={disabled} onChange={(e) => onChange({ text: e.target.value })} className="text-base" />
      <p className={cn("text-xs", words < min || words > max ? "text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
        {words} kata (target {min}–{max}). Esai dinilai dengan rubrik oleh reviewer — tidak dinilai otomatis.
      </p>
    </div>
  );
}

function Dictation({ value, onChange, disabled, feedback, text }: Props & { text: string }) {
  const [rate, setRate] = useState(0.9);
  const supported = useTtsSupport();
  return (
    <div className="space-y-3">
      {supported ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => speak(text, { rate })}>
            <Volume2 /> Putar audio
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => speak(text, { rate: 0.7 })}>
            Putar pelan
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Kecepatan
            <NativeSelect size="xs" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Kecepatan putar" wrapperClassName="w-18">
              {[0.75, 0.9, 1, 1.15].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      ) : (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm">Browser ini tidak mendukung text-to-speech, jadi soal dikte tidak dapat diputar.</p>
      )}
      <p className="text-xs text-muted-foreground">Audio dihasilkan oleh text-to-speech browser.</p>
      <FreeText question={{} as ClientQuestion} value={value} onChange={onChange} disabled={disabled || !supported} feedback={feedback} />
    </div>
  );
}

function useTtsSupport() {
  return useBrowserSupport(ttsSupported);
}

function Speaking({ value, onChange, disabled, targetPhrases }: Props & { targetPhrases: string[] }) {
  const transcript = get<string>(value, "transcript", "");
  const [listening, setListening] = useState(false);
  const supported = useBrowserSupport(recognitionSupported);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const start = () => {
    const Rec = getRecognition();
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    let finalText = transcript ? `${transcript} ` : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      onChange({ transcript: (finalText + interim).trim(), completed: true });
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };
  return (
    <div className="space-y-3">
      {targetPhrases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Coba gunakan:</span>
          {targetPhrases.map((p) => (
            <Badge key={p} variant="outline">
              {p}
            </Badge>
          ))}
        </div>
      )}
      {supported ? (
        <Button type="button" variant={listening ? "destructive" : "secondary"} disabled={disabled} onClick={() => (listening ? recRef.current?.stop() : start())}>
          {listening ? <MicOff /> : <Mic />} {listening ? "Berhenti merekam" : "Mulai bicara"}
        </Button>
      ) : (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm">
          Pengenalan suara tidak tersedia di browser ini. Kamu tetap bisa berlatih dengan mengucapkan jawaban lalu menuliskannya.
        </p>
      )}
      <Textarea
        aria-label="Transkrip ucapan"
        value={transcript}
        rows={3}
        disabled={disabled}
        onChange={(e) => onChange({ transcript: e.target.value, completed: true })}
        placeholder="Transkrip ucapanmu akan muncul di sini…"
      />
      <p className="text-xs text-muted-foreground">Speech recognition hanya mentranskripsi ucapan — ini bukan penilaian pronunciation profesional.</p>
    </div>
  );
}

function ListeningPlayer({
  listening,
  revealTranscript,
}: {
  listening: { title: string; script: { speaker: string; text: string }[]; audioUrl: string | null };
  revealTranscript: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [show, setShow] = useState(false);
  const supported = useTtsSupport();
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => () => stopSpeaking(), []);

  const play = async () => {
    if (listening.audioUrl) {
      const el = audioRef.current;
      if (!el) return;
      el.playbackRate = rate;
      if (el.paused) void el.play();
      else el.pause();
      return;
    }
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    for (const line of listening.script) {
      if (!window.speechSynthesis) break;
      await speak(line.text, { rate });
    }
    setPlaying(false);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-lg bg-accent p-2 text-accent-foreground">
          <Headphones className="size-5" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{listening.title}</p>
          <p className="text-xs text-muted-foreground">{listening.audioUrl ? "Audio" : "Audio text-to-speech browser"}</p>
        </div>
        {listening.audioUrl && <audio ref={audioRef} src={listening.audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} preload="none" />}
        {listening.audioUrl || supported ? (
          <>
            <Button type="button" size="sm" onClick={play} aria-label={playing ? "Jeda" : "Putar"}>
              {playing ? <Pause /> : <Play />} {playing ? "Jeda" : "Putar"}
            </Button>
            <NativeSelect size="sm" aria-label="Kecepatan putar" value={rate} onChange={(e) => setRate(Number(e.target.value))} wrapperClassName="w-20">
              {[0.75, 0.9, 1, 1.25].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </NativeSelect>
          </>
        ) : (
          <span className="text-xs text-warning-foreground dark:text-warning">Text-to-speech tidak didukung browser ini.</span>
        )}
      </div>
      {(revealTranscript || show) && (
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          {listening.script.map((l, i) => (
            <p key={i}>
              <span className="font-semibold">{l.speaker}:</span> {l.text}
            </p>
          ))}
        </div>
      )}
      {!revealTranscript && !show && (
        <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={() => setShow(true)}>
          Tampilkan transkrip (disarankan setelah mencoba menjawab)
        </button>
      )}
    </div>
  );
}

export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const manual = feedback.needsManual;
  const correct = feedback.isCorrect;
  const partial = !correct && feedback.score > 0 && !manual;
  return (
    <div
      role="status"
      className={cn(
        "space-y-2 rounded-xl border-2 p-4",
        manual ? "border-info/40 bg-info/5" : correct ? "border-success/50 bg-success/10" : partial ? "border-warning/60 bg-warning/10" : "border-destructive/40 bg-destructive/5",
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {manual ? "Jawaban tersimpan untuk penilaian rubrik" : correct ? (
          <>
            <Check className="size-5 text-success" /> Benar!
          </>
        ) : partial ? (
          `Sebagian benar (${Math.round(feedback.score * 100)}%)`
        ) : (
          <>
            <X className="size-5 text-destructive" /> Belum tepat
          </>
        )}
      </p>
      {!correct && feedback.correctAnswer.length > 0 && (
        <p className="text-sm">
          {manual ? "Contoh jawaban" : "Jawaban yang benar"}: <strong>{feedback.correctAnswer.join(" / ")}</strong>
        </p>
      )}
      {feedback.explanation && <Markdown className="text-sm">{feedback.explanation}</Markdown>}
      {!correct && feedback.misconception && <p className="text-sm text-muted-foreground">💡 {feedback.misconception}</p>}
    </div>
  );
}

/** True when the response has something to submit. */
export function hasAnswer(question: ClientQuestion, value: Value): boolean {
  if (!value) return false;
  const v = value as Record<string, unknown>;
  switch (question.data.kind) {
    case "choice":
      return Boolean(v.optionId);
    case "multi":
      return Array.isArray(v.optionIds) && v.optionIds.length > 0;
    case "gaps":
    case "bank":
      return Array.isArray(v.blanks) && v.blanks.some((b) => String(b ?? "").trim());
    case "dropdown":
      return Array.isArray(v.choices) && v.choices.some((c) => Number(c) >= 0);
    case "order":
      return Array.isArray(v.order) && v.order.length > 0;
    case "matching":
      return Boolean(v.pairs) && Object.values(v.pairs as object).some(Boolean);
    case "segments":
      return Boolean(v.segmentId);
    case "speaking":
      return Boolean(String(v.transcript ?? "").trim());
    default:
      return Boolean(String(v.text ?? "").trim());
  }
}
