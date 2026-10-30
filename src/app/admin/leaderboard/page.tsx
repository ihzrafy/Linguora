import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SnapshotButton } from "./snapshot-button";

export const metadata: Metadata = { title: "Admin · Leaderboard" };

export default async function AdminLeaderboardPage() {
  await requirePermission("reports.view", "/admin/leaderboard");
  const supabase = await createClient();
  const [{ data: weekly }, { data: snapshots }, { count: optedIn }] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_period: "weekly", p_limit: 20, p_offset: 0 }),
    supabase.from("leaderboard_snapshots").select("period, period_start, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("leaderboard_opt_in", true),
  ]);
  const groups = [...new Map((snapshots ?? []).map((s) => [`${s.period}:${s.period_start}`, s])).values()];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Gamifikasi" title="Leaderboard" description={`${optedIn ?? 0} pengguna memilih tampil di leaderboard. Snapshot menyimpan peringkat akhir suatu periode untuk arsip/hadiah.`} actions={<SnapshotButton />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 20 minggu ini</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(weekly ?? []).map((r) => (
                  <TableRow key={r.username}>
                    <TableCell>{Number(r.rank)}</TableCell>
                    <TableCell>@{r.username}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.xp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot tersimpan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {groups.map((g) => (
                <li key={`${g.period}-${g.period_start}`} className="flex justify-between py-2">
                  <span>
                    {g.period} · mulai {g.period_start}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString("id-ID")}</span>
                </li>
              ))}
              {!groups.length && <li className="py-2 text-muted-foreground">Belum ada snapshot.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
