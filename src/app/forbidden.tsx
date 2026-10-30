import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldAlert className="size-12 text-destructive" aria-hidden />
      <p className="text-sm font-semibold text-destructive">403</p>
      <h1 className="text-3xl font-bold">Akses ditolak</h1>
      <p className="max-w-md text-muted-foreground">Akunmu tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika menurutmu ini keliru.</p>
      <Button asChild>
        <Link href="/app/dashboard">Kembali ke dashboard</Link>
      </Button>
    </main>
  );
}
