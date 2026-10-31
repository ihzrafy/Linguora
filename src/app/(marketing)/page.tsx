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
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadClientQuestions } from "@/lib/learning/questions-server";
import { createPublicClient } from "@/lib/supabase/public";
import { FaqList, FAQS } from "./faq-data";
import { HeroMotion } from "./hero-motion";
import { SpecimenPlay } from "./hero-specimen";
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
      <section className="border-b">
        <HeroMotion className="mx-auto grid max-w-7xl items-center gap-16 px-4 pt-16 pb-16 sm:px-6 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:px-8 lg:pb-24">
          <div>
            <p data-hero className="flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              <span className="h-px w-8 bg-foreground/30" aria-hidden />
              Kurikulum bahasa Inggris · A1–C2
            </p>
            <h1 data-hero className="mt-7 font-display text-[clamp(3rem,6.4vw,5.5rem)] leading-[1] tracking-[-0.015em] text-balance">
              Bahasa Inggris,
              <br />
              <em className="text-primary dark:text-brand-lavender">selangkah demi selangkah.</em>
            </h1>
            <p data-hero className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Jalur belajar yang tersusun rapi dari pemula hingga mahir — latihan yang dinilai dengan teliti, pembahasan dalam bahasa Indonesia, dan pengulangan di waktu yang tepat.
            </p>
            <div data-hero className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-[0.95rem]">
                <Link href="/register">Mulai belajar gratis</Link>
              </Button>
              <Link href="/placement-test" className="group inline-flex items-center gap-2 text-[0.95rem] font-medium underline-offset-4 hover:underline">
                Cek level kamu
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            {/* Real platform statistics */}
            {statItems.length > 0 && (
              <div data-hero className="mt-14 max-w-lg border-t pt-6">
                <dl aria-label="Statistik platform" className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                  {statItems.map((x) => (
                    <div key={x.label}>
                      <dt className="sr-only">{x.label}</dt>
                      <dd className="font-display text-3xl tabular-nums">{Number(x.value).toLocaleString("id-ID")}</dd>
                      <dd aria-hidden className="mt-0.5 text-xs text-muted-foreground">{x.label}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-[0.7rem] text-muted-foreground/80">Dihitung langsung dari database konten Linguora.</p>
              </div>
            )}
          </div>

          <HeroSpecimen levels={(levels ?? []).map((l) => ({ code: l.code, name: l.name }))} />
        </HeroMotion>
      </section>

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

/** A quiet "specimen" of a first lesson, plus the six-step level staircase. */
function HeroSpecimen({ levels }: { levels: { code: string; name: string }[] }) {
  const text = "Where are you from?";
  return (
    <figure data-hero className="relative mx-auto w-full max-w-md lg:mr-0">
      <div className="rounded-[1.75rem] border bg-card p-8 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)] sm:p-10">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span className="tracking-[0.2em] uppercase">Lesson 1</span>
          <span>A1 · Greetings</span>
        </div>
        <blockquote className="mt-10 font-display text-[2.15rem] leading-[1.1] sm:text-[2.6rem]">&ldquo;{text}&rdquo;</blockquote>
        <p className="mt-3 font-[family-name:Charis_SIL,Doulos_SIL,Segoe_UI,Lucida_Grande,Arial_Unicode_MS,sans-serif] text-[0.95rem] tracking-wide text-muted-foreground">/weər ɑː juː frɒm/</p>
        <p className="mt-6 border-l-2 border-primary/40 pl-4 text-[0.95rem] italic text-muted-foreground dark:border-brand-lavender/50">Kamu berasal dari mana?</p>
        <div className="mt-10">
          <SpecimenPlay text={text} />
        </div>
      </div>

      {levels.length > 0 && (
        <figcaption className="mt-10 px-2">
          <ol aria-label="Enam level CEFR" className="flex items-end gap-2">
            {levels.map((l, i) => (
              <li key={l.code} className="flex flex-1 flex-col items-center gap-2" title={l.name}>
                <span
                  aria-hidden
                  className={i === 0 ? "w-full rounded-t-md bg-primary dark:bg-brand-lavender" : "w-full rounded-t-md bg-foreground/[0.07]"}
                  style={{ height: `${12 + i * 8}px` }}
                />
                <span className={i === 0 ? "text-xs font-semibold text-foreground" : "text-xs text-muted-foreground"}>{l.code}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-center text-xs text-muted-foreground">Enam level, satu jalur — mulai dari mana pun level kamu sekarang.</p>
        </figcaption>
      )}
    </figure>
  );
}
