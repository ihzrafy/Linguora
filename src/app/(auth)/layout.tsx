import Link from "next/link";
import { BookOpenCheck, Brain, Route } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const points = [
  { icon: Route, title: "Learning path terstruktur", text: "6 level CEFR, unit dan lesson berurutan dengan prasyarat yang jelas." },
  { icon: BookOpenCheck, title: "Penilaian di server", text: "Jawaban diperiksa di server dengan pembahasan setelah kamu menjawab." },
  { icon: Brain, title: "Spaced repetition", text: "Materi yang mulai terlupa dijadwalkan ulang secara otomatis." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-card">
        <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
        <div
          className="absolute -top-32 -right-32 size-96 rounded-full bg-brand-blue/40 blur-3xl dark:bg-brand-blue/20"
          aria-hidden
        />
        <div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-brand-lavender/40 blur-3xl dark:bg-primary/20" aria-hidden />
        <Logo className="relative text-white dark:text-foreground" />
        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl leading-tight font-bold text-white dark:text-foreground">
            Belajar bahasa Inggris dengan jalur yang jelas — dari A1 sampai C2.
          </h2>
          <ul className="space-y-5">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <div className="rounded-xl bg-white/15 p-2.5 dark:bg-primary/15">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-white dark:text-foreground">{title}</p>
                  <p className="text-sm text-white/75 dark:text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60 dark:text-muted-foreground">
          CEFR digunakan sebagai acuan kurikulum, bukan sertifikasi resmi.
        </p>
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Beranda
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
