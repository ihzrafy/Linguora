"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string };

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), "hour");
  if (minutes < 60 * 24 * 7) return rtf.format(-Math.round(minutes / 1440), "day");
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Header bell: opens the latest notifications in a popover instead of navigating away. */
export function NotificationBell({ unread: initialUnread }: { unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  // Follow the server count when the layout re-renders (e.g. after router.refresh()).
  const [serverUnread, setServerUnread] = useState(initialUnread);
  if (serverUnread !== initialUnread) {
    setServerUnread(initialUnread);
    setUnread(initialUnread);
  }
  const [loading, startLoad] = useTransition();
  const [marking, startMark] = useTransition();

  const load = () =>
    startLoad(async () => {
      // RLS limits notifications to the signed-in user's own rows.
      const supabase = createClient();
      const [{ data }, { count }] = await Promise.all([
        supabase.from("notifications").select("id, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      ]);
      setItems(data ?? []);
      setUnread(count ?? 0);
    });

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((list) => list?.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)) ?? null);
    setUnread((u) => Math.max(0, u - ids.length));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids).is("read_at", null);
    router.refresh();
  };

  const openItem = (n: Item) => {
    void markRead(n.read_at ? [] : [n.id]);
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  const unreadIds = (items ?? []).filter((n) => !n.read_at).map((n) => n.id);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted data-[state=open]:bg-muted"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] leading-4 font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifikasi</p>
          {unread > 0 && <span className="text-xs text-muted-foreground">{unread} belum dibaca</span>}
        </div>

        <div className="max-h-[min(26rem,60dvh)] overflow-y-auto">
          {items === null || (loading && !items.length) ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat…
            </div>
          ) : !items.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Bell className="size-6 text-muted-foreground" aria-hidden />
              <p className="font-medium">Belum ada notifikasi</p>
              <p className="text-xs text-muted-foreground">Pencapaian, hasil penilaian, dan target harian akan muncul di sini.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60", !n.read_at && "bg-primary/5")}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                      <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="sr-only">(belum dibaca)</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
          <Button variant="ghost" size="sm" disabled={!unreadIds.length || marking} onClick={() => startMark(() => markRead(unreadIds))}>
            {marking ? <Loader2 className="animate-spin" /> : <CheckCheck />} Tandai semua dibaca
          </Button>
          <Link href="/app/notifications" onClick={() => setOpen(false)} className="px-2 text-xs text-muted-foreground hover:text-foreground">
            Lihat semua
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
