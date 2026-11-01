"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mic, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { saveSpeakingSessionAction } from "@/app/app/speaking/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getRecognition, recognitionSupported, recordingSupported, useBrowserSupport } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";

type Props = { userId: string; promptId: string | null; mode: "speaking" | "pronunciation" | "conversation"; targetPhrases: string[]; onTranscript?: (t: string) => void; compact?: boolean };

/** Records audio (optional upload) and transcribes with browser speech recognition when available. */
export function SpeakingRecorder({ userId, promptId, mode, targetPhrases, onTranscript, compact }: Props) {
  const router = useRouter();
  const canRecognize = useBrowserSupport(recognitionSupported);
  const canRecord = useBrowserSupport(recordingSupported);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [keepAudio, setKeepAudio] = useState(false);
  const [rating, setRating] = useState({ fluency: 3, confidence: 3 });
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState<{ matched: string[]; words: number } | null>(null);
  const [pending, start] = useTransition();
  const started = useRef(0);
  const duration = useRef(0);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  // One object URL per recording (not per render), so typing in the transcript doesn't reset playback.
  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => (audioUrl ? URL.revokeObjectURL(audioUrl) : undefined), [audioUrl]);

  const begin = async () => {
    setSaved(null);
    setAudio(null);
    started.current = Date.now();
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          setAudio(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        };
        rec.start();
        mediaRef.current = rec;
      } catch {
        toast.error("Izin mikrofon ditolak. Kamu tetap bisa menulis transkrip secara manual.");
      }
    }
    const Rec = getRecognition();
    if (Rec) {
      const r = new Rec();
      r.lang = "en-US";
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      let finalText = "";
      const confs: number[] = [];
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            finalText += `${res[0].transcript} `;
            if (res[0].confidence) confs.push(res[0].confidence);
          } else interim += res[0].transcript;
        }
        const t = (finalText + interim).trim();
        setTranscript(t);
        onTranscript?.(t);
        if (confs.length) setConfidence(confs.reduce((a, b) => a + b, 0) / confs.length);
      };
      r.onerror = () => undefined;
      r.start();
      recRef.current = r;
    }
    setActive(true);
  };

  const end = () => {
    recRef.current?.stop();
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    duration.current = Math.round((Date.now() - started.current) / 1000);
    setActive(false);
  };

  const save = () =>
    start(async () => {
      let audioPath: string | null = null;
      if (keepAudio && audio) {
        const ext = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "m4a" : "webm";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await createClient().storage.from("recordings").upload(path, audio, { contentType: audio.type.split(";")[0] });
        if (error) toast.error("Rekaman gagal diunggah; sesi tetap disimpan tanpa audio.");
        else audioPath = path;
      }
      const res = await saveSpeakingSessionAction({
        promptId,
        mode,
        transcript,
        recognitionAvailable: canRecognize,
        confidence,
        durationSeconds: duration.current || null,
        audioPath,
        selfRating: rating,
        reflection: reflection || undefined,
      });
      if (!res.ok) return void toast.error(res.error);
      setSaved(res.data);
      toast.success("Sesi speaking disimpan");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size={compact ? "default" : "lg"} variant={active ? "destructive" : "default"} onClick={active ? end : begin}>
          {active ? <Square /> : <Mic />} {active ? "Berhenti" : "Mulai bicara"}
        </Button>
        {active && <span className="flex items-center gap-2 text-sm text-destructive"><span className="size-2 animate-pulse rounded-full bg-destructive" /> Merekam…</span>}
      </div>
      {!canRecognize && <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm">Speech recognition tidak tersedia di browser ini (umumnya tersedia di Chrome/Edge). Rekam suaramu dan tulis transkripnya sendiri untuk refleksi.</p>}
      {!canRecord && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Perekaman audio tidak didukung browser ini.</p>}
      <div className="space-y-1.5">
        <Label htmlFor="transcript">Transkrip {canRecognize && "(dari speech recognition, bisa kamu koreksi)"}</Label>
        <Textarea id="transcript" rows={3} value={transcript} onChange={(e) => (setTranscript(e.target.value), onTranscript?.(e.target.value))} />
        {confidence !== null && <p className="text-xs text-muted-foreground">Keyakinan pengenalan suara rata-rata: {Math.round(confidence * 100)}% — ini mengukur seberapa yakin sistem mengenali kata, bukan nilai pronunciation.</p>}
      </div>
      {targetPhrases.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Frasa target:</span>
          {targetPhrases.map((p) => {
            const hit = transcript.toLowerCase().includes(p.toLowerCase());
            return (
              <Badge key={p} variant={hit ? "default" : "outline"} className={hit ? "bg-success text-success-foreground" : ""}>
                {hit && <CheckCircle2 className="size-3" />} {p}
              </Badge>
            );
          })}
        </div>
      )}
      {audioUrl && (
        <div className="space-y-2">
          <audio src={audioUrl} controls className="w-full" />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={keepAudio} onCheckedChange={setKeepAudio} /> Simpan rekaman ke akun saya (privat)
          </label>
        </div>
      )}
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["fluency", "confidence"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label>{k === "fluency" ? "Kelancaran (penilaian diri)" : "Rasa percaya diri"}</Label>
              <div className="flex gap-1" role="radiogroup" aria-label={k}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating[k] === n} onClick={() => setRating((r) => ({ ...r, [k]: n }))} className={`size-9 rounded-lg border text-sm ${rating[k] === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="reflection">Refleksi (apa yang sulit? apa yang ingin diperbaiki?)</Label>
            <Textarea id="reflection" rows={2} maxLength={2000} value={reflection} onChange={(e) => setReflection(e.target.value)} />
          </div>
        </div>
      )}
      <Button variant="secondary" onClick={save} disabled={pending || active || (!transcript.trim() && !audio)}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan sesi
      </Button>
      {saved && (
        <p className="text-sm text-muted-foreground">
          Tersimpan: {saved.words} kata{targetPhrases.length ? `, ${saved.matched.length}/${targetPhrases.length} frasa target terdeteksi` : ""}.
        </p>
      )}
    </div>
  );
}
