import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, BookOpen, FileQuestion, PenLine, Users } from "lucide-react";
import { ActivityBarChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Overview" };

type Overview = {
  users: number;
  new_users_7d: number;
  active_7d: number;
  active_today: number;
  answers_7d: number;
  accuracy_7d: number | null;
  attempts_7d: number;
  lessons_completed_7d: number;
  pending_writing: number;
  pending_manual: number;
  content: { lessons_published: number; lessons_draft: number; questions_published: number; questions_review: number; vocabulary: number };
  daily: { date: string; active: number; answers: number }[];
};

export default async function AdminHome() {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const canReports = viewer.permissions.has("reports.view");
  const { data } = canReports ? await supabase.rpc("admin_overview") : { data: null };
  const o = data as Overview | null;
  const [{ count: lessonsReview }, { count: questionsReview }] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "in_review"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin CMS" title={`Halo, ${viewer.profile.display_name}`} description="Ringkasan platform, antrean review, dan aktivitas pelajar." />
      {(Boolean(lessonsReview) || Boolean(questionsReview) || Boolean(o?.pending_writing)) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-4" /> Antrean: {lessonsReview ?? 0} lesson & {questionsReview ?? 0} soal menunggu review
              {o ? `, ${o.pending_writing} tulisan menunggu penilaian` : ""}.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/content-review">Buka review konten</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {o && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [Users, "Pengguna", o.users, `+${o.new_users_7d} dalam 7 hari`],
            [Users, "Aktif 7 hari", o.active_7d, `${o.active_today} hari ini`],
            [FileQuestion, "Jawaban 7 hari", o.answers_7d, `akurasi ${o.accuracy_7d ?? "–"}%`],
            [BookOpen, "Lesson selesai 7 hari", o.lessons_completed_7d, `${o.attempts_7d} assessment`],
          ].map(([Icon, label, value, hint]) => {
            const I = Icon as typeof Users;
            return (
              <Card key={label as string} className="py-4">
                <CardContent className="space-y-1">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <I className="size-3.5" /> {label as string}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">{Number(value).toLocaleString("id-ID")}</p>
                  <p className="text-xs text-muted-foreground">{hint as string}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {o && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengguna aktif 14 hari</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityBarChart data={o.daily.map((d) => ({ label: d.date.slice(5), value: d.active }))} label="Pengguna aktif" />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konten</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {o ? (
              <>
                <Stat label="Lesson published" value={o.content.lessons_published} />
                <Stat label="Lesson draft/review" value={o.content.lessons_draft} />
                <Stat label="Soal published" value={o.content.questions_published} />
                <Stat label="Soal in review" value={o.content.questions_review} />
                <Stat label="Kosakata" value={o.content.vocabulary} />
                <Stat label="Penilaian manual tertunda" value={o.pending_manual} />
              </>
            ) : (
              <p className="col-span-2 text-muted-foreground">Statistik platform hanya tersedia untuk peran dengan izin laporan.</p>
            )}
            <div className="col-span-2 flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm">
                <Link href="/admin/questions/create">
                  <FileQuestion /> Soal baru
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/lessons/new">
                  <BookOpen /> Lesson baru
                </Link>
              </Button>
              {viewer.permissions.has("grading.manage") && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/writing-rubrics?view=grading">
                    <PenLine /> Nilai tulisan
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xl font-bold tabular-nums">{Number(value).toLocaleString("id-ID")}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
