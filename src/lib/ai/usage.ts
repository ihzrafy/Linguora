import "server-only";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Daily message quota: the lower of the env limit and the admin setting. */
export async function tutorQuota(userId: string) {
  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const [{ count }, { data: setting }] = await Promise.all([
    db.from("ai_tutor_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", since),
    db.from("system_settings").select("value").eq("key", "ai_tutor_daily_limit").maybeSingle(),
  ]);
  const adminLimit = Number(setting?.value);
  const limit = Math.min(serverEnv().AI_TUTOR_DAILY_MESSAGE_LIMIT, Number.isFinite(adminLimit) && adminLimit > 0 ? adminLimit : Infinity);
  const used = count ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
