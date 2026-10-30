import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Layers, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { PublicHero } from "../_components";

export const metadata: Metadata = { title: "Placement Test", description: "Tes penempatan Linguora untuk mengestimasi level bahasa Inggris kamu dari A1 hingga C2." };

const POINTS = [
  { icon: Layers, t: "48 soal bertingkat", d: "Delapan soal per level dari A1 hingga C2: grammar, vocabulary, reading, listening, dan penggunaan bahasa dalam konteks." },
  { icon: Timer, t: "Timer opsional", d: "Pilih mode tanpa batas waktu atau mode berwaktu 40 menit." },
  { icon: ShieldCheck, t: "Tersimpan otomatis", d: "Setiap jawaban disimpan. Jika koneksi terputus, kamu bisa melanjutkan dari soal terakhir." },
  { icon: Compass, t: "Rekomendasi jelas", d: "Estimasi level, kekuatan & kelemahan per kategori, serta rekomendasi learning track." },
];

export default async function PublicPlacementPage() {
  const user = await getAuthUser();
  return (
    <>
      <PublicHero eyebrow="Placement test" title="Temukan level awal yang tepat" description="Placement test membantu kamu mulai dari level yang sesuai — tidak terlalu mudah, tidak terlalu sulit." />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl border bg-card p-5">
              <Icon className="size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-muted/40 p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Cara menghitung rekomendasi</p>
          <p className="mt-1">
            Level yang direkomendasikan adalah level pertama (dari A1) yang soal-soalnya kamu jawab dengan akurasi di bawah 70%. Hasilnya adalah estimasi berdasarkan jawabanmu, bukan pengukuran sempurna dan bukan sertifikasi resmi. Level rekomendasi dan semua level di bawahnya akan terbuka untukmu.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">Placement test memerlukan akun agar jawaban dapat disimpan dan hasilnya dipakai untuk membuka level.</p>
          <Button asChild size="lg">
            <Link href={user ? "/app/placement-test" : "/register"}>
              {user ? "Mulai placement test" : "Daftar & mulai placement test"} <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
