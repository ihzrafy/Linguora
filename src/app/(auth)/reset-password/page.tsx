import type { Metadata } from "next";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { FormMessage } from "@/components/shared/field";
import { ResetForm } from "../auth-forms";

export const metadata: Metadata = { title: "Atur ulang password" };

export default async function ResetPasswordPage() {
  const user = await getAuthUser();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Buat password baru</h1>
        <p className="text-sm text-muted-foreground">Gunakan password yang kuat dan belum pernah kamu pakai.</p>
      </div>
      {user ? (
        <ResetForm />
      ) : (
        <FormMessage>
          Tautan reset tidak valid atau sudah kedaluwarsa.{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Minta tautan baru
          </Link>
          .
        </FormMessage>
      )}
    </div>
  );
}
