import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicHero } from "../_components";

export const metadata: Metadata = { title: "Harga", description: "Paket Linguora. Seluruh fitur inti saat ini dapat digunakan gratis." };

const FREE = [
  "Learning path A1–C2 (300 lesson)",
  "Placement test, mini quiz, unit assessment, ujian level",
  "Latihan adaptif, review queue, daily challenge",
  "Vocabulary, flashcards, grammar reference",
  "Reading, listening, speaking, dan writing lab",
  "Achievement, streak, leaderboard opt-in",
  "Sertifikat internal per level",
];

export default function PricingPage() {
  return (
    <>
      <PublicHero eyebrow="Harga" title="Gratis untuk semua fitur inti" description="Kami belum membuka paket berbayar. Jika kelak tersedia, harga dan isinya akan diumumkan dengan jelas sebelum berlaku." />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-primary bg-card p-8">
          <Badge>Tersedia sekarang</Badge>
          <p className="mt-4 text-2xl font-bold">Free</p>
          <p className="mt-1 text-4xl font-extrabold">Rp0</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link href="/register">Daftar gratis</Link>
          </Button>
        </div>
        <div className="rounded-3xl border border-dashed bg-muted/30 p-8">
          <Badge variant="outline">Belum tersedia</Badge>
          <p className="mt-4 text-2xl font-bold">Pro</p>
          <p className="mt-1 text-sm text-muted-foreground">Paket lanjutan sedang direncanakan, misalnya penilaian writing/speaking oleh reviewer dalam jumlah lebih besar dan kuota AI tutor tambahan. Harga belum ditetapkan.</p>
          <p className="mt-6 text-sm text-muted-foreground">Tidak ada pembayaran yang diproses di Linguora saat ini.</p>
        </div>
      </div>
    </>
  );
}
