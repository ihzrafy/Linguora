import type { Metadata } from "next";
import { Award, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AchievementReveal } from "./reveal";

export const metadata: Metadata = { title: "Achievements" };

const CATEGORY: Record<string, string> = { learning: "Belajar", milestone: "Milestone", accuracy: "Akurasi", habit: "Kebiasaan", xp: "XP", vocabulary: "Kosakata", skills: "Keterampilan" };

export default async function AchievementsPage() {
  const viewer = await requireViewer("/app/achievements");
  const supabase = await createClient();
  const [{ data: achievements }, { data: mine }, { data: certs }] = await Promise.all([
    supabase.from("achievements").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at, seen_at").eq("user_id", viewer.id),
    supabase.from("certificates").select("verification_code, score_percent, issued_at, levels(code, name)").eq("user_id", viewer.id).order("issued_at"),
  ]);
  // Progress values are computed by the same SQL function that awards achievements.
  const admin = createAdminClient();
  const metrics = [...new Set((achievements ?? []).map((a) => (a.criteria as { metric: string }).metric))];
  const values = Object.fromEntries(
    await Promise.all(metrics.map(async (m) => [m, Number((await admin.rpc("achievement_metric", { p_user: viewer.id, p_metric: m })).data ?? 0)] as const)),
  );
  const unlocked = new Map((mine ?? []).map((m) => [m.achievement_id, m]));
  const fresh = (mine ?? []).filter((m) => !m.seen_at).map((m) => m.achievement_id);
  if (fresh.length) await supabase.from("user_achievements").update({ seen_at: new Date().toISOString() }).eq("user_id", viewer.id).in("achievement_id", fresh);
  const groups = [...new Set((achievements ?? []).map((a) => a.category))];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Gamifikasi" title="Achievements" description={`${unlocked.size} dari ${achievements?.length ?? 0} achievement terbuka.`} />
      {certs && certs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sertifikat level (internal)</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {certs.map((c) => (
              <Card key={c.verification_code} className="border-success/40 bg-gradient-to-br from-success/5 to-transparent">
                <CardContent className="space-y-1">
                  <Award className="size-6 text-success" />
                  <p className="text-lg font-bold">
                    Level {(c.levels as { code: string; name: string }).code} — {(c.levels as { code: string; name: string }).name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Skor {Number(c.score_percent)}% · {new Date(c.issued_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                  <p className="font-mono text-xs">Kode: {c.verification_code}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Sertifikat internal Linguora sebagai tanda penyelesaian kurikulum — bukan sertifikasi CEFR resmi.</p>
        </section>
      )}
      <AchievementReveal ids={fresh}>
        {groups.map((g) => (
          <section key={g} className="space-y-3">
            <h2 className="text-lg font-semibold">{CATEGORY[g] ?? g}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(achievements ?? [])
                .filter((a) => a.category === g)
                .map((a) => {
                  const u = unlocked.get(a.id);
                  const c = a.criteria as { metric: string; threshold: number };
                  const value = values[c.metric] ?? 0;
                  return (
                    <Card key={a.id} data-achievement={a.id} className={cn(u ? "border-primary/40" : "opacity-80")}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-2 text-base">
                          <span className="flex items-center gap-2">
                            {u ? <Award className="size-5 text-primary" /> : <Lock className="size-4 text-muted-foreground" />} {a.name}
                          </span>
                          {a.xp_reward > 0 && <Badge variant="secondary">+{a.xp_reward} XP</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{a.description}</p>
                        {u ? (
                          <p className="text-xs text-success">Terbuka {new Date(u.unlocked_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                        ) : (
                          <>
                            <Progress value={Math.min(100, (value / c.threshold) * 100)} aria-label={`${a.name}: ${Math.min(value, c.threshold)} dari ${c.threshold}`} />
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {Math.min(value, c.threshold)}/{c.threshold}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))}
      </AchievementReveal>
    </div>
  );
}
