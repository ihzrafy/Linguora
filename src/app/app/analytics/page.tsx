import type { Metadata } from "next";
import Link from "next/link";
import { AccuracyLineChart, ActivityBarChart, SkillRadar } from "@/components/charts/charts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth";
import { SKILL_LABEL, TYPE_LABEL } from "@/lib/labels";
import { addDays, localDate } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
const RANGES = [
  { key: "7", label: "7 hari", days: 7 },
  { key: "30", label: "30 hari", days: 30 },
  { key: "90", label: "90 hari", days: 90 },
  { key: "all", label: "Semua", days: null },
] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[1];
  const viewer = await requireViewer("/app/analytics");
  const supabase = await createClient();
  const days = range.days ?? undefined;
  const today = localDate(viewer.profile.timezone);
  const chartDays = Math.min(range.days ?? 90, 90);
  const since = addDays(today, -(chartDays - 1));
  const [{ data: summary }, { data: cats }, { data: topics }, { data: types }, { data: activity }] = await Promise.all([
    supabase.rpc("my_learning_summary", { p_days: days }),
    supabase.rpc("my_category_performance", { p_days: days }),
    supabase.rpc("my_topic_performance", { p_days: days, p_limit: 30 }),
    supabase.rpc("my_question_type_performance", { p_days: days }),
    supabase.from("daily_activity").select("activity_date, xp_earned, minutes_studied, questions_answered, correct_answers").eq("user_id", viewer.id).gte("activity_date", since).order("activity_date"),
  ]);
  const s = (summary ?? {}) as Record<string, number>;
  const accuracy = Number(s.answers) ? Math.round((Number(s.correct) / Number(s.answers)) * 100) : null;
  const series = Array.from({ length: chartDays }, (_, i) => addDays(since, i)).map((d) => {
    const row = activity?.find((a) => a.activity_date === d);
    return {
      label: d.slice(5).replace("-", "/"),
      xp: row?.xp_earned ?? 0,
      minutes: row?.minutes_studied ?? 0,
      accuracy: row && row.questions_answered ? Math.round((row.correct_answers / row.questions_answered) * 100) : null,
    };
  });
  const radar = (cats ?? []).filter((c) => Number(c.answers) >= 3).map((c) => ({ skill: SKILL_LABEL[c.category] ?? c.category, accuracy: Math.round((Number(c.correct) / Number(c.answers)) * 100) }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progres" title="Analytics" description="Semua angka dihitung dari data belajarmu. “Jawaban” menghitung setiap pengiriman; “soal unik” menghitung soal berbeda yang pernah kamu jawab." />
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Rentang waktu">
        {RANGES.map((r) => (
          <Link key={r.key} role="tab" aria-selected={range.key === r.key} href={`/app/analytics?range=${r.key}`} className={cn("flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium", range.key === r.key ? "bg-background shadow-xs" : "text-muted-foreground")}>
            {r.label}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["XP", s.xp],
          ["Menit belajar", s.minutes],
          ["Lesson selesai", s.lessons_completed],
          ["Lesson dikuasai", s.lessons_mastered],
          ["Assessment lulus", s.assessments_passed],
          ["Jawaban", s.answers],
          ["Soal unik", s.unique_questions],
          ["Akurasi", accuracy === null ? "–" : `${accuracy}%`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card p-3">
            <p className="text-xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString("id-ID") : (value ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{label as string}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP harian</CardTitle>
            {range.days === null && <CardDescription>Grafik menampilkan 90 hari terakhir.</CardDescription>}
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={series.map((x) => ({ label: x.label, value: x.xp }))} label="XP" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akurasi harian</CardTitle>
          </CardHeader>
          <CardContent>
            <AccuracyLineChart data={series.map((x) => ({ label: x.label, accuracy: x.accuracy }))} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa per keterampilan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {radar.length >= 3 && <SkillRadar data={radar} />}
            {(cats ?? []).map((c) => {
              const pct = Number(c.answers) ? Math.round((Number(c.correct) / Number(c.answers)) * 100) : 0;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{SKILL_LABEL[c.category]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {pct}% · {Number(c.answers)} jawaban · {Number(c.unique_questions)} soal unik
                    </span>
                  </div>
                  <Progress value={pct} aria-label={`${c.category} ${pct}%`} />
                </div>
              );
            })}
            {!cats?.length && <p className="text-sm text-muted-foreground">Belum ada data di rentang ini.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jenis soal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jawaban</TableHead>
                  <TableHead className="text-right">Akurasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(types ?? []).map((t) => (
                  <TableRow key={t.type}>
                    <TableCell>{TYPE_LABEL[t.type] ?? t.type}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(t.answers)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round((Number(t.correct) / Number(t.answers)) * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topik</CardTitle>
          <CardDescription>Diurutkan dari akurasi terendah — kandidat utama untuk latihan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {[...(topics ?? [])]
              .sort((a, b) => Number(a.correct) / Number(a.answers) - Number(b.correct) / Number(b.answers))
              .map((t) => {
                const pct = Math.round((Number(t.correct) / Number(t.answers)) * 100);
                return (
                  <div key={t.topic} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                    <span className="truncate">{t.topic}</span>
                    <span className={cn("shrink-0 tabular-nums", pct < 50 ? "text-destructive" : pct < 75 ? "" : "text-success")}>
                      {pct}% ({Number(t.answers)})
                    </span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
