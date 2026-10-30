import type { Metadata } from "next";
import { BookA, BookOpen, FileQuestion } from "lucide-react";
import { FlashcardReview } from "@/components/learning/flashcard-review";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { dueCards, dueCounts } from "@/lib/learning/srs-server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review Queue" };

export default async function ReviewPage() {
  const viewer = await requireViewer("/app/review");
  const [counts, cards] = await Promise.all([dueCounts(viewer), dueCards(viewer, 30)]);
  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from("review_schedules")
    .select("due_at")
    .eq("user_id", viewer.id)
    .gt("due_at", new Date().toISOString())
    .order("due_at")
    .limit(200);
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString("id-ID", { weekday: "short" }), count: (upcoming ?? []).filter((u) => u.due_at.slice(0, 10) === key).length };
  });

  const tiles = [
    { icon: FileQuestion, label: "Soal yang pernah salah", count: counts.question ?? 0 },
    { icon: BookA, label: "Kosakata", count: counts.user_vocabulary ?? 0 },
    { icon: BookOpen, label: "Lesson", count: counts.lesson ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Spaced repetition" title="Review Queue" description="Item muncul kembali tepat sebelum kamu cenderung melupakannya. Jawaban dan penilaianmu menentukan kapan item berikutnya dijadwalkan (algoritma SM-2)." />
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, label, count }) => (
          <Card key={label} className="py-4">
            <CardContent className="flex items-center gap-3">
              <Icon className="size-6 text-primary" aria-hidden />
              <div>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground">{label} jatuh tempo</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Soal review</h2>
        {counts.question ? (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Kerjakan ulang soal yang sebelumnya salah. Jawaban benar mendapat XP review (dibatasi per hari).</p>
            <StartAttemptButton target={{ kind: "practice", mode: "review", count: 15 }} hrefFor="/app/practice">
              Mulai review soal
            </StartAttemptButton>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada soal yang perlu direview saat ini.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kartu kosakata & lesson</h2>
        {cards.length ? (
          <FlashcardReview cards={cards} />
        ) : (
          <EmptyState title="Semua kartu sudah direview 🎉" description="Simpan kata baru ke wordbook atau selesaikan lesson untuk menambah kartu review." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Jadwal 7 hari ke depan</h2>
        <div className="grid grid-cols-7 gap-2">
          {next7.map((d) => (
            <div key={d.label} className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-lg font-semibold tabular-nums">{d.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
