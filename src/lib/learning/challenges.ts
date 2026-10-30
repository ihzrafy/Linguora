import "server-only";
import { ActionError, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate, weekStart } from "./streak";

const METRIC_COLUMN = {
  xp: "xp_earned",
  questions: "questions_answered",
  correct_answers: "correct_answers",
  lessons: "lessons_completed",
  minutes: "minutes_studied",
  reviews: "reviews_done",
} as const;

/** Progress of active daily quests and weekly challenges, computed from daily_activity. */
export async function challengeProgress(viewer: Viewer) {
  const db = createAdminClient();
  const today = localDate(viewer.profile.timezone);
  const monday = weekStart(today);
  const [{ data: challenges }, { data: days }, { data: claims }] = await Promise.all([
    db.from("challenges").select("*").eq("is_active", true).order("period").order("xp_reward"),
    db.from("daily_activity").select("*").eq("user_id", viewer.id).gte("activity_date", monday),
    db.from("xp_transactions").select("idempotency_key").eq("user_id", viewer.id).eq("source", "challenge").gte("activity_date", monday),
  ]);
  const claimed = new Set((claims ?? []).map((c) => c.idempotency_key));
  return (challenges ?? []).map((c) => {
    const rows = (days ?? []).filter((d) => (c.period === "daily" ? d.activity_date === today : true));
    const column = METRIC_COLUMN[c.metric as keyof typeof METRIC_COLUMN];
    const value = rows.reduce((s, d) => s + Number((d as Record<string, unknown>)[column] ?? 0), 0);
    const periodStart = c.period === "daily" ? today : monday;
    const key = `challenge:${c.key}:${periodStart}`;
    return { ...c, value, pct: Math.min(100, (value / c.target) * 100), claimed: claimed.has(key), key };
  });
}

/** Grants a challenge reward once per period after re-checking progress on the server. */
export async function claimChallenge(viewer: Viewer, challengeId: string) {
  const all = await challengeProgress(viewer);
  const c = all.find((x) => x.id === challengeId);
  if (!c) throw new ActionError("Tantangan tidak ditemukan.", "not_found");
  if (c.claimed) throw new ActionError("Hadiah tantangan ini sudah diklaim.", "conflict");
  if (c.value < c.target) throw new ActionError("Target tantangan belum tercapai.", "locked");
  const { data, error } = await createAdminClient().rpc("award_xp", {
    p_user: viewer.id,
    p_amount: c.xp_reward,
    p_source: "challenge",
    p_source_id: c.key,
    p_key: c.key,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new ActionError("Hadiah tantangan ini sudah diklaim.", "conflict");
  return { xp: data };
}
