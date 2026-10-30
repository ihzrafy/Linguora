# MASTER PROMPT — BUILD A COMPLETE ENGLISH LEARNING PLATFORM

## Project Name: LINGUORA
### An Advanced, Gamified, Full-Stack English Learning Ecosystem

Bertindaklah sebagai Senior Full-Stack Engineer, Software Architect, UI/UX Designer, Database Engineer, dan English Curriculum Designer.

Bangun sebuah platform pembelajaran bahasa Inggris bernama **Linguora**, yaitu aplikasi web full-stack yang komprehensif untuk membantu pengguna belajar bahasa Inggris dari nol hingga tingkat mahir. Platform harus mempunyai kedalaman fitur, kualitas desain, dan sistem pembelajaran seperti gabungan platform LMS, aplikasi language learning, online examination system, vocabulary trainer, dan AI learning assistant.

Jangan membuat sekadar landing page, dashboard statis, atau prototype. Bangun aplikasi yang benar-benar berfungsi dengan autentikasi, database, learning engine, question bank, evaluasi, penyimpanan progres, dan berbagai fitur interaktif.

Semua fitur utama harus terhubung satu sama lain dan menggunakan data yang konsisten.

# PART 1 — TECHNOLOGY STACK

Gunakan arsitektur modern dengan teknologi berikut:

Frontend:
- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Lucide React
- GSAP untuk animasi yang memerlukan timeline dan scroll interaction
- Recharts untuk visualisasi statistik

Backend:
- Next.js Server Components dan Server Actions jika sesuai
- Route Handlers untuk REST API
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- Zod untuk validasi
- React Hook Form untuk form kompleks

Testing:
- Vitest untuk unit testing
- Playwright untuk end-to-end testing

Developer experience:
- ESLint
- Prettier
- Environment variables
- Database migrations
- Seed scripts
- Error logging
- Reusable component architecture

Gunakan versi package yang kompatibel satu sama lain. Jangan menambahkan dependency yang tidak diperlukan.

# PART 2 — DESIGN SYSTEM DAN IDENTITAS VISUAL

Rancang antarmuka yang premium, futuristik, elegan, dan tetap nyaman digunakan untuk belajar dalam waktu lama.

Design direction:
- Premium educational SaaS.
- Modern editorial typography.
- Clean layouts dengan hierarchy yang kuat.
- Dashboard dengan informasi padat tetapi terorganisasi.
- Interaksi yang halus dan responsif.
- Visual identity yang konsisten pada seluruh halaman.

Color palette:
- Primary: deep indigo.
- Secondary: electric blue.
- Accent: lavender.
- Background: soft white dan cool gray.
- Dark mode: midnight navy.
- Success, warning, dan error colors yang memenuhi standar kontras.

Typography:
- Plus Jakarta Sans atau Inter.
- Heading tegas.
- Body text mudah dibaca.
- Font size dan spacing menggunakan design tokens.

Buat komponen desain reusable:
- Buttons
- Inputs
- Select menus
- Tabs
- Dialogs
- Drawers
- Tooltips
- Cards
- Tables
- Breadcrumbs
- Pagination
- Progress bars
- Skeleton loaders
- Toast notifications
- Empty states
- Error states
- Confirmation dialogs

Tambahkan animasi GSAP secara selektif untuk onboarding, learning path, achievement reveal, dan transisi tertentu. Jangan membuat animasi berlebihan yang mengganggu fokus belajar.

Dukung responsive layouts untuk mobile, tablet, laptop, dan desktop besar.

# PART 3 — COMPLETE APPLICATION ARCHITECTURE

Bangun tiga area aplikasi utama.

## A. Public Website

- `/`
- `/features`
- `/learning-path`
- `/curriculum`
- `/placement-test`
- `/pricing`
- `/about`
- `/blog`
- `/blog/[slug]`
- `/faq`
- `/contact`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/terms`
- `/privacy`

Landing page harus memiliki hero section, preview produk, learning path, fitur unggulan, sample exercises, statistik platform yang berasal dari data nyata, FAQ, dan CTA.

Jangan menampilkan statistik pengguna atau testimoni palsu seolah-olah merupakan data asli.

## B. Authenticated Learning Application

- `/app/dashboard`
- `/app/onboarding`
- `/app/placement-test`
- `/app/learn`
- `/app/learn/[levelSlug]`
- `/app/course/[courseSlug]`
- `/app/unit/[unitId]`
- `/app/lesson/[lessonSlug]`
- `/app/practice`
- `/app/quiz/[quizId]`
- `/app/exam/[examId]`
- `/app/results/[attemptId]`
- `/app/review`
- `/app/vocabulary`
- `/app/flashcards`
- `/app/grammar`
- `/app/reading`
- `/app/listening`
- `/app/speaking`
- `/app/writing`
- `/app/pronunciation`
- `/app/conversation`
- `/app/daily-challenge`
- `/app/achievements`
- `/app/leaderboard`
- `/app/study-planner`
- `/app/notes`
- `/app/bookmarks`
- `/app/history`
- `/app/analytics`
- `/app/notifications`
- `/app/profile`
- `/app/settings`
- `/app/billing`

## C. Administration Platform

- `/admin`
- `/admin/users`
- `/admin/roles`
- `/admin/courses`
- `/admin/levels`
- `/admin/units`
- `/admin/lessons`
- `/admin/question-bank`
- `/admin/questions/create`
- `/admin/questions/[id]/edit`
- `/admin/quizzes`
- `/admin/exams`
- `/admin/vocabulary`
- `/admin/reading-passages`
- `/admin/listening-materials`
- `/admin/speaking-prompts`
- `/admin/writing-rubrics`
- `/admin/achievements`
- `/admin/leaderboard`
- `/admin/reports`
- `/admin/content-review`
- `/admin/system-settings`
- `/admin/audit-logs`

Admin panel harus menjadi CMS yang memungkinkan pengelola menambah, mengubah, menghapus, mengimpor, memvalidasi, dan memublikasikan konten tanpa mengedit source code.

# PART 4 — LEARNING CURRICULUM ENGINE

Buat kurikulum lengkap dengan enam level CEFR:

1. A1 — Beginner
2. A2 — Elementary
3. B1 — Intermediate
4. B2 — Upper Intermediate
5. C1 — Advanced
6. C2 — Proficient

Setiap level mempunyai:
- Learning objectives.
- Diagnostic assessment.
- Courses atau learning tracks.
- Unit dan lesson.
- Vocabulary targets.
- Grammar syllabus.
- Reading materials.
- Listening exercises.
- Speaking activities.
- Writing assignments.
- Progress assessment.
- Unit tests.
- Level examination.
- Review sessions.
- Completion certificate internal.

Target struktur kurikulum awal:
- 6 level.
- Minimal 4 learning tracks yang relevan.
- 10 unit per level.
- 5 lesson per unit.
- Minimal 100 soal unik per level.
- Total target minimal 600 soal untuk bank soal awal.

Bangun struktur agar dapat berkembang menjadi ribuan soal dan ratusan lesson.

Setiap lesson harus berisi:
1. Learning objectives.
2. Penjelasan konsep.
3. Contoh penggunaan.
4. Vocabulary list.
5. Grammar patterns.
6. Common mistakes.
7. Guided practice.
8. Independent practice.
9. Mini assessment.
10. Summary.
11. Review cards.
12. Completion criteria.

Materi menggunakan bahasa Indonesia sebagai bahasa penjelasan untuk pemula, lalu secara bertahap meningkatkan penggunaan bahasa Inggris sesuai level.

Pastikan urutan materi pedagogis, tidak melompat dari grammar dasar ke konsep lanjutan tanpa prasyarat.

CEFR digunakan sebagai acuan pembelajaran, bukan klaim bahwa platform memberikan sertifikasi resmi.

# PART 5 — ADVANCED LEARNING PATH

Buat learning path interaktif berupa peta progres dengan node lesson, unit, milestone, dan ujian.

Status lesson:
- Locked
- Available
- In Progress
- Completed
- Mastered
- Needs Review

Aturan progression:
- Lesson dibuka berdasarkan prasyarat.
- Pengguna menyelesaikan materi sebelum mengikuti evaluasi.
- Unit berikutnya terbuka setelah syarat unit terpenuhi.
- Level exam terbuka setelah semua prasyarat terpenuhi.
- Level selanjutnya terbuka setelah pengguna lulus ujian level.
- Materi yang perlu diulang muncul dalam review queue.

Buat aturan progression di backend. Jangan mengandalkan kondisi frontend saja untuk mengunci level.

Sediakan pilihan learning track:
- General English
- English for Academic Purposes
- Business English
- English for Career Development

Setiap track dapat menggunakan materi umum yang sama apabila relevan, tetapi mempunyai target dan materi khusus sendiri.

# PART 6 — QUESTION BANK ENGINE

Buat question bank yang mendukung ribuan soal dan dapat dikembangkan tanpa mengubah komponen UI.

Kategori:
- Grammar
- Vocabulary
- Reading
- Listening
- Speaking
- Writing
- Pronunciation
- Daily Conversation
- Academic English
- Business English
- Mixed Assessment

Question types:
- Single-answer multiple choice.
- Multiple-select.
- Fill in the blanks.
- Dropdown completion.
- Drag and drop.
- Word ordering.
- Sentence reconstruction.
- Matching pairs.
- Error identification.
- Sentence correction.
- Sentence transformation.
- Translation.
- Reading comprehension.
- Listening comprehension.
- Dialogue completion.
- Contextual vocabulary.
- Short answer.
- Essay.
- Dictation.
- Speaking response.

Setiap pertanyaan menyimpan:
- ID.
- Question type.
- Prompt.
- Instructions.
- Level.
- Topic.
- Difficulty.
- Points.
- Options.
- Correct answer atau accepted answers.
- Explanation.
- Common misconception.
- Related learning objectives.
- Source content jika relevan.
- Version.
- Status draft atau published.
- Created by.
- Review metadata.

Bangun question renderer berdasarkan question type, bukan membuat halaman terpisah secara manual untuk setiap soal.

Buat grading engine yang mendukung:
- Exact matching.
- Case-insensitive matching jika sesuai.
- Accepted answer variants.
- Normalisasi whitespace dan tanda baca jika sesuai.
- Partial credit untuk tipe soal yang mendukung.
- Manual grading untuk writing dan speaking jika diperlukan.
- Penjelasan otomatis setelah submission.

Jangan membuka jawaban benar melalui client-side payload sebelum pengguna menjawab. Validasi jawaban dan skor melalui server.

Untuk essay, gunakan rubric yang jelas. Jangan menganggap evaluasi otomatis sepenuhnya akurat apabila tidak ada layanan penilaian yang mendukung.

# PART 7 — ADAPTIVE PRACTICE ENGINE

Implementasikan latihan adaptif berbasis performa pengguna.

Sistem harus:
- Mengidentifikasi topik dengan akurasi rendah.
- Mengidentifikasi jenis soal yang sering salah.
- Memilih soal berdasarkan level dan kesulitan.
- Menyesuaikan distribusi latihan berdasarkan kelemahan.
- Menyisipkan soal review dari materi sebelumnya.
- Menghindari pengulangan soal yang sama secara berlebihan.
- Menaikkan kesulitan secara bertahap ketika pengguna menunjukkan penguasaan.
- Memberikan rekomendasi latihan berikutnya.

Mulai dengan algoritma rule-based yang transparan dan dapat diuji. Jangan mengklaim menggunakan AI adaptif jika sebenarnya hanya memakai aturan sederhana.

Gunakan spaced repetition untuk vocabulary dan materi yang perlu diingat kembali. Simpan jadwal review, riwayat jawaban, tingkat kesulitan, dan status penguasaan.

# PART 8 — PLACEMENT TEST DAN ASSESSMENT

Placement test harus berisi 30–60 soal adaptif atau bertingkat, mencakup:
- Grammar.
- Vocabulary.
- Reading.
- Listening jika audio tersedia.
- Contextual language use.

Tampilkan:
- Progress indikator.
- Timer opsional.
- Penyimpanan jawaban sementara.
- Resume jika koneksi terputus.
- Hasil akhir.
- Rekomendasi level.
- Kekuatan dan kelemahan per kategori.
- Rekomendasi learning track.

Bangun tiga jenis evaluasi:
1. Lesson quiz.
2. Unit assessment.
3. Level examination.

Dukungan assessment:
- Randomized question selection.
- Randomized option ordering.
- Configurable pass threshold.
- Attempt limits.
- Time limits.
- Attempt history.
- Result review.
- Retake rules.
- Server-side scoring.
- Audit trail untuk hasil ujian.

Jangan menggunakan satu nilai placement test sebagai pengukuran sempurna kemampuan bahasa. Tampilkan hasil sebagai estimasi kemampuan.

# PART 9 — FOUR LANGUAGE SKILLS

## Reading Lab

Sediakan artikel pendek, cerita, dialog, email, berita, dan teks akademik sesuai level.

Fitur:
- Highlight vocabulary.
- Click-to-translate.
- Bookmark words.
- Reading timer opsional.
- Comprehension quiz.
- Main idea questions.
- Detail questions.
- Inference questions.
- Vocabulary-in-context.
- Reading history.

## Listening Lab

Sediakan:
- Dialog sehari-hari.
- Monolog.
- Pengumuman.
- Percakapan telepon.
- Interview.
- Podcast-style learning materials.
- Accent variation jika audio yang sesuai tersedia.

Fitur:
- Audio player.
- Playback speed.
- Replay controls.
- Transcript yang bisa ditampilkan setelah latihan.
- Dictation.
- Fill-in-the-blanks.
- Listening comprehension.
- Progress tracking.

Gunakan audio berlisensi atau audio yang dibuat secara sah. Jangan membuat tombol audio palsu yang tidak memainkan apa pun.

## Speaking Lab

Sediakan:
- Guided speaking prompts.
- Role-play.
- Situation-based dialogues.
- Self-recording jika browser mengizinkan.
- Speech recognition jika tersedia.
- Transkrip hasil pengenalan suara.
- Pronunciation practice.
- Fluency reflection.
- Speaking history.

Berikan feedback hanya berdasarkan data yang benar-benar tersedia. Bedakan speech recognition dari evaluasi pronunciation profesional.

## Writing Lab

Sediakan:
- Sentence building.
- Paragraph writing.
- Email writing.
- Formal dan informal writing.
- Essay.
- Opinion writing.
- Summarization.
- Grammar correction.
- Vocabulary improvement.

Simpan draft secara otomatis. Berikan rubric mengenai grammar, vocabulary, coherence, task completion, dan organization. Untuk penilaian AI, gunakan provider yang dikonfigurasi dan tampilkan keterbatasan evaluasinya.

# PART 10 — VOCABULARY KNOWLEDGE SYSTEM

Bangun vocabulary database yang kaya dengan:
- Word.
- IPA pronunciation jika tersedia.
- Part of speech.
- Definition.
- Arti bahasa Indonesia.
- Example sentences.
- Synonyms.
- Antonyms.
- Collocations.
- Common phrases.
- Related words.
- Level.
- Topic.
- Audio URL jika tersedia.

Fitur:
- Flashcards.
- Flip card animation.
- Multiple-choice vocabulary quiz.
- Spelling practice.
- Word matching.
- Personal wordbook.
- Favorites.
- Search and filter.
- Import/export vocabulary.
- Review queue.
- Mastery statistics.
- Spaced repetition.

Pengguna dapat menambahkan kosakata sendiri dan mengelompokkan kata berdasarkan koleksi.

# PART 11 — GRAMMAR KNOWLEDGE SYSTEM

Bangun grammar reference yang dapat dicari dan difilter berdasarkan:
- Level.
- Tense.
- Sentence structure.
- Parts of speech.
- Modals.
- Conditionals.
- Clauses.
- Voice.
- Reported speech.
- Punctuation.
- Common mistakes.

Setiap topik mempunyai:
- Penjelasan.
- Formula.
- Positive, negative, dan interrogative examples.
- Perbandingan dengan konsep yang mirip.
- Kesalahan umum.
- Exercises.
- Related lessons.
- Progress mastery.

Sediakan grammar search yang dapat menemukan materi berdasarkan kata kunci atau contoh kalimat.

# PART 12 — GAMIFICATION SYSTEM

Implementasikan gamifikasi secara konsisten dan aman.

Fitur:
- XP.
- Daily streak.
- Weekly streak.
- Daily goal.
- Weekly goals.
- Level badges.
- Achievement system.
- Daily quests.
- Weekly challenges.
- Leaderboard.
- Learning milestones.
- Unit completion rewards.
- Perfect-score achievements.
- Progress celebrations.

XP diberikan melalui server-side transaction. Hindari manipulasi skor, duplikasi reward, dan perolehan XP tak terbatas.

Leaderboard:
- Global.
- Weekly.
- Friends jika fitur pertemanan tersedia.
- Filter berdasarkan periode.
- Pagination.
- Opt-in visibility.
- Username publik tanpa mengekspos email.

Streak dihitung menggunakan tanggal dan timezone yang benar. Sediakan penanganan aktivitas harian agar streak tidak berubah akibat duplikasi request.

# PART 13 — USER DASHBOARD DAN ANALYTICS

Dashboard harus menjadi pusat aktivitas belajar.

Tampilkan:
- Current level.
- Active course.
- Continue learning.
- Learning path progress.
- Daily goal.
- Weekly learning time.
- Total XP.
- Streak.
- Lessons completed.
- Questions answered.
- Accuracy rate.
- Grammar mastery.
- Vocabulary mastery.
- Skill performance.
- Weakness analysis.
- Upcoming review sessions.
- Learning history.
- Achievement progress.
- Personalized recommendations.

Buat analytics dengan rentang:
- 7 hari.
- 30 hari.
- 90 hari.
- All time.

Gunakan data aktual dari database. Hitung metrik dengan definisi konsisten dan jangan mencampur jumlah percobaan dengan jumlah soal unik.

# PART 14 — STUDY PLANNER DAN PERSONAL PRODUCTIVITY

Buat fitur untuk membantu pengguna belajar secara teratur:
- Target belajar harian.
- Target belajar mingguan.
- Study calendar.
- Learning reminders.
- Planned lessons.
- Study session timer.
- Pomodoro mode opsional.
- Session notes.
- Bookmarks.
- Personal learning journal.
- Weekly learning report.

Pengguna dapat mengatur waktu belajar dan mendapatkan rekomendasi berdasarkan target yang realistis.

Notifikasi email atau push bersifat opsional dan hanya aktif setelah provider dan izin pengguna dikonfigurasi.

# PART 15 — AI LEARNING ASSISTANT

Buat halaman AI English Tutor yang dapat membantu pengguna memahami materi.

Kemampuan yang diharapkan:
- Menjelaskan grammar dalam bahasa Indonesia atau bahasa Inggris.
- Membantu memperbaiki kalimat.
- Memberikan contoh tambahan.
- Membuat latihan berdasarkan materi.
- Menjelaskan kesalahan jawaban.
- Melakukan simulasi percakapan.
- Membantu menyusun vocabulary list.
- Memberikan feedback awal untuk tulisan.
- Menjelaskan perbedaan kata yang mirip.
- Menghasilkan study plan berdasarkan tujuan pengguna.

Persyaratan:
- Integrasikan melalui server-side API route.
- Simpan API key di environment variables.
- Jangan mengirim secret ke client.
- Gunakan rate limiting dan batas penggunaan.
- Validasi input dan output.
- Tampilkan loading dan error states.
- Sediakan fallback apabila provider tidak tersedia.
- Batasi penggunaan agar biaya API dapat dikontrol.
- Jangan mengarang sumber atau menjamin semua feedback benar.
- Pisahkan AI-generated content dari kurikulum yang sudah diverifikasi.
- Jangan mengklaim AI tutor berfungsi sebelum API provider benar-benar terhubung.

AI tutor adalah fitur tambahan. Core learning platform harus tetap bisa digunakan tanpa API AI.

# PART 16 — ADMIN CMS DAN CONTENT MANAGEMENT

Bangun admin panel yang lengkap.

Administrator dapat:
- Mengelola pengguna dan role.
- Membuat course dan learning track.
- Mengatur level, unit, dan lesson.
- Menulis rich-text lesson content.
- Menambahkan gambar dan audio.
- Mengelola vocabulary.
- Membuat semua tipe soal.
- Mengatur jawaban dan pembahasan.
- Mengimpor soal melalui CSV atau JSON dengan validasi.
- Melakukan bulk editing.
- Menduplikasi lesson.
- Menyimpan draft.
- Preview lesson sebelum publish.
- Menjadwalkan publikasi jika didukung.
- Melihat version history.
- Melakukan rollback konten.
- Mengelola achievements.
- Memantau statistik penggunaan.
- Mengekspor laporan.
- Melihat audit logs.

Role:
- Super Admin.
- Admin.
- Content Editor.
- Reviewer.
- Student.

Terapkan permission berdasarkan role di backend dan database, bukan hanya menyembunyikan menu frontend.

# PART 17 — DATABASE ARCHITECTURE

Rancang database relasional PostgreSQL yang ternormalisasi.

Entitas utama:
- profiles
- roles
- user_roles
- learning_tracks
- levels
- courses
- course_enrollments
- units
- lessons
- lesson_sections
- lesson_prerequisites
- questions
- question_options
- question_tags
- quizzes
- quiz_questions
- exams
- exam_questions
- assessment_attempts
- assessment_answers
- vocabulary_entries
- vocabulary_collections
- user_vocabulary
- review_schedules
- learning_progress
- skill_assessments
- writing_submissions
- speaking_sessions
- study_sessions
- daily_activity
- XP_transactions
- achievements
- user_achievements
- leaderboard_snapshots
- notifications
- bookmarks
- notes
- AI_tutor_sessions
- AI_tutor_messages
- content_versions
- audit_logs

Ketentuan database:
- Gunakan UUID sebagai primary key jika sesuai.
- Gunakan foreign keys dan indexes.
- Tambahkan created_at dan updated_at pada entitas yang relevan.
- Gunakan unique constraints untuk mencegah duplikasi.
- Buat migration files.
- Buat seed scripts.
- Terapkan Row Level Security.
- Jangan memberikan akses database admin kepada client.
- Jangan menyimpan jawaban ujian secara tidak aman di payload soal publik.
- Lindungi data pribadi dan batasi akses berdasarkan kebutuhan.
- Gunakan transaction untuk proses yang harus atomik.
- Terapkan pagination untuk daftar besar.
- Buat strategi backup dan dokumentasi pemulihan.

Dokumentasikan hubungan tabel menggunakan ERD.

# PART 18 — SECURITY DAN RELIABILITY

Implementasikan:
- Authentication yang aman.
- Authorization berbasis role.
- Server-side validation.
- Rate limiting pada endpoint sensitif.
- Protection terhadap manipulasi XP.
- Protection terhadap akses konten terkunci.
- Secure session handling.
- Sanitasi konten rich text.
- Secure file upload validation.
- Error handling yang konsisten.
- Audit logs untuk aktivitas administratif.
- Perlindungan terhadap injection dan akses data lintas pengguna.
- Environment variable validation.
- Privacy-aware analytics.
- Account deletion flow.
- Backup dan recovery documentation.

Jangan mengekspos password, secret, private tokens, atau jawaban ujian sebelum waktunya.

# PART 19 — PERFORMANCE DAN ACCESSIBILITY

Targetkan:
- Optimized server rendering.
- Lazy loading untuk konten berat.
- Pagination dan filtering server-side.
- Image optimization.
- Caching untuk konten publik yang sesuai.
- Database indexes.
- Pengurangan unnecessary client components.
- Keyboard navigation.
- Screen-reader labels.
- Focus management.
- Reduced motion support.
- Contrast yang baik.
- Loading skeletons.
- Mobile-friendly exercise interactions.

Hindari memuat seluruh question bank sekaligus ke browser.

# PART 20 — CONTENT QUALITY DAN SEED DATA

Sediakan konten awal yang benar-benar dapat digunakan.

Target minimum:
- 6 CEFR levels.
- 60 unit.
- 300 lesson slots.
- 600 soal unik, minimal 100 soal per level.
- Vocabulary database awal yang relevan.
- Grammar reference awal.
- Reading passages.
- Listening scripts dan audio apabila tersedia.
- Speaking prompts.
- Writing assignments.
- Placement test.
- Unit tests.
- Level exams.

Konten harus benar secara tata bahasa, mempunyai jawaban yang tervalidasi, dan sesuai tingkat kesulitan.

Gunakan content manifest untuk melacak jumlah soal per level, topik, tipe, dan status validasi.

Jangan mengisi database dengan soal duplikat atau placeholder yang ditampilkan sebagai materi final. Jika target konten belum terpenuhi, dokumentasikan kekurangannya dan bangun mekanisme penambahan konten melalui admin CMS.

# PART 21 — TESTING DAN ACCEPTANCE CRITERIA

Buat automated tests untuk:
- Registration dan login.
- Session persistence.
- Role permissions.
- Lesson progression.
- Question rendering.
- Answer submission.
- Server-side grading.
- Score calculation.
- Exam pass/fail.
- Level unlocking.
- XP transaction.
- Streak calculation.
- Spaced repetition.
- User data isolation.
- Admin content publishing.
- Responsive navigation.

Buat end-to-end scenario:

1. Pengguna mendaftar.
2. Menyelesaikan onboarding.
3. Mengikuti placement test.
4. Mendapat rekomendasi level.
5. Membuka lesson pertama.
6. Mempelajari materi.
7. Menjawab soal.
8. Mendapat feedback.
9. Menyelesaikan quiz.
10. Mendapat XP.
11. Melihat progres dashboard.
12. Logout dan login kembali.
13. Melihat progres tetap tersimpan.
14. Menyelesaikan unit.
15. Mengikuti ujian level.
16. Membuka level berikutnya jika lulus.

Buat juga test untuk percobaan manipulasi skor, pengiriman jawaban berulang, dan akses langsung ke lesson terkunci.

# PART 22 — DEVELOPMENT EXECUTION PLAN

Kerjakan project dalam fase yang terstruktur.

Phase 1 — Architecture and Design System
- Project setup.
- Routing.
- Design tokens.
- Shared components.
- Responsive navigation.
- Landing page.

Phase 2 — Backend Foundation
- Supabase setup.
- Database migrations.
- Authentication.
- RLS policies.
- Roles and permissions.
- Seed scripts.

Phase 3 — Curriculum CMS
- Course and lesson management.
- Unit management.
- Content publishing.
- Question bank management.

Phase 4 — Learning Engine
- Onboarding.
- Placement test.
- Learning path.
- Lesson viewer.
- Progression rules.

Phase 5 — Assessment Engine
- Question renderer.
- Grading engine.
- Quiz.
- Unit exam.
- Level exam.
- Results and review.

Phase 6 — Skill Modules
- Vocabulary.
- Grammar.
- Reading.
- Listening.
- Speaking.
- Writing.
- Pronunciation.

Phase 7 — Personalization
- Adaptive practice.
- Spaced repetition.
- Study planner.
- Dashboard analytics.

Phase 8 — Gamification
- XP.
- Streak.
- Achievements.
- Challenges.
- Leaderboard.

Phase 9 — AI Tutor
- Provider integration.
- Conversation interface.
- Feedback generation.
- Usage limits.

Phase 10 — Production Hardening
- Automated testing.
- Security audit.
- Performance optimization.
- Accessibility.
- Error monitoring.
- Deployment documentation.

# FINAL INSTRUCTIONS

Mulai dengan memeriksa struktur repository yang tersedia sebelum mengubah file. Jika project sudah ada, pertahankan bagian yang masih relevan dan jangan menimpa konfigurasi secara sembarangan.

Buat implementation plan, file structure, database ERD, dan daftar milestone. Setelah itu implementasikan fitur secara berurutan.

Jangan berhenti setelah membuat mockup atau dokumentasi. Tulis kode aplikasi yang dapat dijalankan, hubungkan database, buat seed data, implementasikan fitur utama, dan uji alur pengguna.

Pada setiap fase:
1. Implementasikan fitur.
2. Jalankan lint dan type checking.
3. Jalankan test yang relevan.
4. Perbaiki error.
5. Perbarui README dan status implementasi.
6. Lanjutkan ke fase berikutnya.

Jangan mengklaim fitur selesai jika belum diimplementasikan dan diuji.

Jika membutuhkan kredensial atau API key, siapkan konfigurasi yang aman dan jelaskan cara memasukkannya. Jangan mengarang credentials.

Prioritaskan aplikasi yang fungsional, konten pembelajaran yang valid, arsitektur yang scalable, keamanan, dan pengalaman pengguna berkualitas tinggi.

**Definition of Done:** Linguora memiliki full-stack architecture, autentikasi, database, admin CMS, kurikulum bertingkat, question bank, learning progression, ujian, feedback, analytics, gamification, dan seluruh core learning flows yang dapat dijalankan serta diuji. Fitur eksternal seperti AI tutor, email, dan audio pihak ketiga dinyatakan selesai hanya jika integrasinya benar-benar tersedia.