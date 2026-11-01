import Link from "next/link";
import { Mark, SectionLabel } from "@/components/marketing/editorial";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const points = [
  { title: "Learning path terstruktur", text: "6 level CEFR, unit dan lesson berurutan dengan prasyarat yang jelas." },
  { title: "Penilaian di server", text: "Jawaban diperiksa di server dengan pembahasan setelah kamu menjawab." },
  { title: "Spaced repetition", text: "Materi yang mulai terlupa dijadwalkan ulang secara otomatis." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-editorial grid min-h-dvh bg-background text-foreground lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-ink text-ink-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full bg-lime" />
        <Logo tone="editorial" className="relative [&_rect]:fill-ink-foreground [&_path]:stroke-ink" />
        <div className="relative space-y-10">
          <SectionLabel tone="ink">Kurikulum A1–C2</SectionLabel>
          <h2 className="max-w-md font-display text-5xl leading-[1.02] font-semibold tracking-[-0.04em]">
            Bahasa Inggris, selangkah demi <Mark variant="text">selangkah.</Mark>
          </h2>
          <ol className="max-w-md border-t border-ink-line">
            {points.map(({ title, text }, i) => (
              <li key={title} className="grid grid-cols-[2.5rem_1fr] border-b border-ink-line py-4">
                <span className="pt-1 font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-xs text-ink-muted">CEFR digunakan sebagai acuan kurikulum, bukan sertifikasi resmi.</p>
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Logo tone="editorial" className="lg:invisible" />
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
