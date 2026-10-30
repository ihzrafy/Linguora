import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Paket & Tagihan" };

export default async function BillingPage() {
  await requireViewer("/app/billing");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Akun" title="Paket & Tagihan" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Paket saat ini <Badge>Free</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Kamu menggunakan paket Free yang mencakup seluruh fitur inti Linguora.</p>
          <p className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3">
            <CreditCard className="mt-0.5 size-4 shrink-0" /> Belum ada penyedia pembayaran yang terhubung, sehingga tidak ada tagihan, metode pembayaran, atau riwayat transaksi. Halaman ini akan menampilkan informasi tagihan setelah paket berbayar tersedia.
          </p>
          <Button asChild variant="outline">
            <Link href="/pricing">Lihat paket</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
