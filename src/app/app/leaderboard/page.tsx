import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Trophy } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };
const PAGE_SIZE = 25;
const PERIODS = [
  { key: "weekly", label: "Minggu ini" },
  { key: "monthly", label: "Bulan ini" },
  { key: "all_time", label: "Sepanjang waktu" },
];

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/leaderboard");
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "weekly";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const [{ data: rows }, { data: me }] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_period: period, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
    supabase.rpc("get_my_leaderboard_rank", { p_period: period }),
  ]);
  const total = Number(rows?.[0]?.total_count ?? 0);
  const mine = me?.[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Gamifikasi" title="Leaderboard" description="Peringkat berdasarkan XP. Hanya pengguna yang memilih tampil (opt-in) yang muncul, dan yang ditampilkan hanya nama tampilan, username, serta XP." />
      {!viewer.profile.leaderboard_opt_in && (
        <Alert icon={EyeOff} title="Kamu belum tampil di leaderboard">
          Aktifkan di{" "}
          <Link href="/app/settings" className="text-primary underline">
            Pengaturan → Belajar & privasi
          </Link>{" "}
          jika ingin ikut bersaing.
        </Alert>
      )}
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 sm:w-fit" role="tablist">
        {PERIODS.map((p) => (
          <Link key={p.key} role="tab" aria-selected={period === p.key} href={`/app/leaderboard?period=${p.key}`} className={cn("flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium", period === p.key ? "bg-background shadow-xs" : "text-muted-foreground")}>
            {p.label}
          </Link>
        ))}
      </div>
      {mine && (
        <Card className="border-primary/40">
          <CardContent className="flex items-center justify-between">
            <span className="font-medium">Peringkatmu</span>
            <span className="text-lg font-bold tabular-nums">
              #{Number(mine.rank)} · {Number(mine.xp).toLocaleString("id-ID")} XP
            </span>
          </CardContent>
        </Card>
      )}
      {!rows?.length ? (
        <EmptyState icon={Trophy} title="Belum ada peringkat untuk periode ini" description="Kumpulkan XP dengan menyelesaikan lesson dan latihan." />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.rank}-${r.username}`} className={cn(r.is_me && "bg-primary/5 font-semibold")}>
                  <TableCell className="tabular-nums">{Number(r.rank) <= 3 ? ["🥇", "🥈", "🥉"][Number(r.rank) - 1] : Number(r.rank)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{r.display_name}</span> <span className="text-muted-foreground">@{r.username}</span>
                    {r.is_me && <span className="ml-2 text-xs text-primary">(kamu)</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.xp).toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={total} basePath="/app/leaderboard" params={{ period }} />
      <p className="text-xs text-muted-foreground">Leaderboard teman belum tersedia karena Linguora belum memiliki fitur pertemanan.</p>
    </div>
  );
}
