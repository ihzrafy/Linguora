/**
 * Config-driven CMS resources. Each resource maps to one table; forms, validation,
 * list pages and save/delete actions are generated from these definitions.
 * Authorization is enforced by RLS (user-scoped client) plus the publish guard trigger.
 */
import type { Permission } from "@/lib/auth";

export type FieldKind = "text" | "textarea" | "markdown" | "number" | "select" | "lines" | "json" | "boolean" | "date";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  max?: number;
  min?: number;
  help?: string;
  options?: { value: string; label: string }[];
  /** Options loaded from another table at render time. */
  optionsFrom?: { table: string; value: string; label: string; order?: string };
  /** Shown in list table. */
  list?: boolean;
  /** Read-only after creation (e.g. keys used by code). */
  immutable?: boolean;
};

export type ResourceDef = {
  key: string;
  table: string;
  path: string;
  title: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  orderBy: { column: string; ascending?: boolean }[];
  search?: string;
  hasStatus: boolean;
  /** Filter by level_id select in list. */
  levelFilter?: boolean;
  readPermission: Permission;
  writePermission: Permission;
  deletable: boolean;
  idColumn?: string;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
const status: FieldDef = { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, required: true, list: true };
const level: FieldDef = { name: "level_id", label: "Level", kind: "select", optionsFrom: { table: "levels", value: "id", label: "code", order: "sort_order" }, required: true, list: true };
const slug = (help = "Huruf kecil, angka, dan tanda hubung."): FieldDef => ({ name: "slug", label: "Slug", kind: "text", required: true, max: 120, help, list: true });

export const RESOURCES: ResourceDef[] = [
  {
    key: "levels",
    table: "levels",
    path: "/admin/levels",
    title: "Level CEFR",
    singular: "level",
    description: "Metadata level, tujuan pembelajaran, dan nilai lulus ujian level.",
    fields: [
      { name: "code", label: "Kode", kind: "text", required: true, immutable: true, list: true },
      { name: "name", label: "Nama", kind: "text", required: true, max: 60, list: true },
      { name: "name_id", label: "Nama (Indonesia)", kind: "text", required: true, max: 60, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", required: true, max: 600 },
      { name: "objectives", label: "Tujuan pembelajaran (satu per baris)", kind: "lines" },
      { name: "explanation_language", label: "Kebijakan bahasa penjelasan", kind: "textarea", max: 300 },
      { name: "exam_pass_threshold", label: "Nilai lulus ujian (%)", kind: "number", min: 1, max: 100, required: true, list: true },
    ],
    orderBy: [{ column: "sort_order" }],
    hasStatus: false,
    readPermission: "content.read",
    writePermission: "content.publish",
    deletable: false,
  },
  {
    key: "tracks",
    table: "learning_tracks",
    path: "/admin/courses?view=tracks",
    title: "Learning track",
    singular: "track",
    description: "Jalur belajar (General, Academic, Business, Career).",
    fields: [
      slug(),
      { name: "name", label: "Nama", kind: "text", required: true, max: 80, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", required: true, max: 600 },
      { name: "goals", label: "Target (satu per baris)", kind: "lines" },
      { name: "icon", label: "Ikon (nama lucide)", kind: "text", max: 40 },
      { name: "sort_order", label: "Urutan", kind: "number", min: 0, max: 1000 },
      status,
    ],
    orderBy: [{ column: "sort_order" }],
    hasStatus: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "courses",
    table: "courses",
    path: "/admin/courses",
    title: "Course",
    singular: "course",
    description: "Course per level dan track. Course inti (core) wajib diselesaikan sebelum ujian level.",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      level,
      { name: "track_id", label: "Track", kind: "select", optionsFrom: { table: "learning_tracks", value: "id", label: "name", order: "sort_order" }, required: true, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", max: 1000 },
      { name: "is_core", label: "Course inti level", kind: "boolean", list: true, help: "Hanya satu course inti per level." },
      { name: "sort_order", label: "Urutan", kind: "number", min: 0, max: 1000 },
      status,
    ],
    orderBy: [{ column: "level_id" }, { column: "sort_order" }],
    search: "title",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "units",
    table: "units",
    path: "/admin/units",
    title: "Unit",
    singular: "unit",
    description: "Unit dalam course. Unit dibuka berurutan berdasarkan urutan (sort order).",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      { name: "course_id", label: "Course", kind: "select", optionsFrom: { table: "courses", value: "id", label: "title", order: "slug" }, required: true, list: true },
      { name: "sort_order", label: "Urutan dalam course", kind: "number", min: 1, max: 200, required: true, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", max: 1000 },
      { name: "objectives", label: "Tujuan (satu per baris)", kind: "lines" },
      status,
    ],
    orderBy: [{ column: "course_id" }, { column: "sort_order" }],
    search: "title",
    hasStatus: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "vocabulary",
    table: "vocabulary_entries",
    path: "/admin/vocabulary",
    title: "Vocabulary",
    singular: "entri kosakata",
    description: "Kamus Linguora: kata, IPA, arti, contoh, sinonim, kolokasi.",
    fields: [
      { name: "word", label: "Kata", kind: "text", required: true, max: 80, list: true },
      { name: "part_of_speech", label: "Part of speech", kind: "text", required: true, max: 30, list: true },
      { name: "ipa", label: "IPA", kind: "text", max: 80 },
      { name: "meaning_id", label: "Arti (Indonesia)", kind: "text", required: true, max: 280, list: true },
      { name: "definition", label: "Definisi (Inggris)", kind: "textarea", required: true, max: 600 },
      { name: "examples", label: "Contoh (JSON: [{\"en\":\"…\",\"id\":\"…\"}])", kind: "json" },
      { name: "synonyms", label: "Sinonim (per baris)", kind: "lines" },
      { name: "antonyms", label: "Antonim (per baris)", kind: "lines" },
      { name: "collocations", label: "Kolokasi (per baris)", kind: "lines" },
      { name: "phrases", label: "Frasa (per baris)", kind: "lines" },
      { name: "related_words", label: "Kata terkait (per baris)", kind: "lines" },
      { ...level, required: false },
      { name: "topic", label: "Topik", kind: "text", max: 80, list: true },
      { name: "audio_url", label: "URL audio (opsional)", kind: "text", max: 400 },
      status,
    ],
    orderBy: [{ column: "word" }],
    search: "word",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "reading",
    table: "reading_passages",
    path: "/admin/reading-passages",
    title: "Reading passages",
    singular: "bacaan",
    description: "Teks bacaan per level. Soal pemahaman dikelola di bank soal (sumber: passage).",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      level,
      { name: "genre", label: "Genre", kind: "select", required: true, list: true, options: ["article", "story", "dialogue", "email", "news", "academic"].map((v) => ({ value: v, label: v })) },
      { name: "body_md", label: "Isi (markdown)", kind: "markdown", required: true, max: 20000 },
      { name: "word_count", label: "Jumlah kata", kind: "number", min: 0, max: 20000 },
      { name: "estimated_minutes", label: "Estimasi menit", kind: "number", min: 1, max: 120 },
      { name: "glossary", label: "Glosarium (JSON: [{\"word\":\"…\",\"meaning\":\"…\"}])", kind: "json" },
      { name: "attribution", label: "Atribusi / sumber", kind: "text", max: 200 },
      status,
    ],
    orderBy: [{ column: "level_id" }, { column: "title" }],
    search: "title",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "listening",
    table: "listening_materials",
    path: "/admin/listening-materials",
    title: "Listening materials",
    singular: "materi listening",
    description: "Skrip listening. Tanpa file audio, materi dibacakan dengan text-to-speech browser (diberi label jelas).",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      level,
      { name: "kind", label: "Jenis", kind: "select", required: true, list: true, options: ["dialogue", "monologue", "announcement", "phone_call", "interview", "podcast"].map((v) => ({ value: v, label: v })) },
      { name: "script", label: "Skrip (JSON: [{\"speaker\":\"A\",\"text\":\"…\"}])", kind: "json", required: true },
      { name: "audio_url", label: "URL audio berlisensi (opsional — unggah di bawah)", kind: "text", max: 400 },
      { name: "audio_source", label: "Sumber audio", kind: "select", required: true, list: true, options: [{ value: "tts", label: "TTS browser" }, { value: "uploaded", label: "File audio" }] },
      { name: "accent", label: "Aksen", kind: "text", max: 40 },
      { name: "duration_seconds", label: "Durasi (detik)", kind: "number", min: 0, max: 7200 },
      status,
    ],
    orderBy: [{ column: "level_id" }, { column: "title" }],
    search: "title",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "speaking",
    table: "speaking_prompts",
    path: "/admin/speaking-prompts",
    title: "Speaking prompts",
    singular: "prompt speaking",
    description: "Prompt terpandu, role-play, situasi, dan pronunciation.",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      level,
      { name: "kind", label: "Jenis", kind: "select", required: true, list: true, options: ["guided", "role_play", "situation", "pronunciation"].map((v) => ({ value: v, label: v })) },
      { name: "prompt_md", label: "Prompt (markdown)", kind: "markdown", required: true, max: 5000 },
      { name: "target_phrases", label: "Frasa target (per baris)", kind: "lines" },
      { name: "sample_answer", label: "Contoh jawaban", kind: "textarea", max: 3000 },
      { name: "tips", label: "Tips (per baris)", kind: "lines" },
      status,
    ],
    orderBy: [{ column: "level_id" }, { column: "title" }],
    search: "title",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "writing-prompts",
    table: "writing_prompts",
    path: "/admin/writing-rubrics?view=prompts",
    title: "Writing prompts",
    singular: "prompt writing",
    description: "Tugas menulis per level.",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 150, list: true },
      level,
      { name: "kind", label: "Jenis", kind: "select", required: true, list: true, options: ["sentence", "paragraph", "email_formal", "email_informal", "essay", "opinion", "summary", "correction"].map((v) => ({ value: v, label: v })) },
      { name: "instructions_md", label: "Instruksi (markdown)", kind: "markdown", required: true, max: 5000 },
      { name: "min_words", label: "Minimal kata", kind: "number", min: 5, max: 5000, required: true },
      { name: "max_words", label: "Maksimal kata", kind: "number", min: 10, max: 10000, required: true },
      { name: "model_answer", label: "Contoh jawaban", kind: "textarea", max: 10000 },
      { name: "rubric_id", label: "Rubrik", kind: "select", optionsFrom: { table: "writing_rubrics", value: "id", label: "name" } },
      status,
    ],
    orderBy: [{ column: "level_id" }, { column: "title" }],
    search: "title",
    hasStatus: true,
    levelFilter: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "rubrics",
    table: "writing_rubrics",
    path: "/admin/writing-rubrics",
    title: "Writing rubrics",
    singular: "rubrik",
    description: "Rubrik analitik untuk penilaian writing.",
    fields: [
      { name: "key", label: "Key", kind: "text", required: true, immutable: true, max: 60, list: true },
      { name: "name", label: "Nama", kind: "text", required: true, max: 120, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", max: 1000 },
      { name: "criteria", label: "Kriteria (JSON: [{\"key\",\"label\",\"description\",\"max\"}])", kind: "json", required: true },
    ],
    orderBy: [{ column: "name" }],
    hasStatus: false,
    readPermission: "content.read",
    writePermission: "content.publish",
    deletable: false,
  },
  {
    key: "achievements",
    table: "achievements",
    path: "/admin/achievements",
    title: "Achievements",
    singular: "achievement",
    description: "Achievement dievaluasi otomatis di server berdasarkan metrik.",
    fields: [
      { name: "key", label: "Key", kind: "text", required: true, immutable: true, max: 60, list: true },
      { name: "name", label: "Nama", kind: "text", required: true, max: 80, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", required: true, max: 300 },
      { name: "icon", label: "Ikon", kind: "text", max: 40 },
      { name: "category", label: "Kategori", kind: "select", list: true, options: ["learning", "milestone", "accuracy", "habit", "xp", "vocabulary", "skills"].map((v) => ({ value: v, label: v })) },
      {
        name: "criteria",
        label: "Kriteria (JSON: {\"metric\":\"lessons_completed\",\"threshold\":10})",
        kind: "json",
        required: true,
        help: "Metrik: lessons_completed, lessons_mastered, total_xp, streak, perfect_scores, correct_answers, units_completed, levels_passed, placement_done, vocabulary_saved, reviews_done, writing_submitted, speaking_sessions, daily_goals",
      },
      { name: "xp_reward", label: "Hadiah XP", kind: "number", min: 0, max: 1000, list: true },
      { name: "is_active", label: "Aktif", kind: "boolean", list: true },
      { name: "sort_order", label: "Urutan", kind: "number", min: 0, max: 1000 },
    ],
    orderBy: [{ column: "sort_order" }],
    hasStatus: false,
    readPermission: "content.read",
    writePermission: "content.publish",
    deletable: true,
  },
  {
    key: "challenges",
    table: "challenges",
    path: "/admin/achievements?view=challenges",
    title: "Daily quests & weekly challenges",
    singular: "tantangan",
    description: "Tantangan harian/mingguan; progres dihitung dari aktivitas harian.",
    fields: [
      { name: "key", label: "Key", kind: "text", required: true, immutable: true, max: 60, list: true },
      { name: "period", label: "Periode", kind: "select", required: true, list: true, options: [{ value: "daily", label: "Harian" }, { value: "weekly", label: "Mingguan" }] },
      { name: "title", label: "Judul", kind: "text", required: true, max: 100, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", required: true, max: 300 },
      { name: "metric", label: "Metrik", kind: "select", required: true, list: true, options: ["xp", "questions", "correct_answers", "lessons", "minutes", "reviews"].map((v) => ({ value: v, label: v })) },
      { name: "target", label: "Target", kind: "number", min: 1, max: 100000, required: true, list: true },
      { name: "xp_reward", label: "Hadiah XP", kind: "number", min: 1, max: 500, required: true, list: true },
      { name: "is_active", label: "Aktif", kind: "boolean", list: true },
    ],
    orderBy: [{ column: "period" }, { column: "key" }],
    hasStatus: false,
    readPermission: "content.read",
    writePermission: "content.publish",
    deletable: true,
  },
  {
    key: "blog",
    table: "blog_posts",
    path: "/admin/content-review?view=blog",
    title: "Blog",
    singular: "artikel",
    description: "Artikel blog publik.",
    fields: [
      slug(),
      { name: "title", label: "Judul", kind: "text", required: true, max: 200, list: true },
      { name: "excerpt", label: "Ringkasan", kind: "textarea", required: true, max: 400 },
      { name: "body_md", label: "Isi (markdown)", kind: "markdown", required: true, max: 50000 },
      { name: "tags", label: "Tag (per baris)", kind: "lines" },
      { name: "author_name", label: "Penulis", kind: "text", max: 100 },
      { name: "published_at", label: "Tanggal terbit", kind: "date" },
      status,
    ],
    orderBy: [{ column: "created_at", ascending: false }],
    search: "title",
    hasStatus: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
];

RESOURCES.push(
  {
    key: "quizzes",
    table: "quizzes",
    path: "/admin/quizzes",
    title: "Quiz",
    singular: "quiz",
    description: "Mini quiz lesson dan unit assessment: nilai lulus, waktu, batas percobaan, dan jumlah soal acak dari pool.",
    fields: [
      { name: "title", label: "Judul", kind: "text", required: true, max: 200, list: true },
      { name: "kind", label: "Jenis", kind: "select", required: true, immutable: true, list: true, options: [{ value: "lesson_quiz", label: "Mini quiz lesson" }, { value: "unit_test", label: "Unit assessment" }, { value: "practice_set", label: "Set latihan" }] },
      { name: "lesson_id", label: "Lesson (untuk mini quiz)", kind: "select", optionsFrom: { table: "lessons", value: "id", label: "slug", order: "slug" } },
      { name: "unit_id", label: "Unit (untuk unit assessment)", kind: "select", optionsFrom: { table: "units", value: "id", label: "slug", order: "slug" } },
      { name: "description", label: "Deskripsi", kind: "textarea", max: 1000 },
      { name: "pass_threshold", label: "Nilai lulus (%)", kind: "number", min: 1, max: 100, required: true, list: true },
      { name: "time_limit_seconds", label: "Batas waktu (detik, kosong = tanpa batas)", kind: "number", min: 60, max: 14400, list: true },
      { name: "max_attempts", label: "Batas percobaan (kosong = tanpa batas)", kind: "number", min: 1, max: 100 },
      { name: "question_count", label: "Jumlah soal per attempt (kosong = semua)", kind: "number", min: 1, max: 200, list: true },
      { name: "shuffle_questions", label: "Acak soal", kind: "boolean" },
      { name: "shuffle_options", label: "Acak opsi", kind: "boolean" },
      { name: "status", label: "Status", kind: "select", required: true, list: true, options: STATUS_OPTIONS },
    ],
    orderBy: [{ column: "kind" }, { column: "title" }],
    search: "title",
    hasStatus: true,
    readPermission: "content.read",
    writePermission: "content.write",
    deletable: true,
  },
  {
    key: "exams",
    table: "exams",
    path: "/admin/exams",
    title: "Ujian",
    singular: "ujian",
    description: "Ujian level dan placement test. Soal dipilih acak dari pool mengikuti blueprint kategori.",
    fields: [
      { name: "slug", label: "Slug", kind: "text", required: true, max: 120, list: true },
      { name: "title", label: "Judul", kind: "text", required: true, max: 200, list: true },
      { name: "kind", label: "Jenis", kind: "select", required: true, immutable: true, list: true, options: [{ value: "level_exam", label: "Ujian level" }, { value: "placement", label: "Placement test" }] },
      { name: "level_id", label: "Level (ujian level)", kind: "select", optionsFrom: { table: "levels", value: "id", label: "code", order: "sort_order" }, list: true },
      { name: "description", label: "Deskripsi", kind: "textarea", max: 1000 },
      { name: "pass_threshold", label: "Nilai lulus (%)", kind: "number", min: 1, max: 100, required: true, list: true },
      { name: "time_limit_seconds", label: "Batas waktu (detik)", kind: "number", min: 60, max: 14400 },
      { name: "max_attempts", label: "Batas percobaan (kosong = tanpa batas)", kind: "number", min: 1, max: 100 },
      { name: "cooldown_hours", label: "Masa tunggu ujian ulang (jam)", kind: "number", min: 0, max: 720, required: true },
      { name: "question_count", label: "Jumlah soal", kind: "number", min: 1, max: 200, required: true, list: true },
      { name: "blueprint", label: "Blueprint (JSON, mis. {\"grammar\":12,\"vocabulary\":8} atau {\"perLevel\":8})", kind: "json", required: true },
      { name: "shuffle_options", label: "Acak opsi", kind: "boolean" },
      { name: "status", label: "Status", kind: "select", required: true, list: true, options: STATUS_OPTIONS },
    ],
    orderBy: [{ column: "kind" }, { column: "slug" }],
    hasStatus: true,
    readPermission: "content.read",
    writePermission: "content.publish",
    deletable: false,
  },
);

// Questions and lessons have dedicated editors; these entries enable generic bulk/delete actions.
RESOURCES.push(
  { key: "questions", table: "questions", path: "/admin/question-bank", title: "Bank soal", singular: "soal", description: "", fields: [], orderBy: [], hasStatus: true, readPermission: "content.read", writePermission: "content.write", deletable: true },
  { key: "lessons", table: "lessons", path: "/admin/lessons", title: "Lesson", singular: "lesson", description: "", fields: [], orderBy: [], hasStatus: true, readPermission: "content.read", writePermission: "content.write", deletable: true },
);

export function getResource(key: string): ResourceDef {
  const def = RESOURCES.find((r) => r.key === key);
  if (!def) throw new Error(`Unknown resource ${key}`);
  return def;
}
