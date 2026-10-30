import type { Metadata } from "next";
import { Markdown } from "@/components/shared/markdown";
import { PublicHero } from "../_components";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

const PRIVACY = `
Dokumen ini menjelaskan data yang dikumpulkan Linguora dan cara penggunaannya. Ini adalah templat awal dan perlu ditinjau oleh penasihat hukum sebelum layanan dioperasikan secara komersial.

### Data yang kami simpan
| Data | Tujuan |
| --- | --- |
| Email, nama, username | Autentikasi dan identitas di aplikasi |
| Zona waktu, target belajar, preferensi | Menghitung streak dan target harian dengan benar |
| Jawaban, skor, progres, XP | Menampilkan progres, menilai, dan merekomendasikan latihan |
| Tulisan, transkrip, rekaman suara (opsional) | Writing lab, speaking lab, dan penilaian reviewer |
| Pesan AI tutor (jika fitur aktif) | Menjalankan percakapan dan membatasi penggunaan |

### Yang tidak kami lakukan
- Kami tidak menjual data pribadi.
- Email tidak pernah ditampilkan kepada pengguna lain. Leaderboard bersifat **opt-in** dan hanya menampilkan username serta XP.
- Analytics di aplikasi hanya memakai data belajarmu sendiri; laporan pengelola bersifat agregat.

### Pihak ketiga
- Data disimpan di Supabase (database, autentikasi, penyimpanan berkas).
- Jika AI tutor diaktifkan, teks yang kamu kirim ke AI tutor diteruskan ke penyedia AI yang dikonfigurasi untuk menghasilkan jawaban.

### Rekaman suara
- Rekaman Speaking Lab disimpan di penyimpanan privat yang hanya dapat diakses olehmu, dan dapat kamu hapus kapan saja.
- Speech recognition dijalankan oleh browser; perilaku pengirimannya bergantung pada browser yang kamu gunakan.

### Hak kamu
- Melihat dan memperbarui data profil di halaman Profil dan Pengaturan.
- Menghapus akun beserta seluruh data belajar dari halaman Pengaturan. Penghapusan bersifat permanen.
`;

export default function PrivacyPage() {
  return (
    <>
      <PublicHero eyebrow="Legal" title="Kebijakan Privasi" description="Terakhir diperbarui: 30 Oktober 2026" />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Markdown>{PRIVACY}</Markdown>
      </div>
    </>
  );
}
