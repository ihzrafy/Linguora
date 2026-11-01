import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { HandledButton } from "./handled-button";

export const metadata: Metadata = { title: "Admin · Pesan Masuk" };

/** Messages sent through the public contact form. */
export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requirePermission("reports.view", "/admin/messages");
  const { view } = await searchParams;
  const showAll = view === "all";
  const supabase = await createClient();
  let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  if (!showAll) query = query.is("handled_at", null);
  const [{ data: messages }, { count: open }] = await Promise.all([
    query,
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).is("handled_at", null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ringkasan" title="Pesan Masuk" description={`Pesan dari formulir kontak. ${open ?? 0} belum ditangani — balas lewat email pengirim.`} />
      <div className="flex gap-2 text-sm">
        <Link href="/admin/messages" className={cn("rounded-full border px-3 py-1", !showAll && "border-primary bg-primary text-primary-foreground")}>
          Belum ditangani
        </Link>
        <Link href="/admin/messages?view=all" className={cn("rounded-full border px-3 py-1", showAll && "border-primary bg-primary text-primary-foreground")}>
          Semua
        </Link>
      </div>
      {!messages?.length ? (
        <EmptyState title={showAll ? "Belum ada pesan" : "Semua pesan sudah ditangani"} />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.name} · {m.email} · {new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.handled_at && <Badge variant="secondary">Ditangani</Badge>}
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Mail className="size-4" /> Balas
                    </a>
                    <HandledButton id={m.id} handled={Boolean(m.handled_at)} />
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
