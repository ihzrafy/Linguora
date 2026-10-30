"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export async function snapshotAction(period: "weekly" | "monthly" | "all_time") {
  return runAction(async () => {
    await assertPermission("reports.view");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("snapshot_leaderboard", { p_period: z.enum(["weekly", "monthly", "all_time"]).parse(period) });
    if (error) throw new ActionError(error.message);
    await supabase.rpc("log_audit", { p_action: "snapshot", p_entity_type: "leaderboard_snapshots", p_entity_id: period, p_metadata: { rows: data } });
    revalidatePath("/admin/leaderboard");
    return data as number;
  });
}
