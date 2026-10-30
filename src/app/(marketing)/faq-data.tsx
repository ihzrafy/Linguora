import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQS = [
  {
    q: "Apakah Linguora memberikan sertifikat CEFR resmi?",
    a: "Tidak. CEFR kami gunakan sebagai acuan penyusunan kurikulum. Setelah lulus ujian level, kamu mendapat sertifikat internal Linguora sebagai tanda penyelesaian kurikulum — bukan sertifikasi resmi.",
  },
  {
    q: "Seberapa akurat placement test?",
    a: "Placement test berisi soal bertingkat dari A1 hingga C2 dan memberikan estimasi level, kekuatan, serta kelemahan per kategori. Hasilnya adalah estimasi, bukan pengukuran sempurna — kamu tetap dapat mempelajari level di bawahnya kapan saja.",
  },
  {
    q: "Mengapa lesson berikutnya terkunci?",
    a: "Lesson dibuka berurutan agar materi dipelajari dengan prasyarat yang tepat. Selesaikan materi dan raih minimal 70% pada mini quiz untuk membuka lesson berikutnya. Unit berikutnya terbuka setelah kamu lulus unit assessment.",
  },
  {
    q: "Apakah jawaban saya dinilai otomatis?",
    a: "Soal objektif (pilihan ganda, isian, urutan kata, matching, dan lainnya) dinilai otomatis di server dengan normalisasi dan varian jawaban yang diterima. Esai dan speaking dinilai dengan rubrik oleh reviewer, karena penilaian otomatis untuk jenis ini tidak sepenuhnya akurat.",
  },
  {
    q: "Bagaimana audio listening dibuat?",
    a: "Jika materi memiliki file audio, audio tersebut diputar langsung. Jika belum, teks dibacakan dengan text-to-speech bawaan browser — dan kami selalu menandainya sebagai audio text-to-speech.",
  },
  {
    q: "Apakah ada AI tutor?",
    a: "AI tutor adalah fitur tambahan yang hanya aktif jika penyedia AI telah dikonfigurasi oleh pengelola platform. Seluruh fitur inti Linguora tetap dapat digunakan tanpa AI. Feedback AI dapat keliru dan dipisahkan dari kurikulum yang sudah diverifikasi.",
  },
  {
    q: "Apakah Linguora gratis?",
    a: "Saat ini seluruh fitur inti dapat digunakan gratis. Jika kelak ada paket berbayar, harga dan isinya akan diumumkan dengan jelas sebelum berlaku.",
  },
  {
    q: "Bagaimana data saya digunakan?",
    a: "Data belajar digunakan untuk menampilkan progres, merekomendasikan latihan, dan menjalankan fitur gamifikasi. Leaderboard bersifat opt-in dan hanya menampilkan username. Kamu dapat menghapus akun beserta datanya dari halaman pengaturan.",
  },
];

export function FaqList({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <Accordion type="single" collapsible className={className}>
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`faq-${i}`}>
          <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
