import type { Metadata } from "next";
import { Markdown } from "@/components/shared/markdown";
import { PublicHero } from "../_components";

export const metadata: Metadata = { title: "Syarat Layanan" };

const TERMS = `
Dengan membuat akun atau menggunakan Linguora, kamu menyetujui syarat berikut. Dokumen ini adalah templat awal dan perlu ditinjau oleh penasihat hukum sebelum layanan dioperasikan secara komersial.

### 1. Akun
- Kamu bertanggung jawab menjaga kerahasiaan password dan aktivitas di akunmu.
- Satu akun digunakan oleh satu orang. Informasi yang kamu berikan harus benar.

### 2. Penggunaan yang diperbolehkan
- Linguora disediakan untuk keperluan belajar pribadi.
- Dilarang mencoba memanipulasi skor, XP, atau leaderboard; mengakses data pengguna lain; atau mengganggu keamanan dan ketersediaan layanan.
- Dilarang menyalin dan mendistribusikan ulang bank soal atau materi tanpa izin tertulis.

### 3. Konten pembelajaran dan penilaian
- CEFR digunakan sebagai acuan kurikulum. Sertifikat Linguora adalah sertifikat internal, bukan sertifikasi CEFR resmi.
- Hasil placement test dan penilaian otomatis adalah estimasi. Feedback AI (jika diaktifkan) dapat keliru dan tidak menggantikan penilaian pengajar.

### 4. Konten pengguna
- Tulisan, rekaman, dan catatan yang kamu buat tetap milikmu. Kamu memberi izin kepada Linguora untuk menyimpan dan memprosesnya guna menjalankan fitur (misalnya penilaian oleh reviewer).

### 5. Penghentian
- Kamu dapat menghapus akun kapan saja dari halaman Pengaturan. Kami dapat menangguhkan akun yang melanggar syarat ini.

### 6. Perubahan
- Syarat ini dapat diperbarui. Perubahan penting akan diumumkan melalui aplikasi.
`;

export default function TermsPage() {
  return (
    <>
      <PublicHero eyebrow="Legal" title="Syarat Layanan" description="Terakhir diperbarui: 30 Oktober 2026" />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Markdown>{TERMS}</Markdown>
      </div>
    </>
  );
}
