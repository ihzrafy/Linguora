import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PillLink, SectionLabel } from "@/components/marketing/editorial";
import { getAuthUser } from "@/lib/auth";
import { MarketingMobileNav } from "./mobile-nav";

const NAV = [
  { href: "/features", label: "Fitur" },
  { href: "/learning-path", label: "Learning Path" },
  { href: "/curriculum", label: "Kurikulum" },
  { href: "/placement-test", label: "Placement Test" },
  { href: "/pricing", label: "Harga" },
  { href: "/blog", label: "Blog" },
];

const FOOTER = [
  { title: "Produk", links: [{ href: "/features", label: "Fitur" }, { href: "/learning-path", label: "Learning path" }, { href: "/curriculum", label: "Kurikulum" }, { href: "/pricing", label: "Harga" }] },
  { title: "Belajar", links: [{ href: "/placement-test", label: "Placement test" }, { href: "/blog", label: "Blog" }, { href: "/faq", label: "FAQ" }] },
  { title: "Perusahaan", links: [{ href: "/about", label: "Tentang" }, { href: "/contact", label: "Kontak" }, { href: "/terms", label: "Syarat layanan" }, { href: "/privacy", label: "Privasi" }] },
];

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md">
        <div className="container-site flex h-[4.5rem] items-center gap-6">
          <Logo />
          <nav aria-label="Navigasi situs" className="hidden flex-1 items-center justify-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[0.95rem] text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:ml-0">
            <ThemeToggle />
            {user ? (
              <PillLink href="/app/dashboard" className="hidden sm:inline-flex">
                Buka aplikasi
              </PillLink>
            ) : (
              <>
                <Link href="/login" className="hidden text-[0.95rem] font-medium sm:inline">
                  Masuk
                </Link>
                <PillLink href="/register" className="hidden sm:inline-flex">
                  Daftar gratis
                </PillLink>
              </>
            )}
            <MarketingMobileNav items={NAV} />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="bg-ink text-ink-foreground">
        <div className="container-site grid gap-14 pt-20 pb-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionLabel tone="ink">Mulai dari sini</SectionLabel>
            <p className="mt-5 max-w-md font-display text-3xl leading-[1.08] font-semibold tracking-[-0.03em] md:text-4xl">Belajar bahasa Inggris, selangkah demi selangkah.</p>
            <PillLink href={user ? "/app/dashboard" : "/register"} variant="highlight" className="mt-8">
              {user ? "Buka aplikasi" : "Daftar gratis"}
            </PillLink>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <p className="type-eyebrow text-ink-muted">{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[0.95rem] text-ink-foreground/90 transition-colors hover:text-highlight">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="container-site overflow-hidden" aria-hidden>
          <p className="pb-[0.06em] font-display text-[clamp(4rem,21.5vw,20rem)] leading-[1] font-semibold tracking-[-0.06em] select-none">
            Linguora<span className="text-highlight">.</span>
          </p>
        </div>
        <div className="container-site">
          <div className="flex flex-col gap-2 border-t border-ink-line py-6 text-sm text-ink-muted md:flex-row md:justify-between">
            <p>© {new Date().getFullYear()} Linguora. Semua hak dilindungi.</p>
            <p>CEFR dipakai sebagai acuan kurikulum — Linguora tidak menerbitkan sertifikasi CEFR resmi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
