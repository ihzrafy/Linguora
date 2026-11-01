import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, BellRing, BookOpenCheck, Brain, CheckCircle2, Flame, PlayCircle, Repeat, Target, Trophy, Zap } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { ActivityBarChart, SkillRadar } from "@/components/charts/charts";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { getDashboardData } from "@/lib/learning/dashboard";
import { weakTopics } from "@/lib/learning/practice";
import { addDays } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const SKILL_LABEL: Record<string, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  conversation: "Conversation",
  writing: "Writing",
  speaking: "Speaking",
  pronunciation: "Pronunciation",
  academic: "Academic",
  business: "Business",
  mixed: "Mixed",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ passwordUpdated?: string }> }) {
  const viewer = await requireViewer("/app/dashboard");
  if (!viewer.profile.onboarding_completed_at) redirect("/app/onboarding");
  const { passwordUpdated } = await searchParams;
  const supabase = await createClient();
  const [d, weak, { data: plan }] = await Promise.all([
    getDashboardData(viewer),
    weakTopics(viewer, 4),
    supabase.from("study_plans").select("reminders_enabled, reminder_time").eq("user_id", viewer.id).maybeSingle(),
  ]);
  // In-app study reminder (study planner): shown once the chosen time has passed and nothing was studied today.
  const nowHm = new Intl.DateTimeFormat("en-GB", { timeZone: viewer.profile.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const reminderDue = Boolean(plan?.reminders_enabled && plan.reminder_time && nowHm >= plan.reminder_time.slice(0, 5) && d.todayXp === 0);
  const goal = viewer.profile.daily_goal_xp;
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(d.today, i - 13)).map((date) => ({
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }),
    value: d.days.find((x) => x.date === date)?.xp ?? 0,
  }));
  const radar = d.categories.filter((c) => c.answers >= 3).map((c) => ({ skill: SKILL_LABEL[c.category] ?? c.category, accuracy: c.accuracy }));
  const continueTarget = d.continueLesson ?? d.nextAvailable;
  const levelPct = d.levelProgress && d.levelProgress.total ? Math.round((d.levelProgress.completed / d.levelProgress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={d.currentLevel ? `Level ${d.currentLevel.code} · ${d.currentLevel.name}` : "Dashboard"}
        title={`Halo, ${viewer.profile.display_name.split(" ")[0]} 👋`}
        description={d.goalMet ? "Target harianmu sudah tercapai. Kerja bagus!" : "Lanjutkan belajar untuk mencapai target harianmu."}
      />
      {reminderDue && (
        <Alert tone="info" icon={BellRing} title="Waktunya belajar!">
          Kamu belum belajar hari ini. Luangkan beberapa menit untuk menjaga streak —{" "}
          <Link href={continueTarget ? `/app/lesson/${continueTarget.slug}` : "/app/learn"} className="font-medium text-primary underline">
            lanjutkan dari sini
          </Link>
          .
        </Alert>
      )}
      {passwordUpdated && <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm">Password berhasil diperbarui.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Lanjutkan belajar</p>
              {continueTarget ? (
                <>
                  <p className="text-xl font-semibold">{continueTarget.title}</p>
                  {d.currentLevel && d.levelProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Learning path {d.currentLevel.code}: {d.levelProgress.completed}/{d.levelProgress.total} lesson
                        </span>
                        <span>{levelPct}%</span>
                      </div>
                      <Progress value={levelPct} aria-label="Progres learning path" />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Mulai perjalananmu dari learning path.</p>
              )}
            </div>
            <Button asChild size="lg">
              <Link href={continueTarget ? `/app/lesson/${continueTarget.slug}` : "/app/learn"}>
                <PlayCircle /> {continueTarget ? "Lanjutkan" : "Buka learning path"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <Target className="size-4 text-primary" /> Target harian
              </p>
              {d.goalMet && <Badge className="bg-success text-success-foreground">Tercapai</Badge>}
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {d.todayXp}
              <span className="text-base font-normal text-muted-foreground"> / {goal} XP</span>
            </p>
            <Progress value={Math.min(100, (d.todayXp / goal) * 100)} aria-label="Progres target harian" />
            <p className="text-xs text-muted-foreground">Minggu ini: {d.weekXp} XP · {d.weekMinutes} menit tercatat</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Flame} label="Streak harian" value={`${d.stats.streak} hari`} hint={`Terpanjang ${d.stats.longestStreak} · ${d.stats.weeklyStreak} minggu beruntun`} />
        <Stat icon={Zap} label="Total XP" value={d.stats.totalXp.toLocaleString("id-ID")} />
        <Stat icon={BookOpenCheck} label="Lesson selesai" value={String(d.stats.lessonsCompleted)} />
        <Stat
          icon={CheckCircle2}
          label="Akurasi"
          value={d.stats.accuracy === null ? "–" : `${d.stats.accuracy}%`}
          hint={`${d.stats.answers} jawaban · ${d.stats.uniqueQuestions} soal unik`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">XP 14 hari terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={last14} label="XP" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Repeat className="size-4" /> Review
              </span>
              <Badge variant={d.dueReviews ? "default" : "secondary"}>{d.dueReviews} jatuh tempo</Badge>
            </CardTitle>
            <CardDescription>Spaced repetition untuk soal yang salah, lesson, dan kosakata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold">{d.grammarMastery === null ? "–" : `${d.grammarMastery}%`}</p>
                <p className="text-xs text-muted-foreground">Akurasi grammar</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold">{d.vocabularyMastery === null ? "–" : `${d.vocabularyMastery}%`}</p>
                <p className="text-xs text-muted-foreground">Kosakata dikuasai ({d.vocabularyTracked})</p>
              </div>
            </div>
            <Button asChild className="w-full" variant={d.dueReviews ? "default" : "outline"}>
              <Link href="/app/review">Buka review queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa keterampilan</CardTitle>
            <CardDescription>Akurasi per kategori (min. 3 jawaban).</CardDescription>
          </CardHeader>
          <CardContent>
            {radar.length >= 3 ? (
              <SkillRadar data={radar} />
            ) : (
              <div className="space-y-2">
                {d.categories.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data. Jawab beberapa soal untuk melihat performamu.</p>}
                {d.categories.map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{SKILL_LABEL[c.category]}</span>
                      <span className="text-muted-foreground">{c.accuracy}%</span>
                    </div>
                    <Progress value={c.accuracy} aria-label={`${c.category} ${c.accuracy}%`} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="size-4" /> Analisis kelemahan
            </CardTitle>
            <CardDescription>Topik dengan akurasi terendah.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum cukup data untuk analisis.</p>
            ) : (
              weak.map((w) => (
                <div key={w.topic} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{w.topic}</span>
                  <Badge variant={w.accuracy < 0.5 ? "destructive" : "secondary"}>{Math.round(w.accuracy * 100)}%</Badge>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/app/practice">
                Latihan adaptif <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" /> Achievement terdekat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.achievementProgress.map((a) => (
              <div key={a.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {Math.min(a.value, a.threshold)}/{a.threshold}
                  </span>
                </div>
                <Progress value={a.pct} aria-label={`${a.name} ${a.pct}%`} />
              </div>
            ))}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/app/achievements">
                <Award /> Semua achievement
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat assessment terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {d.recentAttempts.length === 0 ? (
            <EmptyState title="Belum ada assessment" description="Selesaikan lesson pertama dan kerjakan mini quiz-nya." className="py-8" />
          ) : (
            <ul className="divide-y">
              {d.recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="capitalize">{a.kind.replace("_", " ")}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{a.score_percent !== null ? `${Number(a.score_percent)}%` : "–"}</span>
                    <Link href={`/app/results/${a.id}`} className="text-primary hover:underline">
                      Detail
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Flame; label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" aria-hidden /> {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
