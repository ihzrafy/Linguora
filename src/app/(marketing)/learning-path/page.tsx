import type { Metadata } from "next";
import { Check, CircleDot, ClipboardCheck, Crown, Lock, Play, RotateCcw, Trophy } from "lucide-react";
import { PublicCta, PublicHero } from "../_components";

export const metadata: Metadata = { title: "Learning Path", description: "Cara kerja learning path Linguora: prasyarat, status lesson, unit assessment, dan ujian level." };

const STATUSES = [
  { icon: Lock, label: "Locked", text: "Prasyarat belum terpenuhi." },
  { icon: Play, label: "Available", text: "Siap dipelajari." },
  { icon: CircleDot, label: "In Progress", text: "Materi sedang dipelajari atau quiz belum lulus." },
  { icon: Check, label: "Completed", text: "Mini quiz lulus (≥ 70%)." },
  { icon: Crown, label: "Mastered", text: "Skor mini quiz ≥ 90%." },
  { icon: RotateCcw, label: "Needs Review", text: "Jadwal spaced repetition sudah jatuh tempo." },
];

const STEPS = [
  { t: "Pelajari materi", d: "Setiap lesson berisi tujuan, penjelasan, contoh, kosakata, pola grammar, kesalahan umum, latihan terpandu dan mandiri, ringkasan, serta kartu review." },
  { t: "Lulus mini quiz", d: "Setelah menandai materi selesai, kerjakan mini quiz. Skor ≥ 70% menyelesaikan lesson dan membuka lesson berikutnya." },
  { t: "Lulus unit assessment", d: "Setelah kelima lesson selesai, unit assessment terbuka. Lulus untuk membuka unit berikutnya." },
  { t: "Lulus ujian level", d: "Ketika semua unit selesai, ujian level terbuka. Lulus untuk membuka level berikutnya dan mendapatkan sertifikat internal." },
  { t: "Review berkala", d: "Lesson yang selesai dan soal yang salah masuk ke review queue agar tidak terlupa." },
];

export default function LearningPathPage() {
  return (
    <>
      <PublicHero eyebrow="Learning path" title="Belajar berurutan, naik level dengan bukti" description="Semua aturan progresi dijalankan di server sehingga materi terkunci benar-benar tidak dapat diakses sebelum prasyaratnya terpenuhi." />
      <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6">
        <section>
          <h2 className="mb-6 text-2xl font-bold">Alur belajar</h2>
          <ol className="relative space-y-6 border-l-2 border-dashed pl-8">
            {STEPS.map((s, i) => (
              <li key={s.t} className="relative">
                <span className="absolute -left-[2.85rem] flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <p className="font-semibold">{s.t}</p>
                <p className="text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="mb-6 text-2xl font-bold">Status lesson</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STATUSES.map(({ icon: Icon, label, text }) => (
              <div key={label} className="flex gap-3 rounded-xl border bg-card p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <ClipboardCheck className="mb-3 size-6 text-primary" />
            <p className="font-semibold">Unit assessment</p>
            <p className="text-sm text-muted-foreground">12 soal acak dari bank soal unit, batas waktu 20 menit, lulus ≥ 70%. Dapat diulang.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <Trophy className="mb-3 size-6 text-primary" />
            <p className="font-semibold">Ujian level</p>
            <p className="text-sm text-muted-foreground">30 soal sesuai blueprint keterampilan, batas waktu 45 menit, lulus ≥ 70%, masa tunggu 12 jam bila belum lulus.</p>
          </div>
        </section>
      </div>
      <PublicCta />
    </>
  );
}
