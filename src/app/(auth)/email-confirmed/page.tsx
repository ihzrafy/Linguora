import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Email terkonfirmasi" };

export default async function EmailConfirmedPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeRedirectPath((await searchParams).next, "/app/onboarding");
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <CheckCircle2 className="size-9 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Email terkonfirmasi</h1>
        <p className="text-sm text-muted-foreground">
          Akun Linguora kamu sudah aktif. Kalau kamu mendaftar di perangkat lain (misalnya laptop), kembali ke sana lalu klik{" "}
          <strong className="text-foreground">Sudah konfirmasi? Masuk</strong> — atau masuk seperti biasa.
        </p>
      </div>
      <Link href={next} className={buttonVariants({ className: "h-10 w-full" })}>
        Lanjut di perangkat ini
      </Link>
    </div>
  );
}
