/** Static platform data: rubrics, achievements, challenges, blog articles. */

export const WRITING_RUBRICS = [
  {
    key: "general-writing",
    name: "Rubrik Menulis Umum",
    description: "Rubrik analitik 5 kriteria (skala 0–5) untuk semua tugas menulis.",
    criteria: [
      { key: "task", label: "Task completion", description: "Menjawab semua bagian tugas, panjang sesuai instruksi.", max: 5 },
      { key: "organization", label: "Organization", description: "Struktur jelas: pembuka, isi, penutup; paragraf terorganisir.", max: 5 },
      { key: "coherence", label: "Coherence & cohesion", description: "Ide mengalir logis, linking words tepat.", max: 5 },
      { key: "grammar", label: "Grammar", description: "Akurasi dan variasi struktur kalimat sesuai level.", max: 5 },
      { key: "vocabulary", label: "Vocabulary", description: "Pilihan kata tepat, bervariasi, dan sesuai register.", max: 5 },
    ],
  },
];

type AchievementSeed = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria: { metric: string; threshold: number };
  xp_reward: number;
};

export const ACHIEVEMENTS: AchievementSeed[] = [
  { key: "first-steps", name: "Langkah Pertama", description: "Selesaikan lesson pertamamu.", icon: "footprints", category: "learning", criteria: { metric: "lessons_completed", threshold: 1 }, xp_reward: 10 },
  { key: "lessons-10", name: "Pembelajar Tekun", description: "Selesaikan 10 lesson.", icon: "book-open", category: "learning", criteria: { metric: "lessons_completed", threshold: 10 }, xp_reward: 30 },
  { key: "lessons-50", name: "Penjelajah Kurikulum", description: "Selesaikan 50 lesson.", icon: "map", category: "learning", criteria: { metric: "lessons_completed", threshold: 50 }, xp_reward: 100 },
  { key: "mastery-5", name: "Sang Master", description: "Raih status Mastered pada 5 lesson.", icon: "crown", category: "learning", criteria: { metric: "lessons_mastered", threshold: 5 }, xp_reward: 40 },
  { key: "unit-1", name: "Unit Pertama", description: "Lulus unit assessment pertamamu.", icon: "flag", category: "milestone", criteria: { metric: "units_completed", threshold: 1 }, xp_reward: 25 },
  { key: "unit-10", name: "Satu Level Penuh", description: "Lulus 10 unit assessment.", icon: "mountain", category: "milestone", criteria: { metric: "units_completed", threshold: 10 }, xp_reward: 100 },
  { key: "level-1", name: "Naik Level", description: "Lulus ujian level pertamamu.", icon: "graduation-cap", category: "milestone", criteria: { metric: "levels_passed", threshold: 1 }, xp_reward: 100 },
  { key: "placement", name: "Kenali Dirimu", description: "Selesaikan placement test.", icon: "compass", category: "milestone", criteria: { metric: "placement_done", threshold: 1 }, xp_reward: 10 },
  { key: "perfect-1", name: "Sempurna!", description: "Raih skor 100% pada sebuah quiz atau ujian.", icon: "star", category: "accuracy", criteria: { metric: "perfect_scores", threshold: 1 }, xp_reward: 15 },
  { key: "perfect-10", name: "Presisi Tinggi", description: "Raih skor 100% sebanyak 10 kali.", icon: "sparkles", category: "accuracy", criteria: { metric: "perfect_scores", threshold: 10 }, xp_reward: 60 },
  { key: "correct-100", name: "100 Jawaban Benar", description: "Jawab 100 soal dengan benar.", icon: "check-circle", category: "accuracy", criteria: { metric: "correct_answers", threshold: 100 }, xp_reward: 30 },
  { key: "correct-1000", name: "1000 Jawaban Benar", description: "Jawab 1000 soal dengan benar.", icon: "trophy", category: "accuracy", criteria: { metric: "correct_answers", threshold: 1000 }, xp_reward: 150 },
  { key: "streak-3", name: "Mulai Konsisten", description: "Belajar 3 hari berturut-turut.", icon: "flame", category: "habit", criteria: { metric: "streak", threshold: 3 }, xp_reward: 15 },
  { key: "streak-7", name: "Seminggu Penuh", description: "Belajar 7 hari berturut-turut.", icon: "flame", category: "habit", criteria: { metric: "streak", threshold: 7 }, xp_reward: 40 },
  { key: "streak-30", name: "Kebiasaan Juara", description: "Belajar 30 hari berturut-turut.", icon: "flame", category: "habit", criteria: { metric: "streak", threshold: 30 }, xp_reward: 150 },
  { key: "daily-goal-5", name: "Tepat Sasaran", description: "Capai target harian 5 kali.", icon: "target", category: "habit", criteria: { metric: "daily_goals", threshold: 5 }, xp_reward: 25 },
  { key: "xp-1000", name: "1.000 XP", description: "Kumpulkan total 1.000 XP.", icon: "zap", category: "xp", criteria: { metric: "total_xp", threshold: 1000 }, xp_reward: 0 },
  { key: "xp-5000", name: "5.000 XP", description: "Kumpulkan total 5.000 XP.", icon: "zap", category: "xp", criteria: { metric: "total_xp", threshold: 5000 }, xp_reward: 0 },
  { key: "words-25", name: "Kolektor Kata", description: "Simpan 25 kata ke wordbook pribadimu.", icon: "library", category: "vocabulary", criteria: { metric: "vocabulary_saved", threshold: 25 }, xp_reward: 20 },
  { key: "reviews-50", name: "Ingatan Kuat", description: "Selesaikan 50 item review spaced repetition.", icon: "brain", category: "vocabulary", criteria: { metric: "reviews_done", threshold: 50 }, xp_reward: 30 },
  { key: "writer-1", name: "Penulis Pemula", description: "Kirim tulisan pertamamu di Writing Lab.", icon: "pen-line", category: "skills", criteria: { metric: "writing_submitted", threshold: 1 }, xp_reward: 15 },
  { key: "speaker-5", name: "Berani Bicara", description: "Selesaikan 5 sesi Speaking Lab.", icon: "mic", category: "skills", criteria: { metric: "speaking_sessions", threshold: 5 }, xp_reward: 25 },
];

export const CHALLENGES = [
  { key: "daily-questions-20", period: "daily", title: "Jawab 20 soal", description: "Jawab 20 soal hari ini dari latihan, quiz, atau review.", metric: "questions", target: 20, xp_reward: 15 },
  { key: "daily-correct-15", period: "daily", title: "15 jawaban benar", description: "Raih 15 jawaban benar hari ini.", metric: "correct_answers", target: 15, xp_reward: 15 },
  { key: "daily-review-10", period: "daily", title: "Review 10 item", description: "Selesaikan 10 item di review queue.", metric: "reviews", target: 10, xp_reward: 10 },
  { key: "weekly-lessons-5", period: "weekly", title: "5 lesson minggu ini", description: "Selesaikan 5 lesson dalam minggu ini.", metric: "lessons", target: 5, xp_reward: 50 },
  { key: "weekly-xp-300", period: "weekly", title: "300 XP minggu ini", description: "Kumpulkan 300 XP dalam minggu ini.", metric: "xp", target: 300, xp_reward: 40 },
  { key: "weekly-minutes-120", period: "weekly", title: "Belajar 120 menit", description: "Catat 120 menit sesi belajar di Study Planner minggu ini.", metric: "minutes", target: 120, xp_reward: 40 },
];

export const BLOG_POSTS: {
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  tags: string[];
  author_name: string;
  published_at?: string;
}[] = [
  {
    slug: "memahami-level-cefr",
    title: "Memahami Level CEFR: Dari A1 sampai C2",
    excerpt: "CEFR adalah kerangka acuan yang dipakai Linguora untuk menyusun kurikulum. Apa arti setiap level dan bagaimana cara naik level?",
    tags: ["cefr", "kurikulum"],
    author_name: "Tim Kurikulum Linguora",
    body_md: `CEFR (*Common European Framework of Reference for Languages*) adalah kerangka acuan internasional yang menggambarkan kemampuan berbahasa dalam enam level. Linguora memakai CEFR sebagai **acuan penyusunan kurikulum** — bukan sebagai sertifikasi resmi.

### Enam level CEFR

| Level | Nama | Gambaran singkat |
| --- | --- | --- |
| A1 | Beginner | Memahami dan memakai ungkapan sehari-hari yang sangat dasar. |
| A2 | Elementary | Berkomunikasi dalam tugas rutin dan sederhana. |
| B1 | Intermediate | Menangani sebagian besar situasi saat bepergian; menceritakan pengalaman. |
| B2 | Upper Intermediate | Berinteraksi dengan lancar dan spontan; menulis teks rinci. |
| C1 | Advanced | Memakai bahasa secara fleksibel untuk tujuan sosial, akademik, dan profesional. |
| C2 | Proficient | Memahami hampir semua hal dengan mudah dan mengekspresikan diri secara presisi. |

### Bagaimana level dipakai di Linguora?

1. **Placement test** memberi *estimasi* level awal berdasarkan jawabanmu. Hasilnya bukan pengukuran sempurna — kamu tetap bisa mengulang materi level sebelumnya kapan saja.
2. Setiap level berisi **10 unit** dengan **5 lesson** per unit, ditambah unit assessment dan ujian level.
3. Level berikutnya terbuka setelah kamu **lulus ujian level** (skor minimal 70%).

### Tips naik level

- Belajar sedikit tapi rutin lebih efektif daripada belajar lama sesekali.
- Selesaikan review queue setiap hari agar materi lama tidak terlupa.
- Jangan lewati latihan speaking dan writing — keduanya melatih kemampuan *produktif* yang tidak terukur oleh soal pilihan ganda.

Sertifikat yang kamu terima di Linguora adalah **sertifikat internal** sebagai tanda penyelesaian kurikulum, bukan sertifikat CEFR resmi.`,
  },
  {
    slug: "spaced-repetition-cara-mengingat-kosakata",
    title: "Spaced Repetition: Cara Mengingat Kosakata Lebih Lama",
    excerpt: "Mengulang di waktu yang tepat membuat kosakata lebih awet di ingatan. Begini cara kerja review queue di Linguora.",
    tags: ["vocabulary", "tips belajar"],
    author_name: "Tim Kurikulum Linguora",
    body_md: `Pernah menghafal 30 kata baru lalu lupa hampir semuanya seminggu kemudian? Itu wajar. Ingatan melemah seiring waktu jika informasi tidak dipakai lagi.

### Prinsip dasar

*Spaced repetition* berarti **mengulang materi dengan jeda yang makin panjang**. Kata yang baru dipelajari diulang besok; jika kamu masih ingat, jedanya diperpanjang menjadi beberapa hari, lalu beberapa minggu.

### Cara kerjanya di Linguora

Linguora memakai algoritma berbasis **SM-2**, algoritma spaced repetition klasik yang transparan:

- Setelah melihat kartu, kamu menilai seberapa mudah kamu mengingatnya: *Lupa*, *Sulit*, *Baik*, atau *Mudah*.
- Jawaban *Lupa* mengembalikan kartu ke jadwal awal.
- Jawaban *Baik* atau *Mudah* memperpanjang interval dan menaikkan *ease factor* kartu.
- Kartu yang interval-nya sudah panjang ditandai **Mastered**.

Soal latihan yang kamu jawab salah juga otomatis masuk ke review queue.

### Tips

1. Buka review queue setiap hari, walau hanya 5 menit.
2. Jujurlah saat menilai — menilai "Mudah" padahal ragu hanya membuat jadwal tidak akurat.
3. Tambahkan kata yang kamu temui sendiri ke **wordbook pribadi** agar ikut dijadwalkan.`,
  },
  {
    slug: "kesalahan-umum-pelajar-indonesia",
    title: "7 Kesalahan Umum Pelajar Indonesia dalam Bahasa Inggris",
    excerpt: "Dari 'I am agree' sampai lupa -s pada he/she/it — kenali kesalahan yang sering muncul akibat pengaruh bahasa Indonesia.",
    tags: ["grammar", "kesalahan umum"],
    author_name: "Tim Kurikulum Linguora",
    body_md: `Bahasa Indonesia dan bahasa Inggris memiliki struktur yang berbeda. Beberapa kesalahan berikut sangat umum karena kita "menerjemahkan langsung".

### 1. *I am agree* ❌ → *I agree* ✅
*Agree* adalah kata kerja, jadi tidak perlu *am*.

### 2. Lupa -s pada orang ketiga tunggal
❌ *She work in a bank.* → ✅ *She works in a bank.*

### 3. Memakai *very* untuk kata sifat ekstrem
❌ *very delicious* (kurang alami) → ✅ *really delicious* atau *absolutely delicious*.

### 4. *Make* vs *do*
❌ *make homework* → ✅ *do homework*; ❌ *do a mistake* → ✅ *make a mistake*.

### 5. Urutan kata sifat dan kata benda
❌ *a car red* → ✅ *a red car*. Dalam bahasa Inggris, kata sifat biasanya **sebelum** kata benda.

### 6. *Since* vs *for*
❌ *I have lived here since five years.* → ✅ *I have lived here for five years.* *Since* untuk titik waktu, *for* untuk durasi.

### 7. Lupa artikel *a/an/the*
❌ *She is teacher.* → ✅ *She is a teacher.* Bahasa Indonesia tidak memakai artikel, jadi bagian ini perlu dilatih secara sadar.

Semua pola di atas dibahas di lesson Linguora lengkap dengan latihan dan pembahasan.`,
  },
];
