# Linguora — Advanced, Gamified, Full-Stack English Learning Ecosystem

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-65%20passed%20(Unit%2C%20Int%2C%20E2E)-success?style=flat)](https://github.com/)

**Linguora** adalah platform pembelajaran bahasa Inggris full-stack komprehensif yang dirancang untuk membantu penutur bahasa Indonesia menguasai bahasa Inggris secara bertahap dari pemula mutlak hingga tingkat mahir (CEFR Level A1 s.d. C2).

Platform ini menggabungkan kedalaman fitur LMS modern, kecerdasan mesin latihan adaptif, sistem ujian online dengan server-side grading, pelatih kosakata spaced repetition, 4 lab keterampilan terfokus, gamifikasi yang aman dari manipulasi skor, asisten AI tutor, serta Admin CMS terintegrasi.

---

## 🌟 Fitur Utama

### 1. Kurikulum Berjenjang CEFR (A1 — C2)
- **6 Tingkat CEFR**: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper Intermediate), C1 (Advanced), dan C2 (Proficient).
- **60 Unit & 300 Lesson**: Tepat 10 unit per level, 5 lesson per unit.
- **Struktur 12 Bagian per Lesson**: Learning objectives, penjelasan konsep dwibahasa, contoh kontekstual, vocabulary list, grammar patterns, common mistakes, guided practice (latihan interaktif dengan feedback instan), independent practice, mini quiz evaluasi, ringkasan, review cards, dan kriteria kelulusan.

### 2. Assessment Engine & Bank Soal (2.789 Soal)
- **20 Tipe Soal Interaktif**: Single choice, multiple select, fill in the blanks, dropdown, word bank drag & drop, word ordering, sentence reconstruction, matching pairs, error identification, sentence correction, sentence transformation, translation, reading comprehension, listening comprehension, dialogue completion, contextual vocabulary, short answer, essay, dictation, dan speaking response.
- **Server-Side Grading Aman**: Kunci jawaban tersimpan terpisah pada tabel privat `question_answer_keys` yang dilindungi Row Level Security (tidak pernah dibocorkan ke client). Pemeriksaan jawaban, normalisasi tanda baca/spasi, varian jawaban yang diterima, dan pemberian partial credit dihitung di backend.

### 3. Diagnostic Placement Test
- 30–60 Soal bertingkat untuk mengestimasi level awal pembelajar.
- State tersimpan otomatis per soal (`assessment_answers`) dan dapat dilanjutkan (*resume*) kapan saja saat koneksi terputus atau halaman dimuat ulang.

### 4. Empat Lab Keterampilan (Skills Labs)
- **Reading Lab**: Teks bacaan bertingkat (artikel, cerita, email, berita, akademik), penyorot kosakata, glosarium interaktif, timer membaca, dan kuis pemahaman (main idea, detail, inference, context).
- **Listening Lab**: Audio player responsif dengan pengatur kecepatan (0.75x–1.5x), transkrip setelah latihan, pemahaman dialog, dan latihan dikte.
- **Speaking Lab**: Prompt latihan berbicara terpandu, simulasi percakapan situasi, perekaman audio browser MediaRecorder, dan speech recognition feedback.
- **Writing Lab**: Form penulisan draft tersimpan otomatis, penghitung kata realtime, dan rubrik penilaian 5 kriteria (grammar, vocabulary, coherence, task completion, organization).

### 5. Kosakata & Tata Bahasa
- **Vocabulary Trainer**: 409 entri kata dengan pelafalan IPA, definisi bahasa Inggris, arti bahasa Indonesia, contoh kalimat dwibahasa, sinonim, antonim, kolokasi, personal wordbook, dan flashcards flip 3D.
- **Spaced Repetition (SRS)**: Algoritma SuperMemo-2 (SM-2) untuk menghitung interval pengulangan optimal bagi kosakata dan materi yang perlu diingat kembali.
- **Grammar Knowledge System**: 53 topik tata bahasa lengkap dengan formula pola kalimat positif, negatif, dan tanya, perbandingan konsep mirip, kesalahan umum, dan latihan.

### 6. Gamifikasi & Analytics
- **Transaksi XP Atomik**: Dicatat dalam ledger `xp_transactions` dengan `idempotency_key` unik untuk mencegah manipulasi dan klaim ganda.
- **Daily Streak Presisi**: Dihitung berdasarkan zona waktu lokal pengguna (`Asia/Jakarta`).
- **Papan Peringkat (Leaderboard)**: Snapshot mingguan dan sepanjang masa dengan privasi terlindungi (hanya menampilkan username dan avatar, email tidak pernah terekspos).
- **Dashboard Analytics**: Visualisasi Recharts untuk waktu belajar, akurasi per skill, topik terlemah, dan riwayat dalam rentang 7, 30, 90 hari, dan All Time.

### 7. AI English Tutor (Opsional)
- Asisten belajar terintegrasi via SDK Anthropic Claude (`claude-opus-5-5` / `claude-haiku-5-5`).
- Aman biaya: Dibekali rate limiting IP/user, batas harian pesan (`AI_TUTOR_DAILY_MESSAGE_LIMIT`), dan fallback otomatis jika API key belum dikonfigurasi tanpa mengganggu fungsi aplikasi inti.

### 8. Admin CMS & Tata Kelola Peran
- **Role & Permission Matrix**: 5 peran terstruktur (`super_admin`, `admin`, `content_editor`, `reviewer`, `student`) yang ditegakkan langsung di level database PostgreSQL melalui RLS dan fungsi `SECURITY DEFINER`.
- **Alur Review Konten**: Editor menulis materi/soal dalam status `draft`/`in_review`; reviewer menyetujui dan memublikasikan via bulk status bar; sistem versioning mencatat riwayat perubahan dengan fitur rollback instan.
- **Audit Logs**: Seluruh aktivitas administratif tercatat lengkap beserta actor, action, timestamp, metadata, dan alamat IP.

---

## 🛠️ Arsitektur Teknologi

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js 16 App Router                 │
│  ┌──────────────────────┬────────────────────────────────┐  │
│  │   Marketing Website  │     Learner App (/app)         │  │
│  │   Landing, Curriculum│     Dashboard, Learn, Labs,    │  │
│  │   Placement, Pricing │     Flashcards, Analytics      │  │
│  └──────────────────────┴────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     Admin CMS (/admin)                │  │
│  │   Curriculum CMS, Question Bank, Review Queue, Audit  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Server Actions & RLS
┌──────────────────────────────▼──────────────────────────────┐
│                    Supabase PostgreSQL                     │
│  ┌──────────────────────┬────────────────────────────────┐  │
│  │  38+ Tables          │  Row Level Security (RLS)      │  │
│  │  Functions & Triggers│  Role Matrix & Audit Trail     │  │
│  └──────────────────────┴────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Panduan Memulai Cepat (Local Setup)

### Prasyarat
- **Node.js**: Versi 20.x atau lebih baru
- **Docker**: Berjalan di sistem (diperlukan untuk menjalankan Supabase CLI lokal)
- **Supabase CLI**: Terpasang lokal (`supabase` via npm/npx)

### 1. Kloning & Instal Dependensi
```bash
git clone <repository-url>
cd Linguora
npm install
```

### 2. Konfigurasi Environment Variables
Salin berkas `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```
Nilai bawaan pada `.env.local` sudah disesuaikan dengan konfigurasi Supabase CLI lokal:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-key
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Opsional: Masukkan API key jika ingin mengaktifkan AI Tutor
ANTHROPIC_API_KEY=
AI_TUTOR_MODEL=claude-opus-5-5
AI_TUTOR_DAILY_MESSAGE_LIMIT=30
```

### 3. Jalankan Database Lokal & Seed Data
```bash
# 1. Nyalakan layanan Supabase (PostgreSQL, Auth, Storage)
npm run db:start

# 2. Reset database & jalankan 7 migrasi DDL
npm run db:reset

# 3. Jalankan seed kurikulum lengkap (6 level, 60 unit, 300 lesson, 2789 soal)
npm run db:seed
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 👥 Akun Pengujian & Pembuatan Staf

Anda dapat membuat akun dengan peran tertentu menggunakan script `user:create`:

```bash
# Membuat akun Admin
npm run user:create -- --email admin@example.test --password "Admin-pass-123" --role admin --name "Admin CMS"

# Membuat akun Super Admin
npm run user:create -- --email superadmin@example.test --password "Super-pass-123" --role super_admin --name "Super Admin"

# Membuat akun Content Editor
npm run user:create -- --email editor@example.test --password "Editor-pass-123" --role content_editor --name "Content Editor"

# Membuat akun Reviewer
npm run user:create -- --email reviewer@example.test --password "Reviewer-pass-123" --role reviewer --name "Content Reviewer"
```

---

## 📋 Daftar Perintah (Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan Next.js development server pada port 3000 |
| `npm run build` | Melakukan kompilasi build produksi Next.js |
| `npm run start` | Menjalankan Next.js production server |
| `npm run lint` | Menjalankan ESLint (konfigurasi Next.js flat config) |
| `npm run typecheck` | Menjalankan pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `npm run format` | Menjalankan Prettier code formatting ke seluruh codebase |
| `npm run test` | Menjalankan seluruh test unit & integrasi via Vitest |
| `npm run test:unit` | Menjalankan pengujian unit (grading & learning rules) |
| `npm run test:integration` | Menjalankan pengujian integrasi database & RLS |
| `npm run test:e2e` | Menjalankan pengujian E2E headless browser Playwright |
| `npm run content:validate` | Memvalidasi integritas silabus & validitas JSON bank soal |
| `npm run db:start` | Menyalakan kontainer Supabase PostgreSQL & Auth |
| `npm run db:stop` | Mematikan kontainer Supabase lokal |
| `npm run db:reset` | Reset skema database dan eksekusi ulang 7 migrasi |
| `npm run db:types` | Regenerasi type definition TypeScript dari skema Supabase |
| `npm run db:seed` | Mengimpor kurikulum seed data lengkap ke PostgreSQL |
| `npm run check` | Menjalankan typecheck + lint + test unit dalam satu perintah |

---

## 🧪 Hasil Pengujian Otomatis

Pengujian Linguora mencakup seluruh alur kritis aplikasi:

```bash
✓ tests/unit/learning.test.ts (15 tests)
✓ tests/unit/grading.test.ts (22 tests)
✓ tests/integration/learning-flow.test.ts (18 tests)
✓ tests/e2e/admin-publish.spec.ts (2 tests)
✓ tests/e2e/learning-flow.spec.ts (3 tests)
✓ tests/e2e/role-permissions.spec.ts (3 tests)
✓ tests/e2e/responsive.spec.ts [Mobile Pixel 7] (2 tests)

Test Files  7 passed (7)
Tests       65 passed (65)
```

---

## 📚 Dokumentasi Terkait

- **[Entity Relationship Diagram & Database Architecture (docs/erd.md)](docs/erd.md)**: Diagram Mermaid lengkap, kamus data relasional, kebijakan RLS, dan strategi indexing.
- **[Panduan Backup & Disaster Recovery (docs/backup-and-recovery.md)](docs/backup-and-recovery.md)**: Strategi pemulihan data, PITR, dump/restore, RPO/RTO, dan rollback CMS.
- **[Status Implementasi & Audit Platform (docs/implementation-status.md)](docs/implementation-status.md)**: Laporan kepatuhan terhadap 22 bagian spesifikasi Master Prompt.

---

## 📄 Lisensi

Hak cipta © 2026 Linguora. Semua hak dilindungi.
Materi kurikulum CEFR digunakan sebagai standar acuan pedagogis. Linguora tidak mengklaim penerbitan sertifikasi CEFR resmi.
