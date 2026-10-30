import {
  Activity,
  ClipboardCheck,
  FileQuestion,
  FileText,
  FolderTree,
  ScrollText,
  Sliders,
  Users,
  UserCog,
  Award,
  BarChart3,
  Bell,
  BookA,
  Bookmark,
  BookOpen,
  Bot,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Flame,
  GraduationCap,
  Headphones,
  History,
  Layers,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Repeat,
  Route,
  Settings,
  SpellCheck,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const APP_NAV: NavGroup[] = [
  {
    label: "Belajar",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/learn", label: "Learning Path", icon: Route },
      { href: "/app/practice", label: "Latihan Adaptif", icon: Dumbbell },
      { href: "/app/review", label: "Review Queue", icon: Repeat },
      { href: "/app/daily-challenge", label: "Daily Challenge", icon: Flame },
      { href: "/app/placement-test", label: "Placement Test", icon: ListChecks },
    ],
  },
  {
    label: "Keterampilan",
    items: [
      { href: "/app/vocabulary", label: "Vocabulary", icon: BookA },
      { href: "/app/flashcards", label: "Flashcards", icon: Layers },
      { href: "/app/grammar", label: "Grammar", icon: SpellCheck },
      { href: "/app/reading", label: "Reading Lab", icon: BookOpen },
      { href: "/app/listening", label: "Listening Lab", icon: Headphones },
      { href: "/app/speaking", label: "Speaking Lab", icon: Mic },
      { href: "/app/pronunciation", label: "Pronunciation", icon: GraduationCap },
      { href: "/app/writing", label: "Writing Lab", icon: PenLine },
      { href: "/app/conversation", label: "AI Tutor", icon: Bot },
    ],
  },
  {
    label: "Progres",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/app/achievements", label: "Achievements", icon: Award },
      { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/app/history", label: "Riwayat", icon: History },
    ],
  },
  {
    label: "Alat Belajar",
    items: [
      { href: "/app/study-planner", label: "Study Planner", icon: CalendarCheck },
      { href: "/app/notes", label: "Catatan & Jurnal", icon: NotebookPen },
      { href: "/app/bookmarks", label: "Bookmark", icon: Bookmark },
    ],
  },
  {
    label: "Akun",
    items: [
      { href: "/app/notifications", label: "Notifikasi", icon: Bell },
      { href: "/app/profile", label: "Profil", icon: User },
      { href: "/app/settings", label: "Pengaturan", icon: Settings },
      { href: "/app/billing", label: "Paket & Tagihan", icon: CreditCard },
    ],
  },
];

export const CONVERSATION_ICON = MessagesSquare;

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [
      { href: "/admin", label: "Overview", icon: Activity },
      { href: "/admin/reports", label: "Laporan", icon: BarChart3 },
    ],
  },
  {
    label: "Kurikulum",
    items: [
      { href: "/admin/levels", label: "Level", icon: GraduationCap },
      { href: "/admin/courses", label: "Course & Track", icon: FolderTree },
      { href: "/admin/units", label: "Unit", icon: Layers },
      { href: "/admin/lessons", label: "Lesson", icon: BookOpen },
      { href: "/admin/question-bank", label: "Bank Soal", icon: FileQuestion },
      { href: "/admin/quizzes", label: "Quiz", icon: ListChecks },
      { href: "/admin/exams", label: "Ujian", icon: ClipboardCheck },
      { href: "/admin/content-review", label: "Review Konten", icon: SpellCheck },
    ],
  },
  {
    label: "Konten Keterampilan",
    items: [
      { href: "/admin/vocabulary", label: "Vocabulary", icon: BookA },
      { href: "/admin/reading-passages", label: "Reading", icon: FileText },
      { href: "/admin/listening-materials", label: "Listening", icon: Headphones },
      { href: "/admin/speaking-prompts", label: "Speaking", icon: Mic },
      { href: "/admin/writing-rubrics", label: "Writing & Rubrik", icon: PenLine },
    ],
  },
  {
    label: "Gamifikasi",
    items: [
      { href: "/admin/achievements", label: "Achievements", icon: Award },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/users", label: "Pengguna", icon: Users },
      { href: "/admin/roles", label: "Role & Izin", icon: UserCog },
      { href: "/admin/system-settings", label: "Pengaturan Sistem", icon: Sliders },
      { href: "/admin/audit-logs", label: "Audit Log", icon: ScrollText },
    ],
  },
];
