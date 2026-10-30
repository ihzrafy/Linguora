import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Selamat datang kembali</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk melanjutkan learning path kamu.</p>
      </div>
      <LoginForm next={next} initialError={error === "link" ? "Tautan tidak valid atau sudah kedaluwarsa." : undefined} />
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
