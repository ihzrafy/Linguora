import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Flame,
  Headphones,
  Layers,
  Lock,
  Mic,
  PenLine,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadClientQuestions } from "@/lib/learning/questions-server";
import { createPublicClient } from "@/lib/supabase/public";
import { FaqList, FAQS } from "./faq-data";
import { HeroMotion } from "./hero-motion";
import { sampleQuestionIds } from "./sample-actions";
import { SampleExercises } from "./sample-exercises";

const FEATURES = [
  { icon: Route, title: "Learning path terkunci & terarah", text: "Unit dan lesson terbuka sesuai prasyarat. Aturan progresi dijalankan di server, bukan sekadar disembunyikan di tampilan." },
  { icon: BookOpenCheck, title: "Bank soal 20 tipe", text: "Pilihan ganda, isian, drag & drop, urutkan kata, matching, error identification, translation, dikte, hingga speaking." },
  { icon: ShieldCheck, title: "Penilaian di server", text: "Kunci jawaban tidak pernah dikirim ke browser sebelum kamu menjawab. Skor, XP, dan kelulusan dihitung di server." },
  { icon: Brain, title: "Latihan adaptif & spaced repetition", text: "Topik yang sering salah mendapat porsi lebih besar; materi yang mulai terlupa dijadwalkan ulang (SM-2)." },
  { icon: Headphones, title: "Empat keterampilan", text: "Reading, listening, speaking, dan writing lab dengan materi sesuai level dan rubrik penilaian yang jelas." },
  { icon: Flame, title: "Gamifikasi yang adil", text: "XP, streak berbasis zona waktu, achievement, daily challenge, dan leaderboard opt-in — dengan perlindungan dari manipulasi." },
];

const SKILLS = [
  { icon: Layers, label: "Vocabulary & flashcards" },
  { icon: BookOpenCheck, label: "Grammar reference" },
  { icon: Headphones, label: "Listening lab" },
  { icon: Mic, label: "Speaking lab" },
  { icon: PenLine, label: "Writing lab" },
  { icon: BarChart3, label: "Analytics" },
];

export default async function HomePage() {
  const supabase = createPublicClient();
  const [{ data: stats }, { data: levels }, sampleIds] = await Promise.all([
    supabase.rpc("public_platform_stats"),
    supabase.from("levels").select("code, name, name_id, description").order("sort_order"),
    sampleQuestionIds(3),
  ]);
  const samples = await loadClientQuestions(sampleIds);
  const s = (stats ?? {}) as Record<string, number>;
  const statItems = [
    { value: s.levels, label: "level CEFR" },
    { value: s.lessons, label: "lesson terbit" },
    { value: s.questions, label: "soal di bank soal" },
    { value: s.vocabulary, label: "entri kosakata" },
  ].filter((x) => typeof x.value === "number");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] opacity-60" aria-hidden />
        <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <HeroMotion>
            <p data-hero className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5 text-primary" /> Kurikulum A1–C2 berbasis CEFR untuk penutur bahasa Indonesia
            </p>
            <h1 data-hero className="text-display mt-6 font-extrabold text-balance">
              Belajar bahasa Inggris dengan <span className="text-gradient">jalur yang jelas</span> dan latihan yang benar-benar dinilai.
            </h1>
            <p data-hero className="mt-5 max-w-xl text-lg text-muted-foreground">
              Linguora menggabungkan learning path terstruktur, bank soal interaktif, ujian bertingkat, dan spaced repetition — dari menyapa dalam bahasa Inggris hingga menulis esai akademik.
            </p>
            <div data-hero className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href="/register">
                  Mulai gratis <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <Link href="/placement-test">Cek level kamu</Link>
              </Button>
            </div>
          </HeroMotion>
          <ProductPreview />
        </div>
      </section>

      {/* Real platform statistics */}
      {statItems.length > 0 && (
        <section aria-label="Statistik platform" className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
            {statItems.map((x) => (
              <div key={x.label} className="text-center">
                <p className="text-3xl font-bold tabular-nums md:text-4xl">{Number(x.value).toLocaleString("id-ID")}</p>
                <p className="text-sm text-muted-foreground">{x.label}</p>
              </div>
            ))}
          </div>
          <p className="pb-6 text-center text-xs text-muted-foreground">Angka dihitung langsung dari database konten Linguora.</p>
        </section>
      )}

      {/* Learning path */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary dark:text-brand-lavender">Learning path</p>
          <h2 className="text-title mt-2 font-bold">Enam level, satu jalur yang berkesinambungan</h2>
          <p className="mt-3 text-muted-foreground">Setiap level berisi 10 unit, 50 lesson, unit assessment, dan ujian level. Level berikutnya terbuka setelah kamu lulus ujian.</p>
        </div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(levels ?? []).map((l, i) => (
            <li key={l.code} className="relative rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className={`flex size-11 items-center justify-center rounded-xl font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{l.code}</span>
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.name_id}</p>
                </div>
                {i > 0 && <Lock className="ml-auto size-4 text-muted-foreground" aria-label="Terbuka setelah lulus level sebelumnya" />}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{l.description}</p>
            </li>
          ))}
        </ol>
        <Button asChild variant="link" className="mt-4 px-0">
          <Link href="/curriculum">
            Lihat kurikulum lengkap <ArrowRight />
          </Link>
        </Button>
      </section>

      {/* Features */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary dark:text-brand-lavender">Fitur unggulan</p>
            <h2 className="text-title mt-2 font-bold">Dibangun untuk belajar yang terukur</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="space-y-3">
                  <div className="w-fit rounded-xl bg-primary/10 p-2.5 text-primary dark:text-brand-lavender">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {SKILLS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
                <Icon className="size-4 text-primary" aria-hidden /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Sample exercises */}
      {samples.length > 0 && (
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-primary dark:text-brand-lavender">Coba sekarang</p>
            <h2 className="text-title mt-2 font-bold">Contoh latihan dari Unit 1 level A1</h2>
            <p className="mt-3 text-muted-foreground">Jawab soal berikut tanpa mendaftar. Pembahasan muncul setelah kamu menjawab — persis seperti latihan terpandu di dalam lesson.</p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Feedback instan dengan pembahasan", "Jawaban alternatif yang valid diterima", "Partial credit untuk soal bertingkat"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <SampleExercises questions={samples} />
        </section>
      )}

      {/* FAQ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-title text-center font-bold">Pertanyaan umum</h2>
          <FaqList items={FAQS.slice(0, 5)} className="mt-8" />
          <p className="mt-6 text-center text-sm">
            <Link href="/faq" className="font-medium text-primary hover:underline">
              Lihat semua FAQ
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div className="bg-grid absolute inset-0 opacity-15" aria-hidden />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <Target className="mx-auto size-10" aria-hidden />
            <h2 className="text-3xl font-bold md:text-4xl">Mulai dari level yang tepat hari ini</h2>
            <p className="text-primary-foreground/80">Daftar gratis, ikuti placement test, dan dapatkan rekomendasi level serta learning track sesuai tujuanmu.</p>
            <Button asChild size="lg" variant="secondary" className="h-11 px-6">
              <Link href="/register">
                Buat akun gratis <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/** Static illustration of the learning path UI (no fabricated user data). */
function ProductPreview() {
  const nodes = [
    { t: "Greetings and Goodbyes", s: "done" },
    { t: "The Verb To Be", s: "done" },
    { t: "Countries & Nationalities", s: "current" },
    { t: "The Alphabet & Spelling", s: "locked" },
  ];
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-brand-blue/10 to-brand-lavender/30 blur-2xl" />
      <div className="relative rounded-3xl border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-xs text-muted-foreground">Level A1 · Unit 1</p>
            <p className="font-semibold">Hello! Introducing Yourself</p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Ilustrasi</span>
        </div>
        <ol className="mt-4 space-y-3">
          {nodes.map((n) => (
            <li key={n.t} className="flex items-center gap-3 rounded-xl border p-3">
              <span
                className={`flex size-9 items-center justify-center rounded-full border-2 ${n.s === "done" ? "border-success bg-success text-white" : n.s === "current" ? "border-primary text-primary ring-4 ring-primary/15" : "border-border bg-muted text-muted-foreground"}`}
              >
                {n.s === "done" ? <CheckCircle2 className="size-4" /> : n.s === "current" ? <Route className="size-4" /> : <Lock className="size-4" />}
              </span>
              <span className="text-sm font-medium">{n.t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-xl bg-muted p-4">
          <p className="text-xs font-semibold text-muted-foreground">Contoh soal · Fill in the blank</p>
          <p className="mt-2 text-sm">
            A: Where are you from? B: I <span className="rounded border-b-2 border-primary px-2 font-semibold text-primary">am</span> from Indonesia.
          </p>
        </div>
      </div>
    </div>
  );
}
