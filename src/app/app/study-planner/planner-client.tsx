"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pause, Play, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addPlannedAction, deletePlannedAction, savePlanAction, saveStudySessionAction, togglePlannedAction } from "./actions";

const DAYS = [
  ["mon", "Sen"],
  ["tue", "Sel"],
  ["wed", "Rab"],
  ["thu", "Kam"],
  ["fri", "Jum"],
  ["sat", "Sab"],
  ["sun", "Min"],
] as const;

type Schedule = Record<(typeof DAYS)[number][0], number>;

export function PlanForm({
  initial,
  levels,
}: {
  initial: { schedule: Schedule; reminderTime: string | null; remindersEnabled: boolean; targetLevelId: string | null; targetDate: string | null };
  levels: { id: string; code: string }[];
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [pending, start] = useTransition();
  const total = Object.values(plan.schedule).reduce((s, n) => s + n, 0);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePlanAction(plan);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Rencana belajar disimpan");
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map(([key, label]) => (
          <div key={key} className="space-y-1 text-center">
            <Label htmlFor={`d-${key}`} className="justify-center text-xs">
              {label}
            </Label>
            <Input
              id={`d-${key}`}
              type="number"
              min={0}
              max={480}
              step={5}
              value={plan.schedule[key]}
              onChange={(e) => setPlan({ ...plan, schedule: { ...plan.schedule, [key]: Math.max(0, Math.min(480, Number(e.target.value) || 0)) } })}
              className="px-1 text-center"
              aria-label={`Menit belajar hari ${label}`}
            />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Total {total} menit/minggu (≈ {Math.round(total / 7)} menit/hari).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="target-level">Target level</Label>
          <NativeSelect id="target-level" value={plan.targetLevelId ?? ""} onChange={(e) => setPlan({ ...plan, targetLevelId: e.target.value || null })}>
            <option value="">Tidak ada</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                Lulus {l.code}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="target-date">Tanggal target</Label>
          <Input id="target-date" type="date" value={plan.targetDate ?? ""} onChange={(e) => setPlan({ ...plan, targetDate: e.target.value || null })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={plan.remindersEnabled} onCheckedChange={(v) => setPlan({ ...plan, remindersEnabled: v })} /> Pengingat belajar
        </label>
        <Input type="time" value={plan.reminderTime ?? ""} onChange={(e) => setPlan({ ...plan, reminderTime: e.target.value || null })} className="w-32" aria-label="Jam pengingat" />
        <p className="text-xs text-muted-foreground">Pengingat ditampilkan di dalam aplikasi. Email/push belum aktif karena penyedia notifikasi belum dikonfigurasi.</p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Simpan rencana
      </Button>
    </form>
  );
}

export function PlannedList({ items, days }: { items: { id: string; title: string; planned_date: string; done: boolean }[]; days: { date: string; label: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => (
          <div key={d.date} className="min-h-28 rounded-xl border bg-card p-2">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{d.label}</p>
            <ul className="space-y-1">
              {items
                .filter((i) => i.planned_date === d.date)
                .map((i) => (
                  <li key={i.id} className="group flex items-start gap-1 text-xs">
                    <button type="button" onClick={() => run(() => togglePlannedAction(i.id, !i.done))} className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", i.done && "border-success bg-success text-white")} aria-label={i.done ? `Tandai belum: ${i.title}` : `Tandai selesai: ${i.title}`}>
                      {i.done && <Check className="size-3" />}
                    </button>
                    <span className={cn("flex-1", i.done && "text-muted-foreground line-through")}>{i.title}</span>
                    <button type="button" onClick={() => run(() => deletePlannedAction(i.id))} className="opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Hapus ${i.title}`}>
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run(() => addPlannedAction({ title, date, lessonId: null }));
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Contoh: Lesson Present Perfect, review 20 kata" aria-label="Rencana belajar" />
        <NativeSelect value={date} onChange={(e) => setDate(e.target.value)} aria-label="Tanggal" wrapperClassName="min-w-36">
          {days.map((d) => (
            <option key={d.date} value={d.date}>
              {d.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={pending}>
          <Plus /> Tambah
        </Button>
      </form>
    </div>
  );
}

export function SessionTimer() {
  const router = useRouter();
  const [mode, setMode] = useState<"free" | "pomodoro">("pomodoro");
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [t, setT] = useState({ elapsed: 0, focus: 0, phase: "focus" as "focus" | "break" });
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const announced = useRef(t.phase);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setT((prev) => {
        let { elapsed, focus, phase } = prev;
        elapsed += 1;
        if (phase === "focus") focus += 1;
        if (mode === "pomodoro" && elapsed >= (phase === "focus" ? 25 * 60 : 5 * 60)) {
          elapsed = 0;
          phase = phase === "focus" ? "break" : "focus";
        }
        return { elapsed, focus, phase };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, mode]);

  useEffect(() => {
    if (announced.current === t.phase) return;
    announced.current = t.phase;
    toast.info(t.phase === "break" ? "Waktunya istirahat 5 menit ☕" : "Kembali fokus 25 menit 💪");
  }, [t.phase]);

  const stop = () =>
    start(async () => {
      setRunning(false);
      if (!startedAt || t.focus < 30) {
        toast.info("Sesi terlalu singkat untuk disimpan.");
      } else {
        const res = await saveStudySessionAction({ mode, startedAt, durationSeconds: t.focus, notes: notes || undefined });
        if (!res.ok) toast.error(res.error);
        else toast.success(`Sesi ${res.data.minutes} menit disimpan`);
      }
      setStartedAt(null);
      setT({ elapsed: 0, focus: 0, phase: "focus" });
      setNotes("");
      router.refresh();
    });

  const shown = mode === "pomodoro" ? (t.phase === "focus" ? 25 * 60 : 5 * 60) - t.elapsed : t.elapsed;
  const mm = String(Math.floor(Math.max(0, shown) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, shown) % 60).padStart(2, "0");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1" role="tablist">
        {(["pomodoro", "free"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} disabled={running} onClick={() => setMode(m)} className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm font-medium", mode === m ? "bg-background shadow-xs" : "text-muted-foreground")}>
            {m === "pomodoro" ? "Pomodoro 25/5" : "Bebas"}
          </button>
        ))}
      </div>
      <div className="text-center">
        {mode === "pomodoro" && <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t.phase === "focus" ? "Fokus" : "Istirahat"}</p>}
        <p className="font-mono text-5xl font-bold tabular-nums" aria-live="off">
          {mm}:{ss}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => {
            if (!startedAt) setStartedAt(new Date().toISOString());
            setRunning((r) => !r);
          }}
        >
          {running ? <Pause /> : <Play />} {running ? "Jeda" : startedAt ? "Lanjut" : "Mulai"}
        </Button>
        <Button variant="outline" onClick={stop} disabled={pending || !startedAt}>
          {pending ? <Loader2 className="animate-spin" /> : <Square />} Selesai & simpan
        </Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor="session-notes">Catatan sesi</Label>
        <Textarea id="session-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Apa yang dipelajari di sesi ini?" />
      </div>
    </div>
  );
}
