import type { Metadata } from "next";
import { PublicCta, PublicHero } from "../_components";

export const metadata: Metadata = { title: "Tentang", description: "Tentang Linguora dan prinsip yang kami pegang dalam membangun platform belajar bahasa Inggris." };

const PRINCIPLES = [
  { t: "Pedagogi lebih dulu", d: "Materi disusun berurutan dengan prasyarat yang jelas. Kami tidak melompat ke konsep lanjutan sebelum dasarnya dikuasai." },
  { t: "Jujur tentang data", d: "Statistik di situs dihitung dari database. Kami tidak menampilkan testimoni atau angka pengguna fiktif." },
  { t: "Penilaian yang adil", d: "Jawaban dinilai di server. Esai dan speaking dinilai dengan rubrik, dan keterbatasan penilaian otomatis kami sampaikan terbuka." },
  { t: "Privasi", d: "Leaderboard bersifat opt-in, email tidak pernah ditampilkan, dan kamu dapat menghapus akun kapan saja." },
];

export default function AboutPage() {
  return (
    <>
      <PublicHero eyebrow="Tentang Linguora" title="Belajar bahasa Inggris yang terstruktur dan terukur" description="Linguora dibuat untuk penutur bahasa Indonesia yang ingin belajar bahasa Inggris dari nol hingga mahir dengan jalur yang jelas." />
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-16 sm:px-6">
        <p className="text-lg text-muted-foreground">
          Banyak pelajar berhenti di tengah jalan karena materi yang tidak berurutan, latihan yang tidak memberi umpan balik, atau target yang tidak jelas. Linguora menggabungkan kurikulum berbasis CEFR, bank soal interaktif, sistem ujian, dan spaced repetition dalam satu platform sehingga setiap langkah belajar punya tujuan dan bukti kemajuan.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.t} className="rounded-2xl border bg-card p-6">
              <p className="font-semibold">{p.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
      <PublicCta />
    </>
  );
}
