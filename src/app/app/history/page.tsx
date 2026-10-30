import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Riwayat" };
const PAGE = 20;
const KIND: Record<string, string> = {
  lesson_quiz: "Mini quiz",
  unit_test: "Unit assessment",
  level_exam: "Ujian level",
  placement: "Placement test",
  practice: "Latihan",
  review: "Review",
  daily_challenge: "Daily challenge",
};
const SOURCE: Record<string, string> = {
  lesson_complete: "Lesson selesai",
  lesson_mastered: "Lesson dikuasai",
  unit_test_pass: "Lulus unit",
  exam_pass: "Lulus ujian level",
  placement: "Placement test",
  practice: "Latihan",
  review: "Review",
  daily_goal: "Target harian",
  daily_challenge: "Daily challenge",
  challenge: "Tantangan",
  achievement: "Achievement",
  perfect_score: "Skor sempurna",
  quiz_pass: "Lulus quiz",
  admin_adjust: "Penyesuaian admin",
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const viewer = await requireViewer("/app/history");
  const supabase = await createClient();
  const [{ data: attempts, count }, { data: xp }] = await Promise.all([
    supabase
      .from("assessment_attempts")
      .select("id, kind, status, score_percent, passed, created_at, submitted_at, question_ids", { count: "exact" })
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from("xp_transactions").select("id, amount, source, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progres" title="Riwayat Belajar" description="Semua quiz, ujian, latihan, dan XP yang kamu peroleh." />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivitas assessment & latihan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!attempts?.length ? (
              <EmptyState title="Belum ada aktivitas" className="py-8" />
            ) : (
              <ul className="divide-y">
                {attempts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{KIND[a.kind]}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.submitted_at ?? a.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {a.question_ids.length} soal
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.status === "in_progress" ? (
                        <Badge variant="outline">Berjalan</Badge>
                      ) : (
                        <>
                          <span className="font-semibold tabular-nums">{a.score_percent !== null ? `${Number(a.score_percent)}%` : "–"}</span>
                          {a.passed === true && <Badge className="bg-success text-success-foreground">Lulus</Badge>}
                          {a.passed === false && <Badge variant="destructive">Belum lulus</Badge>}
                        </>
                      )}
                      <Link href={`/app/results/${a.id}`} className="text-primary hover:underline">
                        Detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} pageSize={PAGE} total={count ?? 0} basePath="/app/history" params={{}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {(xp ?? []).map((x) => (
                <li key={x.id} className="flex justify-between py-2">
                  <span>
                    {SOURCE[x.source] ?? x.source}
                    <span className="block text-xs text-muted-foreground">{new Date(x.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                  </span>
                  <span className="font-semibold text-brand-blue tabular-nums">+{x.amount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
