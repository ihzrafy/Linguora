import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Buat akun Linguora</h1>
        <p className="text-sm text-muted-foreground">Mulai dari placement test, lalu ikuti learning path sesuai level kamu.</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
