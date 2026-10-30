import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark className="size-12" />
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-muted-foreground">Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/app/dashboard">Ke dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Beranda</Link>
        </Button>
      </div>
    </main>
  );
}
