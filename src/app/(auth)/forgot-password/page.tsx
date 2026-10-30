import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "../auth-forms";

export const metadata: Metadata = { title: "Lupa password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Lupa password</h1>
        <p className="text-sm text-muted-foreground">Masukkan email akun kamu. Kami akan mengirim tautan untuk membuat password baru.</p>
      </div>
      <ForgotForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
