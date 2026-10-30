import type { Metadata } from "next";
import Link from "next/link";
import { BookA, BookOpen, Brain, Headphones, MessagesSquare, Sparkles, SpellCheck } from "lucide-react";
import { AttemptView } from "@/app/app/_components/attempt-view";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { weakTopics } from "@/lib/learning/practice";

export const metadata: Metadata = { title: "Latihan Adaptif" };

const CATEGORIES = [
  { key: "grammar", label: "Grammar", icon: SpellCheck },
  { key: "vocabulary", label: "Vocabulary", icon: BookA },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "conversation", label: "Conversation", icon: MessagesSquare },
];

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const { attempt } = await searchParams;
  const viewer = await requireViewer("/app/practice");
  if (attempt) return <AttemptView viewer={viewer} attemptId={attempt} expect={(a) => ["practice", "review", "daily_challenge"].includes(a.kind)} />;
  const weak = await weakTopics(viewer, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Latihan"
        title="Latihan Adaptif"
        description="Soal dipilih berdasarkan performamu: topik yang sering salah mendapat porsi lebih banyak, tingkat kesulitan naik bertahap saat akurasimu tinggi, dan soal yang baru saja kamu kuasai tidak diulang berlebihan."
      />
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-brand-lavender/10">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="h-fit rounded-xl bg-primary p-3 text-primary-foreground">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-semibold">Sesi adaptif (10 soal)</p>
              <p className="text-sm text-muted-foreground">Campuran kelemahan, soal baru, dan review yang sudah jatuh tempo.</p>
            </div>
          </div>
          <StartAttemptButton target={{ kind: "practice", mode: "adaptive", count: 10 }} hrefFor="/app/practice" size="lg">
            Mulai latihan
          </StartAttemptButton>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latihan per keterampilan</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <Card key={key}>
              <CardContent className="space-y-3">
                <Icon className="size-6 text-primary dark:text-brand-lavender" aria-hidden />
                <p className="font-semibold">{label}</p>
                <StartAttemptButton target={{ kind: "practice", mode: "topic", category: key, count: 10 }} hrefFor="/app/practice" variant="outline" size="sm" className="w-full">
                  Latih
                </StartAttemptButton>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="size-4" /> Topik yang perlu diperkuat
            </CardTitle>
            <CardDescription>Dihitung dari akurasi jawabanmu (minimal 3 jawaban per topik).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {weak.length === 0 && <p className="text-sm text-muted-foreground">Belum cukup data. Selesaikan beberapa lesson dan latihan terlebih dahulu.</p>}
            {weak.map((t) => (
              <div key={t.topic} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    Akurasi {Math.round(t.accuracy * 100)}% dari {t.answered} jawaban
                  </p>
                </div>
                <StartAttemptButton target={{ kind: "practice", mode: "topic", topic: t.topic, count: 8 }} hrefFor="/app/practice" size="sm" variant="secondary">
                  Latih
                </StartAttemptButton>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cara kerja pemilihan soal</CardTitle>
            <CardDescription>Algoritma berbasis aturan yang transparan — bukan AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <Badge variant="outline">1</Badge> Hingga 30% soal diambil dari <Link href="/app/review" className="text-primary underline">review queue</Link> yang sudah jatuh tempo.
            </p>
            <p>
              <Badge variant="outline">2</Badge> Topik dengan akurasi rendah diberi bobot hingga 3× lebih besar.
            </p>
            <p>
              <Badge variant="outline">3</Badge> Tingkat kesulitan naik satu tingkat jika akurasi terbarumu ≥ 85%, dan turun jika &lt; 60%.
            </p>
            <p>
              <Badge variant="outline">4</Badge> Soal yang baru kamu jawab benar jarang diulang; satu topik maksimal sepertiga sesi.
            </p>
            <p>
              <Badge variant="outline">5</Badge> Soal hanya berasal dari lesson yang sudah kamu buka dan konten keterampilan di level yang terbuka.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
