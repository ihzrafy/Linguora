import Link from "next/link";
import { Lock } from "lucide-react";
import { Mark, PillLink, SectionLabel } from "@/components/marketing/editorial";
import { loadClientQuestions } from "@/lib/learning/questions-server";
import { createPublicClient } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { FaqList, FAQS } from "./faq-data";
import { HeroMotion } from "./hero-motion";
import { SpecimenPlay } from "./hero-specimen";
import { sampleQuestionIds } from "./sample-actions";
import { SampleExercises } from "./sample-exercises";

const FEATURES = [
  { title: "Learning path terkunci & terarah", text: "Unit dan lesson terbuka sesuai prasyarat. Aturan progresi dijalankan di server, bukan sekadar disembunyikan di tampilan." },
  { title: "Bank soal 20 tipe", text: "Pilihan ganda, isian, drag & drop, urutkan kata, matching, error identification, translation, dikte, hingga speaking." },
  { title: "Penilaian di server", text: "Kunci jawaban tidak pernah dikirim ke browser sebelum kamu menjawab. Skor, XP, dan kelulusan dihitung di server." },
  { title: "Latihan adaptif & spaced repetition", text: "Topik yang sering salah mendapat porsi lebih besar; materi yang mulai terlupa dijadwalkan ulang (SM-2)." },
  { title: "Empat keterampilan", text: "Reading, listening, speaking, dan writing lab dengan materi sesuai level dan rubrik penilaian yang jelas." },
  { title: "Gamifikasi yang adil", text: "XP, streak berbasis zona waktu, achievement, daily challenge, dan leaderboard opt-in — dengan perlindungan dari manipulasi." },
];

const SKILLS = ["Vocabulary & flashcards", "Grammar reference", "Listening lab", "Speaking lab", "Writing lab", "Analytics"];

/** One masked line of a display heading; HeroMotion slides `[data-line]` up into view. */
function Line({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("-mx-[0.08em] -mb-[0.12em] block overflow-hidden px-[0.08em] pb-[0.12em]", className)}>
      <span data-line className="block">
        {children}
      </span>
    </span>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ accountDeleted?: string }> }) {
  const { accountDeleted } = await searchParams;
  const supabase = createPublicClient();
  const [{ data: stats }, { data: levels }, sampleIds] = await Promise.all([
    supabase.rpc("public_platform_stats"),
    supabase.from("levels").select("code, name, name_id, description").order("sort_order"),
    sampleQuestionIds(3),
  ]);
  const samples = await loadClientQuestions(sampleIds);
  const s = (stats ?? {}) as Record<string, number>;
  const statItems = [
    { value: s.levels, label: "Level CEFR" },
    { value: s.lessons, label: "Lesson terbit" },
    { value: s.questions, label: "Soal di bank soal" },
    { value: s.vocabulary, label: "Entri kosakata" },
  ].filter((x) => typeof x.value === "number");
  const levelList = levels ?? [];

  return (
    <>
      {accountDeleted && (
        <div role="status" className="border-b bg-secondary">
          <p className="container-site py-3 text-sm">Akunmu dan seluruh data belajarmu telah dihapus. Terima kasih sudah belajar bersama Linguora.</p>
        </div>
      )}
      {/* Hero */}
      <section aria-labelledby="hero-title" className="pt-10 pb-20 md:pt-14 md:pb-28">
        <HeroMotion className="container-site">
          <div data-hero className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b pb-5">
            <SectionLabel>Kurikulum bahasa Inggris · CEFR A1–C2</SectionLabel>
            <p className="hidden font-display text-base font-medium tracking-[-0.01em] md:block">Dari menyapa sampai menulis esai.</p>
          </div>

          <h1 id="hero-title" className="type-hero mt-10 md:mt-14">
            <Line>Bahasa Inggris,</Line>
            <Line className="md:pl-[11%]">selangkah demi</Line>
            <Line>
              <Mark>selangkah.</Mark>
            </Line>
          </h1>

          <div className="mt-14 grid items-start gap-14 md:mt-20 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4 lg:pt-6">
              <p data-hero className="type-lead max-w-[38ch] text-foreground/80">
                Jalur belajar yang tersusun rapi dari pemula hingga mahir — latihan yang dinilai teliti, pembahasan dalam bahasa Indonesia, dan pengulangan di waktu yang tepat.
              </p>
              <div data-hero className="mt-9 flex flex-wrap gap-3">
                <PillLink href="/register" variant="lime" size="lg">
                  Mulai belajar gratis
                </PillLink>
                <PillLink href="/placement-test" variant="outline" size="lg">
                  Cek level kamu
                </PillLink>
              </div>
            </div>
            <div data-hero className="lg:col-span-8">
              <HeroVisual levels={levelList.map((l) => l.code)} />
            </div>
          </div>
        </HeroMotion>
      </section>

      {/* Real platform statistics */}
      {statItems.length > 0 && (
        <section aria-label="Statistik platform" className="border-y">
          <div className="container-site grid gap-y-8 py-10 md:py-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-3">
              <SectionLabel>Isi Linguora hari ini</SectionLabel>
              <p className="mt-3 text-sm text-muted-foreground">Dihitung langsung dari database konten.</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:col-span-9">
              {statItems.map((x) => (
                <div key={x.label} className="flex flex-col-reverse gap-2 border-l pl-5">
                  <dt className="type-eyebrow text-muted-foreground">{x.label}</dt>
                  <dd className="font-display text-[clamp(2.25rem,1.4rem+2.4vw,3.75rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                    {Number(x.value).toLocaleString("id-ID")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Learning path */}
      <section className="section-y">
        <div className="container-site">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel index="01">Learning path</SectionLabel>
              <h2 className="type-h2 mt-6">
                Enam level.
                <br />
                <Mark>Satu jalur.</Mark>
              </h2>
            </div>
            <p className="type-lead text-muted-foreground lg:col-span-4 lg:col-start-9">
              Setiap level berisi 10 unit, 50 lesson, unit assessment, dan ujian level. Level berikutnya terbuka setelah kamu lulus ujian.
            </p>
          </div>

          <ol className="mt-14 border-t md:mt-20">
            {levelList.map((l, i) => (
              <li key={l.code} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-5 gap-y-2 border-b py-7 md:grid-cols-12 md:items-center md:gap-x-8 md:py-9">
                <span className="font-display text-4xl font-semibold tracking-[-0.04em] md:col-span-2 md:text-6xl">{l.code}</span>
                <div className="md:col-span-4">
                  <p className="font-display text-xl font-medium tracking-[-0.02em] md:text-2xl">{l.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{l.name_id}</p>
                </div>
                <span className="justify-self-end md:order-last md:col-span-1">
                  {i === 0 ? (
                    <span className="type-eyebrow rounded-full bg-lime px-3 py-1.5 text-lime-ink">Mulai</span>
                  ) : (
                    <Lock className="size-4 text-muted-foreground" aria-label="Terbuka setelah lulus level sebelumnya" />
                  )}
                </span>
                <p className="col-span-full text-muted-foreground md:col-span-5">{l.description}</p>
              </li>
            ))}
          </ol>
          <PillLink href="/curriculum" variant="outline" className="mt-10">
            Lihat kurikulum lengkap
          </PillLink>
        </div>
      </section>

      {/* Features */}
      <section className="section-y bg-ink text-ink-foreground">
        <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <SectionLabel index="02" tone="ink">
              Fitur
            </SectionLabel>
            <h2 className="type-h2 mt-6">
              Dibangun untuk belajar yang <Mark variant="text">terukur.</Mark>
            </h2>
            <p className="type-lead mt-6 max-w-md text-ink-muted">Bukan sekadar kumpulan materi — setiap jawaban dinilai, setiap kemajuan tercatat.</p>
            <ul className="mt-8 flex max-w-md flex-wrap gap-2" aria-label="Modul belajar">
              {SKILLS.map((label) => (
                <li key={label} className="rounded-full border border-ink-line px-3 py-1.5 font-mono text-xs text-ink-foreground/85">
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <ol className="border-t border-ink-line lg:col-span-6 lg:col-start-7">
            {FEATURES.map(({ title, text }, i) => (
              <li key={title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-ink-line py-8 md:py-10">
                <span className="pt-1.5 font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="type-h3">{title}</h3>
                  <p className="mt-3 max-w-lg text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sample exercises */}
      {samples.length > 0 && (
        <section className="section-y">
          <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <SectionLabel index="03">Coba sekarang</SectionLabel>
              <h2 className="type-h2 mt-6">
                Jawab dulu,
                <br />
                <Mark>daftar nanti.</Mark>
              </h2>
              <p className="type-lead mt-6 max-w-md text-muted-foreground">
                Contoh latihan dari Unit 1 level A1. Pembahasan muncul setelah kamu menjawab — persis seperti latihan terpandu di dalam lesson.
              </p>
              <ul className="mt-8 space-y-3">
                {["Feedback instan dengan pembahasan", "Jawaban alternatif yang valid diterima", "Partial credit untuk soal bertingkat"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span aria-hidden className="size-1.5 shrink-0 bg-lime ring-1 ring-foreground/15" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <SampleExercises questions={samples} />
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="section-y border-t">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionLabel index="04">FAQ</SectionLabel>
            <h2 className="type-h2 mt-6">
              Pertanyaan
              <br />
              umum.
            </h2>
            <Link href="/faq" className="mt-8 inline-block border-b border-foreground/30 pb-0.5 font-medium transition-colors hover:border-foreground">
              Lihat semua FAQ
            </Link>
          </div>
          <FaqList items={FAQS.slice(0, 5)} className="lg:col-span-7 lg:col-start-6" />
        </div>
      </section>

      {/* CTA */}
      <section className="section-y border-t">
        <div className="container-site">
          <SectionLabel index="05">Mulai</SectionLabel>
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-12 lg:gap-8">
            <h2 className="type-hero lg:col-span-8">
              Mulai dari level yang <Mark>tepat.</Mark>
            </h2>
            <div className="lg:col-span-4">
              <p className="type-lead text-muted-foreground">Daftar gratis, ikuti placement test, dan dapatkan rekomendasi level serta learning track sesuai tujuanmu.</p>
              <PillLink href="/register" variant="lime" size="lg" className="mt-8">
                Buat akun gratis
              </PillLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Hero composition: a first-lesson specimen and the CEFR staircase on a quiet gridded panel. */
function HeroVisual({ levels }: { levels: string[] }) {
  const text = "Where are you from?";
  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] border bg-secondary p-5 sm:p-8 lg:p-10"
      style={{
        backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <div aria-hidden className="absolute -top-28 -right-24 size-80 rounded-full bg-lime" />
      <p className="relative inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-lime" /> Contoh pelajaran pertama
      </p>

      <div className="relative mt-6 grid gap-5 sm:mt-10 sm:grid-cols-[1.35fr_1fr] sm:items-end">
        <figure className="rounded-2xl border bg-card p-6 shadow-[0_24px_48px_-28px_rgb(0_0_0/0.35)] sm:-rotate-1 sm:p-8">
          <div className="type-eyebrow flex justify-between text-muted-foreground">
            <span>Lesson 1</span>
            <span>A1 · Greetings</span>
          </div>
          <blockquote className="mt-8 font-display text-[clamp(1.9rem,1.3rem+1.6vw,2.6rem)] leading-[1.05] font-medium tracking-[-0.035em]">&ldquo;{text}&rdquo;</blockquote>
          <p className="mt-3 font-[family-name:Charis_SIL,Doulos_SIL,Segoe_UI,Lucida_Grande,Arial_Unicode_MS,sans-serif] tracking-wide text-muted-foreground">/weər ɑː juː frɒm/</p>
          <figcaption className="mt-5 border-l-2 border-lime pl-4 text-muted-foreground">Kamu berasal dari mana?</figcaption>
          <div className="mt-8">
            <SpecimenPlay text={text} />
          </div>
        </figure>

        {levels.length > 0 && (
          <div className="rounded-2xl bg-ink p-6 text-ink-foreground sm:rotate-2">
            <p className="type-eyebrow text-ink-muted">Jalur CEFR</p>
            <ol aria-label="Enam level CEFR" className="mt-6 flex items-end gap-1.5">
              {levels.map((code, i) => (
                <li key={code} className="flex flex-1 flex-col items-center gap-2">
                  <span aria-hidden className={cn("w-full rounded-t-[4px]", i === 0 ? "bg-lime" : "bg-white/12")} style={{ height: `${16 + i * 11}px` }} />
                  <span className={cn("font-mono text-[0.7rem]", i === 0 ? "text-lime" : "text-ink-muted")}>{code}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-ink-muted">Mulai dari level mana pun — placement test menentukan titik awalmu.</p>
          </div>
        )}
      </div>
    </div>
  );
}
