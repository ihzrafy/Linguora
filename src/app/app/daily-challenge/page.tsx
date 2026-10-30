import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Flame, Gift } from "lucide-react";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { challengeProgress } from "@/lib/learning/challenges";
import { localDate } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";
import { ClaimButton } from "./claim-button";

export const metadata: Metadata = { title: "Daily Challenge" };

export default async function DailyChallengePage() {
  const viewer = await requireViewer("/app/daily-challenge");
  const today = localDate(viewer.profile.timezone);
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("id, status, score_percent")
    .eq("user_id", viewer.id)
    .eq("kind", "daily_challenge")
    .contains("metadata", { date: today })
    .maybeSingle();
  const challenges = await challengeProgress(viewer);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={today} title="Daily Challenge & Quests" description="10 soal pilihan untuk hari ini dari level kamu, ditambah quest harian dan tantangan mingguan." />
      <Card className="overflow-hidden border-primary/30">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-orange-500/15 p-3 text-orange-500">
              <Flame className="size-7" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-semibold">Tantangan hari ini</p>
              <p className="text-sm text-muted-foreground">Selesaikan semua 10 soal untuk bonus +20 XP (sekali per hari).</p>
            </div>
          </div>
          {attempt?.status === "graded" ? (
            <div className="flex items-center gap-3">
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 className="size-3" /> Selesai · {Number(attempt.score_percent)}%
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/results/${attempt.id}`}>Lihat hasil</Link>
              </Button>
            </div>
          ) : (
            <StartAttemptButton target={{ kind: "practice", mode: "daily" }} hrefFor="/app/practice" size="lg">
              {attempt ? "Lanjutkan" : "Mulai tantangan"}
            </StartAttemptButton>
          )}
        </CardContent>
      </Card>

      {(["daily", "weekly"] as const).map((period) => (
        <section key={period} className="space-y-3">
          <h2 className="text-lg font-semibold">{period === "daily" ? "Quest harian" : "Tantangan mingguan"}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {challenges
              .filter((c) => c.period === period)
              .map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      {c.title}
                      <Badge variant="secondary">
                        <Gift className="size-3" /> {c.xp_reward} XP
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {Math.min(c.value, c.target)}/{c.target}
                      </span>
                      <span>{Math.round(c.pct)}%</span>
                    </div>
                    <Progress value={c.pct} aria-label={`${c.title} ${Math.round(c.pct)}%`} />
                    <ClaimButton challengeId={c.id} claimed={c.claimed} ready={c.value >= c.target} />
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
