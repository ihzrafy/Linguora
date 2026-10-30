"use server";

import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  goal: z.enum(["daily", "travel", "academic", "business", "career", "exam"]),
  trackSlug: z.enum(["general-english", "academic-english", "business-english", "career-development"]),
  dailyGoalMinutes: z.number().int().min(5).max(240),
  dailyGoalXp: z.number().int().min(10).max(500),
  timezone: z.string().max(64),
  leaderboardOptIn: z.boolean(),
});

export async function completeOnboardingAction(input: z.input<typeof schema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = schema.parse(input);
    const supabase = await createClient();
    const { data: track } = await supabase.from("learning_tracks").select("id").eq("slug", data.trackSlug).maybeSingle();
    let timezone = data.timezone;
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      timezone = viewer.profile.timezone;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        learning_goal: data.goal,
        active_track_id: track?.id ?? null,
        daily_goal_minutes: data.dailyGoalMinutes,
        daily_goal_xp: data.dailyGoalXp,
        weekly_goal_minutes: data.dailyGoalMinutes * 7,
        timezone,
        leaderboard_opt_in: data.leaderboardOptIn,
      })
      .eq("id", viewer.id);
    if (error) throw new ActionError("Gagal menyimpan preferensi.");
    await createAdminClient().from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", viewer.id);
    await createAdminClient()
      .from("study_plans")
      .upsert(
        {
          user_id: viewer.id,
          weekly_schedule: Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, data.dailyGoalMinutes])),
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    return undefined;
  });
}
