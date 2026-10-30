import type { Metadata } from "next";
import { BarChart3, BookA, Bot, Brain, CalendarCheck, ClipboardCheck, Flame, Headphones, Layers, ListChecks, Mic, PenLine, Route, ShieldCheck, SpellCheck, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PublicCta, PublicHero } from "../_components";

export const metadata: Metadata = { title: "Fitur", description: "Fitur lengkap Linguora: learning path, bank soal, ujian, latihan adaptif, empat keterampilan, gamifikasi, dan analytics." };

const GROUPS = [
  {
    title: "Learning engine",
    items: [
      { icon: Route, t: "Learning path interaktif", d: "Peta progres dengan status Locked, Available, In Progress, Completed, Mastered, dan Needs Review." },
      { icon: ListChecks, t: "Placement test bertingkat", d: "Soal A1–C2 dengan timer opsional, penyimpanan otomatis, dan rekomendasi level & track." },
      { icon: ClipboardCheck, t: "Tiga jenis evaluasi", d: "Mini quiz per lesson, unit assessment, dan ujian level dengan acak soal, batas waktu, dan aturan ulang." },
      { icon: ShieldCheck, t: "Grading di server", d: "Normalisasi jawaban, varian yang diterima, partial credit, dan audit trail setiap hasil ujian." },
    ],
  },
  {
    title: "Personalisasi",
    items: [
      { icon: Brain, t: "Latihan adaptif", d: "Algoritma berbasis aturan yang transparan: fokus pada kelemahan dan naik kesulitan saat kamu menguasai materi." },
      { icon: Layers, t: "Spaced repetition", d: "Jadwal review SM-2 untuk kosakata, soal yang salah, dan lesson yang sudah selesai." },
      { icon: CalendarCheck, t: "Study planner", d: "Target harian & mingguan, kalender belajar, timer sesi dan mode Pomodoro, serta jurnal belajar." },
      { icon: BarChart3, t: "Analytics", d: "Akurasi per keterampilan dan topik, waktu belajar, serta riwayat dalam rentang 7/30/90 hari." },
    ],
  },
  {
    title: "Empat keterampilan",
    items: [
      { icon: BookA, t: "Vocabulary & flashcards", d: "Kamus dengan IPA, arti, contoh, sinonim, kolokasi; wordbook pribadi dan koleksi." },
      { icon: SpellCheck, t: "Grammar reference", d: "Topik grammar yang dapat dicari dengan formula, contoh positif/negatif/tanya, dan latihan." },
      { icon: Headphones, t: "Reading & listening lab", d: "Teks dan dialog sesuai level dengan pertanyaan main idea, detail, inference, dan vocabulary-in-context." },
      { icon: Mic, t: "Speaking lab", d: "Prompt terpandu, role-play, rekaman suara, dan transkrip speech recognition bila browser mendukung." },
      { icon: PenLine, t: "Writing lab", d: "Draft tersimpan otomatis, rubrik 5 kriteria, dan penilaian reviewer." },
      { icon: Bot, t: "AI tutor (opsional)", d: "Penjelasan grammar, koreksi kalimat, dan simulasi percakapan — aktif hanya jika penyedia AI dikonfigurasi." },
    ],
  },
  {
    title: "Motivasi",
    items: [
      { icon: Flame, t: "Streak & target harian", d: "Dihitung berdasarkan zona waktu kamu dan tahan terhadap permintaan ganda." },
      { icon: Trophy, t: "Achievement & leaderboard", d: "Achievement bertahap, daily quest, weekly challenge, dan leaderboard opt-in tanpa menampilkan email." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PublicHero eyebrow="Fitur" title="Semua yang kamu butuhkan untuk naik level" description="Linguora menggabungkan LMS, latihan bahasa, sistem ujian, vocabulary trainer, dan analytics dalam satu platform yang saling terhubung." />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        {GROUPS.map((g) => (
          <section key={g.title} className="space-y-5">
            <h2 className="text-2xl font-bold">{g.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ icon: Icon, t, d }) => (
                <Card key={t}>
                  <CardContent className="space-y-2">
                    <Icon className="size-6 text-primary dark:text-brand-lavender" aria-hidden />
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <PublicCta />
    </>
  );
}
