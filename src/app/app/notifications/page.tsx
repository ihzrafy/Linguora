import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MarkAllRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/app/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Akun" title="Notifikasi" description={unread ? `${unread} belum dibaca` : "Semua notifikasi sudah dibaca"} actions={unread > 0 && <MarkAllRead />} />
      {!data?.length ? (
        <EmptyState icon={Bell} title="Belum ada notifikasi" description="Pencapaian, hasil penilaian, dan target harian akan muncul di sini." />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data.map((n) => {
            const body = (
              <div className={cn("flex gap-3 p-4", !n.read_at && "bg-primary/5")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href} className="block hover:bg-muted/50">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
