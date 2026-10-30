import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { ActivityBarChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";
import { PlanForm, PlannedList, SessionTimer } from "./planner-client";

export const metadata: Metadata = { title: "Study Planner" };
const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default async function StudyPlannerPage() {
  const viewer = await requireViewer("/app/study-planner");
  const supabase = await createClient();
  const today = localDate(viewer.profile.timezone);
  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const [{ data: plan }, { data: levels }, { data: planned }, { data: activity }, { data: sessions }] = await Promise.all([
    supabase.from("study_plans").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("levels").select("id, code, sort_order").order("sort_order"),
    supabase.from("planned_lessons").select("id, title, planned_date, done").eq("user_id", viewer.id).gte("planned_date", monday).lte("planned_date", week[6]).order("created_at"),
    supabase.from("daily_activity").select("activity_date, minutes_studied, xp_earned, lessons_completed").eq("user_id", viewer.id).gte("activity_date", monday),
    supabase.from("study_sessions").select("id, mode, duration_seconds, notes, started_at").eq("user_id", viewer.id).order("started_at", { ascending: false }).limit(5),
  ]);
  const schedule = { mon: 15, tue: 15, wed: 15, thu: 15, fri: 15, sat: 15, sun: 15, ...((plan?.weekly_schedule ?? {}) as Record<string, number>) };
  const plannedMinutes = KEYS.reduce((s, k) => s + (schedule[k] ?? 0), 0);
  const studied = (activity ?? []).reduce((s, a) => s + a.minutes_studied, 0);

  // Realistic recommendation: lessons per week needed to finish the target level by the target date.
  let recommendation: string | null = null;
  if (plan?.target_level_id && plan.target_date) {
    const target = levels?.find((l) => l.id === plan.target_level_id);
    const { count: done } = await supabase
      .from("learning_progress")
      .select("lesson_id, lessons!inner(units!inner(courses!inner(level_id, is_core)))", { count: "exact", head: true })
      .eq("user_id", viewer.id)
      .neq("status", "in_progress")
      .eq("lessons.units.courses.is_core", true);
    const levelsToGo = (levels ?? []).filter((l) => target && l.sort_order <= target.sort_order).length;
    const remaining = Math.max(0, levelsToGo * 50 - (done ?? 0));
    const weeks = Math.max(1, Math.ceil((new Date(`${plan.target_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / (7 * 86_400_000)));
    const perWeek = Math.ceil(remaining / weeks);
    const minutesNeeded = perWeek * 20; // ≈ 15–20 minutes per lesson incl. quiz
    recommendation =
      remaining === 0
        ? "Semua lesson menuju target sudah selesai — fokus pada unit assessment dan ujian level."
        : `Untuk menyelesaikan ±${remaining} lesson menuju ${target?.code} dalam ${weeks} minggu, kamu perlu ±${perWeek} lesson/minggu (≈ ${minutesNeeded} menit). Rencanamu saat ini ${plannedMinutes} menit/minggu${minutesNeeded > plannedMinutes ? " — pertimbangkan menambah waktu atau memundurkan tanggal target agar realistis." : " — sudah cukup."}`;
  }

  const chart = week.map((d, i) => ({ label: LABELS[i], value: activity?.find((a) => a.activity_date === d)?.minutes_studied ?? 0 }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Produktivitas" title="Study Planner" description="Atur target waktu belajar, rencanakan lesson per hari, dan catat sesi belajar dengan timer." />
      {recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex gap-3 text-sm">
            <Lightbulb className="size-5 shrink-0 text-primary" /> {recommendation}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target mingguan</CardTitle>
            <CardDescription>Menit belajar per hari.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanForm
              initial={{
                schedule,
                reminderTime: plan?.reminder_time?.slice(0, 5) ?? null,
                remindersEnabled: plan?.reminders_enabled ?? false,
                targetLevelId: plan?.target_level_id ?? null,
                targetDate: plan?.target_date ?? null,
              }}
              levels={levels ?? []}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timer sesi belajar</CardTitle>
            <CardDescription>Menit fokus dicatat ke target harian & tantangan mingguan.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionTimer />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kalender minggu ini</CardTitle>
        </CardHeader>
        <CardContent>
          <PlannedList items={planned ?? []} days={week.map((d, i) => ({ date: d, label: `${LABELS[i]} ${d.slice(8)}${d === today ? " • hari ini" : ""}` }))} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laporan minggu ini</CardTitle>
            <CardDescription>
              {studied} dari {plannedMinutes} menit · {(activity ?? []).reduce((s, a) => s + a.xp_earned, 0)} XP · {(activity ?? []).reduce((s, a) => s + a.lessons_completed, 0)} lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={chart} label="Menit" height={180} />
            <p className="mt-2 text-xs text-muted-foreground">Menit dihitung dari sesi timer, waktu membaca, dan sesi speaking yang tercatat.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sesi terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {!sessions?.length ? (
              <p className="text-sm text-muted-foreground">Belum ada sesi tercatat.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sessions.map((s) => (
                  <li key={s.id} className="rounded-lg border p-2">
                    <p className="font-medium">
                      {Math.round(s.duration_seconds / 60)} menit · {s.mode === "pomodoro" ? "Pomodoro" : "Bebas"} · {new Date(s.started_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {s.notes && <p className="text-muted-foreground">{s.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
