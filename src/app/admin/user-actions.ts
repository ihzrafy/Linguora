"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const roleSchema = z.enum(["super_admin", "admin", "content_editor", "reviewer", "student"]);

/** Grants/revokes a role. RLS decides what the caller may change (no self-change, super_admin only by super admins). */
export async function setRoleAction(userId: string, role: string, grant: boolean) {
  return runAction(async () => {
    const viewer = await assertPermission("users.manage");
    const uid = z.uuid().parse(userId);
    const r = roleSchema.parse(role);
    if (uid === viewer.id) throw new ActionError("Kamu tidak dapat mengubah role akunmu sendiri.", "forbidden");
    const supabase = await createClient();
    const res = grant
      ? await supabase.from("user_roles").insert({ user_id: uid, role: r, granted_by: viewer.id })
      : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", r).select("user_id");
    if (res.error) {
      if (res.error.code === "23505") return undefined;
      throw new ActionError(res.error.code === "42501" ? "Kamu tidak memiliki izin untuk mengubah role ini." : res.error.message, "forbidden");
    }
    if (!grant && Array.isArray(res.data) && res.data.length === 0) throw new ActionError("Kamu tidak memiliki izin untuk mencabut role ini.", "forbidden");
    revalidatePath("/admin/users");
    return undefined;
  });
}

/** Manual XP correction (e.g. support cases). Logged in the audit trail with a reason. */
export async function adjustXpAction(userId: string, amount: number, reason: string) {
  return runAction(async () => {
    const viewer = await assertPermission("users.manage");
    const data = z.object({ uid: z.uuid(), amount: z.number().int().min(-1000).max(1000).refine((n) => n !== 0, "Jumlah tidak boleh 0."), reason: z.string().trim().min(5, "Alasan minimal 5 karakter.").max(300) }).parse({ uid: userId, amount, reason });
    const admin = createAdminClient();
    const { error } = await admin.rpc("award_xp", { p_user: data.uid, p_amount: data.amount, p_source: "admin_adjust", p_source_id: viewer.id, p_key: `admin_adjust:${Date.now()}:${viewer.id}` });
    if (error) throw new ActionError(error.message);
    const supabase = await createClient();
    await supabase.rpc("log_audit", { p_action: "xp_adjust", p_entity_type: "profiles", p_entity_id: data.uid, p_metadata: { amount: data.amount, reason: data.reason } });
    revalidatePath("/admin/users");
    return undefined;
  });
}

/** Grants level access manually (e.g. after an external assessment). */
export async function unlockLevelAction(userId: string, levelId: string) {
  return runAction(async () => {
    await assertPermission("users.manage");
    const admin = createAdminClient();
    const { error } = await admin.from("user_level_unlocks").upsert({ user_id: z.uuid().parse(userId), level_id: z.uuid().parse(levelId), source: "admin" }, { onConflict: "user_id,level_id", ignoreDuplicates: true });
    if (error) throw new ActionError(error.message);
    const supabase = await createClient();
    await supabase.rpc("log_audit", { p_action: "level_unlock", p_entity_type: "profiles", p_entity_id: userId, p_metadata: { level_id: levelId } });
    revalidatePath("/admin/users");
    return undefined;
  });
}
