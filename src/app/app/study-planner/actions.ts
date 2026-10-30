"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const planSchema = z.object({
  schedule: z.object(Object.fromEntries(DAYS.map((d) => [d, z.number().int().min(0).max(480)])) as Record<(typeof DAYS)[number], z.ZodNumber>),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  remindersEnabled: z.boolean(),
  targetLevelId: z.uuid().nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function savePlanAction(input: z.input<typeof planSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = planSchema.parse(input);
    const supabase = await createClient();
    const weekly = Object.values(data.schedule).reduce((s, n) => s + n, 0);
    const { error } = await supabase.from("study_plans").upsert(
      {
        user_id: viewer.id,
        weekly_schedule: data.schedule,
        reminder_time: data.reminderTime,
        reminders_enabled: data.remindersEnabled,
        target_level_id: data.targetLevelId,
        target_date: data.targetDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new ActionError("Rencana gagal disimpan.");
    if (weekly >= 15) await supabase.from("profiles").update({ weekly_goal_minutes: weekly }).eq("id", viewer.id);
    revalidatePath("/app/study-planner");
    return undefined;
  });
}

const plannedSchema = z.object({ title: z.string().trim().min(1).max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), lessonId: z.uuid().nullable() });

export async function addPlannedAction(input: z.input<typeof plannedSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = plannedSchema.parse(input);
    const supabase = await createClient();
    const { error } = await supabase.from("planned_lessons").insert({ user_id: viewer.id, title: data.title, planned_date: data.date, lesson_id: data.lessonId });
    if (error) throw new ActionError("Rencana gagal ditambahkan.");
    revalidatePath("/app/study-planner");
    return undefined;
  });
}

export async function togglePlannedAction(id: string, done: boolean) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    await supabase.from("planned_lessons").update({ done }).eq("id", z.uuid().parse(id)).eq("user_id", viewer.id);
    revalidatePath("/app/study-planner");
    return undefined;
  });
}

export async function deletePlannedAction(id: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    await supabase.from("planned_lessons").delete().eq("id", z.uuid().parse(id)).eq("user_id", viewer.id);
    revalidatePath("/app/study-planner");
    return undefined;
  });
}

const sessionSchema = z.object({
  mode: z.enum(["free", "pomodoro"]),
  startedAt: z.iso.datetime(),
  durationSeconds: z.number().int().min(30).max(6 * 3600),
  notes: z.string().max(2000).optional(),
});

/** Saves a timed study session; its minutes count toward goals and challenges. */
export async function saveStudySessionAction(input: z.input<typeof sessionSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`session:${viewer.id}`, 30, 3600);
    const data = sessionSchema.parse(input);
    const started = new Date(data.startedAt);
    // The claimed duration cannot exceed the real time elapsed since the start (+1 min tolerance).
    const elapsed = Math.round((Date.now() - started.getTime()) / 1000) + 60;
    if (started.getTime() > Date.now() + 60_000 || data.durationSeconds > elapsed) throw new ActionError("Durasi sesi tidak valid.");
    const supabase = await createClient();
    const { error } = await supabase.from("study_sessions").insert({
      user_id: viewer.id,
      mode: data.mode,
      started_at: data.startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: data.durationSeconds,
      notes: data.notes || null,
    });
    if (error) throw new ActionError("Sesi gagal disimpan.");
    const minutes = Math.floor(data.durationSeconds / 60);
    if (minutes > 0) await createAdminClient().rpc("record_activity", { p_user: viewer.id, p_minutes: minutes });
    revalidatePath("/app/study-planner");
    return { minutes };
  });
}
