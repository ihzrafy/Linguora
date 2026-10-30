import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav aria-label="Navigasi situs" className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href="/app/dashboard">Buka aplikasi</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Daftar gratis</Link>
                </Button>
              </>
            )}
            <MarketingMobileNav items={NAV} />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">Platform belajar bahasa Inggris terstruktur untuk penutur bahasa Indonesia, dari A1 sampai C2.</p>
            <p className="text-xs text-muted-foreground">CEFR digunakan sebagai acuan kurikulum. Linguora tidak menerbitkan sertifikasi CEFR resmi.</p>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Linguora. Semua hak dilindungi.</div>
      </footer>
    </div>
  );
}
