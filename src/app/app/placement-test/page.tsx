import type { Metadata } from "next";
import { Compass, Layers, ShieldCheck, Timer } from "lucide-react";
import { AttemptHistory } from "@/app/app/_components/attempt-history";
import { AttemptView } from "@/app/app/_components/attempt-view";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlacementStart } from "./placement-start";

export const metadata: Metadata = { title: "Placement Test" };

export default async function PlacementPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const { attempt } = await searchParams;
  const viewer = await requireViewer("/app/placement-test");
  if (attempt) return <AttemptView viewer={viewer} attemptId={attempt} expect={(a) => a.kind === "placement"} />;

  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("id, question_count, time_limit_seconds, cooldown_hours").eq("kind", "placement").eq("status", "published").maybeSingle();
  const { data: attempts } = exam
    ? await supabase
        .from("assessment_attempts")
        .select("id, status, score_percent, passed, submitted_at, started_at, attempt_number")
        .eq("user_id", viewer.id)
        .eq("exam_id", exam.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const open = attempts?.find((a) => a.status === "in_progress");

  const points = [
    { icon: Layers, title: `${exam?.question_count ?? 48} soal bertingkat`, text: "Soal disusun dari A1 hingga C2 dan mencakup grammar, vocabulary, reading, listening, dan penggunaan bahasa dalam konteks." },
    { icon: Timer, title: "Timer opsional", text: `Pilih mode santai tanpa batas waktu atau mode berwaktu (${Math.round((exam?.time_limit_seconds ?? 2400) / 60)} menit).` },
    { icon: ShieldCheck, title: "Tersimpan otomatis", text: "Jawaban tersimpan setiap kali kamu menjawab. Jika koneksi terputus, lanjutkan kapan saja." },
    { icon: Compass, title: "Hasil berupa estimasi", text: "Kamu mendapat rekomendasi level dan track, serta kekuatan dan kelemahan per kategori." },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Penempatan level" title="Placement Test" description="Temukan level awal yang paling sesuai agar kamu tidak mengulang materi yang sudah dikuasai — atau melompati dasar yang masih perlu dipelajari." />
      <div className="grid gap-3 sm:grid-cols-2">
        {points.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardContent className="flex gap-3">
              <div className="h-fit rounded-lg bg-accent p-2 text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {exam ? <PlacementStart hasOpen={Boolean(open)} /> : <p className="text-sm text-muted-foreground">Placement test belum tersedia.</p>}
      <p className="text-xs text-muted-foreground">
        Jangan gunakan kamus atau penerjemah agar hasil estimasi akurat. Jika tidak tahu jawabannya, lewati saja.
      </p>
      <AttemptHistory attempts={(attempts ?? []).map((a) => ({ ...a, passed: null }))} />
    </div>
  );
}
