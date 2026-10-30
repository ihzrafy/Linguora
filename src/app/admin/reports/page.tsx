import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ActivityBarChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { TYPE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Laporan" };

export default async function ReportsPage() {
  await requirePermission("reports.view", "/admin/reports");
  const supabase = await createClient();
  const [{ data: overview }, { data: hardest }, { data: attempts }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_question_stats", { p_limit: 25 }),
    supabase.from("assessment_attempts").select("kind, passed, score_percent").neq("status", "in_progress").in("kind", ["lesson_quiz", "unit_test", "level_exam", "placement"]).order("created_at", { ascending: false }).limit(5000),
  ]);
  const o = (overview ?? { daily: [] }) as { daily: { date: string; active: number; answers: number }[] };
  const kinds = ["lesson_quiz", "unit_test", "level_exam", "placement"].map((k) => {
    const rows = (attempts ?? []).filter((a) => a.kind === k);
    const passed = rows.filter((a) => a.passed).length;
    const avg = rows.length ? Math.round(rows.reduce((s, a) => s + Number(a.score_percent ?? 0), 0) / rows.length) : 0;
    return { kind: k, total: rows.length, passed, avg };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Laporan"
        title="Laporan platform"
        description="Data agregat — tidak menampilkan data pribadi pelajar."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/admin/reports/export?type=daily">
                <Download /> Aktivitas harian (CSV)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/admin/reports/export?type=questions">
                <Download /> Statistik soal (CSV)
              </a>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jawaban per hari (14 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={o.daily.map((d) => ({ label: d.date.slice(5), value: d.answers }))} label="Jawaban" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment (5.000 terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Attempt</TableHead>
                  <TableHead className="text-right">Lulus</TableHead>
                  <TableHead className="text-right">Rata-rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kinds.map((k) => (
                  <TableRow key={k.kind}>
                    <TableCell>{k.kind}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.kind === "placement" ? "–" : k.total ? `${Math.round((k.passed / k.total) * 100)}%` : "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.total ? `${k.avg}%` : "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Soal tersulit</CardTitle>
          <CardDescription>Akurasi terendah (minimal 5 jawaban). Akurasi sangat rendah bisa menandakan kunci jawaban atau penjelasan yang perlu ditinjau.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hardest?.length ? (
            <p className="text-sm text-muted-foreground">Belum cukup data jawaban.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Soal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Jawaban</TableHead>
                  <TableHead className="text-right">Akurasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hardest.map((h) => (
                  <TableRow key={h.question_id}>
                    <TableCell className="max-w-96 truncate">
                      <Link href={`/admin/questions/${h.question_id}/edit`} className="hover:underline">
                        {h.prompt}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{TYPE_LABEL[h.type]}</TableCell>
                    <TableCell>{h.level_code}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(h.answers)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(h.accuracy)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
