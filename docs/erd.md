# Entity-Relationship Diagram (ERD) & Database Architecture — Linguora

Dokumen ini memuat spesifikasi relasional, kamus data, diagram entitas-relasi (Mermaid), model keamanan Row Level Security (RLS), dan strategi indeks database Linguora berbasis Supabase PostgreSQL.

---

## 1. Arsitektur Database & Segregasi Data

Database Linguora dirancang ternormalisasi tinggi dengan 7 modul domain utama:
1. **Core & Auth**: Profil pengguna, sistem role berbasis rank, permission matrix, dan audit logging.
2. **Curriculum Engine**: Jalur belajar (CEFR A1–C2), track pembelajaran, course, unit, lesson berstruktur 12 seksi, dan dependency prerequisites.
3. **Assessment & Question Bank**: 20 tipe soal interaktif, pemisahan kunci jawaban privat (`question_answer_keys`) dari data soal publik, kuis, ujian unit, ujian level, attempt, dan jawaban tersimpan.
4. **Skills & Knowledge Labs**: Kosakata (IPA, makna, kolokasi), spaced repetition queue (SM-2/leitner), grammar syllabus, teks reading, materi listening, prompt speaking, dan prompt writing berskala rubrik.
5. **Gamification & Progress Tracking**: Status penguasaan materi, akumulasi XP atomik dengan idempotency key, perhitungan streak berbasis timezone, badges, quests harian, dan leaderboard snapshot.
6. **Study Productivity & AI Tutor**: Study planner, sesi belajar, catatan, bookmark, dan sesi percakapan AI tutor dengan rate-limiting.
7. **CMS & Audit Trail**: Versioning konten dengan snapshot JSONB, changelog, dan rollback capabilities.

---

## 2. Diagram Hubungan Entitas (Mermaid)

### 2.1 Core Identity & Authorization

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 identitas Supabase"
    profiles ||--o{ user_roles : "memiliki peran"
    roles ||--o{ user_roles : "diberikan kepada"
    roles ||--o{ role_permissions : "memiliki izin granular"
    profiles ||--o{ audit_logs : "pelaku audit"

    profiles {
        uuid id PK
        text username UK
        text display_name
        text avatar_url
        text bio
        text timezone
        text learning_goal
        uuid active_track_id FK
        uuid current_level_id FK
        uuid placement_level_id FK
        int daily_goal_xp
        int daily_goal_minutes
        int weekly_goal_minutes
        boolean leaderboard_opt_in
        timestamptz onboarding_completed_at
        timestamptz created_at
        timestamptz updated_at
    }

    roles {
        app_role role PK
        text name
        text description
        smallint rank
    }

    role_permissions {
        app_role role PK,FK
        text permission PK
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role FK
        timestamptz granted_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        text action
        text entity
        uuid entity_id
        jsonb metadata
        text ip_address
        timestamptz created_at
    }
```

### 2.2 Kurikulum & Lesson Engine

```mermaid
erDiagram
    levels ||--o{ courses : "memiliki course"
    learning_tracks ||--o{ courses : "menampung course"
    courses ||--o{ units : "terbagi atas unit"
    units ||--o{ lessons : "berisi lesson"
    lessons ||--o{ lesson_sections : "12 seksi materi"
    lessons ||--o{ lesson_prerequisites : "syarat sebelum membuka"
    lessons ||--o{ content_versions : "riwayat versi"

    levels {
        uuid id PK
        text code UK
        text name
        text name_id
        text description
        text_array objectives
        text explanation_language
        smallint sort_order
        smallint exam_pass_threshold
    }

    learning_tracks {
        uuid id PK
        text slug UK
        text name
        text description
        text_array goals
        content_status status
        smallint sort_order
    }

    courses {
        uuid id PK
        uuid level_id FK
        uuid track_id FK
        text slug UK
        text title
        text description
        boolean is_core
        content_status status
        smallint sort_order
    }

    units {
        uuid id PK
        uuid course_id FK
        text slug UK
        text title
        text description
        text_array objectives
        content_status status
        smallint sort_order
    }

    lessons {
        uuid id PK
        uuid unit_id FK
        text slug UK
        text title
        text summary
        text_array objectives
        text completion_criteria
        int estimated_minutes
        int xp_reward
        int version
        content_status status
        timestamptz publish_at
        smallint sort_order
    }

    lesson_sections {
        uuid id PK
        uuid lesson_id FK
        lesson_section_kind kind
        text title
        text body_md
        jsonb data
        smallint sort_order
    }

    lesson_prerequisites {
        uuid lesson_id PK,FK
        uuid prerequisite_id PK,FK
    }
```

### 2.3 Assessment Engine & Bank Soal

```mermaid
erDiagram
    levels ||--o{ questions : "tingkat kesulitan"
    lessons ||--o{ questions : "latihan terbimbing/mandiri"
    questions ||--o{ question_options : "pilihan jawaban"
    questions ||--|| question_answer_keys : "kunci privat (server-only)"
    quizzes ||--o{ quiz_questions : "soal kuis"
    exams ||--o{ exam_questions : "soal ujian"
    assessment_attempts ||--o{ assessment_answers : "jawaban attempt"
    questions ||--o{ assessment_answers : "soal yang dijawab"

    questions {
        uuid id PK
        text external_key UK
        uuid level_id FK
        uuid lesson_id FK
        question_type type
        question_stage stage
        skill_category skill
        text topic
        text prompt
        text instructions
        int points
        jsonb data
        text explanation
        text common_misconceptions
        content_status status
    }

    question_answer_keys {
        uuid question_id PK,FK
        jsonb answer
        jsonb authored
        numeric partial_credit_threshold
        timestamptz updated_at
    }

    assessment_attempts {
        uuid id PK
        uuid user_id FK
        uuid quiz_id FK
        uuid exam_id FK
        assessment_kind kind
        attempt_status status
        uuid_array question_ids
        numeric score_percent
        boolean passed
        int xp_awarded
        timestamptz started_at
        timestamptz completed_at
    }

    assessment_answers {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        jsonb response
        boolean is_correct
        numeric points_awarded
        numeric max_points
        boolean needs_manual_grading
        text feedback
        timestamptz answered_at
    }
```

### 2.4 Skills Labs & Spaced Repetition (SRS)

```mermaid
erDiagram
    vocabulary_entries ||--o{ review_schedules : "jadwal review"
    profiles ||--o{ user_vocabulary : "kosakata personal"
    vocabulary_entries ||--o{ user_vocabulary : "kata tersimpan"
    vocabulary_collections ||--o{ vocabulary_collection_entries : "isi koleksi"
    profiles ||--o{ writing_submissions : "tugas menulis"
    writing_prompts ||--o{ writing_submissions : "prompt writing"
    profiles ||--o{ speaking_sessions : "rekaman suara"
    speaking_prompts ||--o{ speaking_sessions : "prompt speaking"

    vocabulary_entries {
        uuid id PK
        text word
        text part_of_speech
        text ipa
        text meaning_id
        text definition
        jsonb examples
        text_array synonyms
        text_array antonyms
        text_array collocations
        text_array phrases
        uuid level_id FK
        text topic
        text audio_url
        content_status status
    }

    review_schedules {
        uuid id PK
        uuid user_id FK
        uuid item_id
        text item_type
        int repetitions
        numeric ease_factor
        int interval_days
        timestamptz due_at
        timestamptz last_reviewed_at
    }

    reading_passages {
        uuid id PK
        uuid level_id FK
        text slug UK
        text title
        text genre
        text body_md
        int word_count
        int estimated_minutes
        jsonb glossary
        content_status status
    }

    writing_submissions {
        uuid id PK
        uuid user_id FK
        uuid prompt_id FK
        text content
        int word_count
        submission_status status
        jsonb ai_feedback
        jsonb rubric_scores
        numeric final_score
    }
```

### 2.5 Gamifikasi & Metrik Progres

```mermaid
erDiagram
    profiles ||--o{ learning_progress : "progres materi"
    profiles ||--|| user_stats : "1:1 statistik ringkasan"
    profiles ||--o{ xp_transactions : "riwayat XP ledger"
    profiles ||--o{ daily_activity : "aktivitas harian streak"
    profiles ||--o{ user_achievements : "lencana diraih"
    achievements ||--o{ user_achievements : "definisi badge"

    learning_progress {
        uuid id PK
        uuid user_id FK
        uuid lesson_id FK
        progress_status status
        boolean material_completed
        int quiz_attempts
        numeric best_score
        timestamptz mastered_at
    }

    user_stats {
        uuid user_id PK,FK
        int total_xp
        int current_streak
        int longest_streak
        date last_activity_date
        int lessons_completed
        int questions_answered
        int correct_answers
        int study_time_seconds
    }

    xp_transactions {
        uuid id PK
        uuid user_id FK
        int amount
        text source
        text idempotency_key UK
        date activity_date
        timestamptz created_at
    }

    daily_activity {
        uuid id PK
        uuid user_id FK
        date activity_date
        int xp_earned
        int minutes_studied
        int lessons_completed
        boolean daily_goal_met
    }
```

---

## 3. Kamus Data & Batasan (Constraints)

| Tabel | Primary Key | Foreign Keys / Index Penting | Aturan & Constraints |
|---|---|---|---|
| `profiles` | `id` (UUID) | `auth.users(id)` ON DELETE CASCADE | `username ~ '^[a-z0-9_]{3,24}$'`, `daily_goal_xp BETWEEN 10 AND 500` |
| `roles` | `role` (enum) | - | `rank SMALLINT UNIQUE` (super_admin=100, admin=80, editor=60, reviewer=50, student=10) |
| `user_roles` | `id` (UUID) | `profiles(id)`, `roles(role)` | UNIQUE (`user_id`, `role`) |
| `lessons` | `id` (UUID) | `units(id)` ON DELETE CASCADE | `slug` UNIQUE, `estimated_minutes BETWEEN 1 AND 240` |
| `lesson_sections` | `id` (UUID) | `lessons(id)` ON DELETE CASCADE | 12 macam `lesson_section_kind` |
| `questions` | `id` (UUID) | `levels(id)`, `lessons(id)` | `points >= 1`, 20 macam `question_type` |
| `question_answer_keys` | `question_id` (UUID) | `questions(id)` ON DELETE CASCADE | Kunci privat terpisah dari tabel `questions` untuk RLS |
| `assessment_attempts` | `id` (UUID) | `profiles(id)`, `quizzes(id)`, `exams(id)` | Status: `in_progress`, `graded`, `abandoned` |
| `xp_transactions` | `id` (UUID) | `profiles(id)` | `idempotency_key` UNIQUE mencegah duplikasi XP |
| `user_stats` | `user_id` (UUID) | `profiles(id)` | Trigger otomatis memperbarui akumulasi saat XP bertambah |

---

## 4. Model Keamanan & Kebijakan Row Level Security (RLS)

1. **Prinsip Least Privilege**: Semua tabel mengaktifkan `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
2. **Isolasi Data Pembelajar**:
   - `assessment_attempts`, `assessment_answers`, `xp_transactions`, `user_stats`, `learning_progress`, `user_vocabulary`, `review_schedules`, `notes`, `bookmarks`: Hanya pemilik baris (`auth.uid() = user_id`) yang dapat membaca.
   - Penulisan skor, XP, progress, dan unlock diblokir dari manipulasi langsung client (`WITH CHECK (false)`); seluruh mutasi wajib melalui PostgreSQL Stored Functions berhak istimewa (`SECURITY DEFINER`).
3. **Penyembunyian Kunci Jawaban**:
   - Tabel `question_answer_keys` membatasi akses SELECT hanya untuk staf yang memiliki peran reviewer/admin/super_admin. Siswa/pengguna publik **tidak memiliki izin SELECT sama sekali**. Jawaban diperiksa di server via fungsi `evaluate_attempt_answers`.
4. **Penguncian Materi (Progression Guard)**:
   - SELECT pada `lesson_sections` diatur RLS agar memeriksa fungsi `lesson_accessible_for(auth.uid(), lesson_id)`. Siswa tidak dapat mengintip isi materi lesson yang prasyaratnya belum terpenuhi.
5. **CMS & Role-Based Access Control**:
   - Pengguna dengan peran `content_editor` hanya dapat membuat konten dengan status `draft` atau `in_review`.
   - Mengubah status menjadi `published` memicu trigger pemeriksaan izin `content.publish`.

---

## 5. Strategi Pengindeksan & Optimasi Kueri

- **B-Tree Indexes**: Seluruh foreign key (`user_id`, `lesson_id`, `unit_id`, `course_id`, `level_id`) memiliki indeks B-tree untuk menjamin performa JOIN dan cascade DELETE.
- **Unique Indexes**: Mengamankan integritas slug, username, idempotency key XP, serta pasangan unik relasi (`lesson_prerequisites`, `role_permissions`, `user_roles`).
- **Composite Indexes**:
  - `assessment_attempts(user_id, status, created_at DESC)` untuk pagination riwayat ujian cepat.
  - `review_schedules(user_id, due_at)` untuk polling antrean SRS yang efisien.
  - `daily_activity(user_id, activity_date DESC)` untuk komputasi streak instan.
- **Trigram & Text Search**:
  - Ekstensi `pg_trgm` diaktifkan untuk pencarian fuzzy pada kamus kosakata (`vocabulary_entries.word`) dan bank soal (`questions.prompt`).
