"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

/** Typed validation per known setting; unknown keys must still be valid JSON. */
const VALIDATORS: Record<string, z.ZodType> = {
  lesson_quiz_pass_threshold: z.number().int().min(1).max(100),
  lesson_mastery_threshold: z.number().int().min(1).max(100),
  practice_daily_xp_cap: z.number().int().min(0).max(10000),
  ai_tutor_daily_limit: z.number().int().min(0).max(1000),
  registration_open: z.boolean(),
};

export async function updateSettingAction(key: string, raw: string) {
  return runAction(async () => {
    const viewer = await assertPermission("settings.manage");
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new ActionError("Nilai harus JSON yang valid (mis. 70, true, atau \"teks\").");
    }
    const validator = VALIDATORS[key];
    if (validator) value = validator.parse(value);
    const supabase = await createClient();
    const { error } = await supabase.from("system_settings").update({ value: value as never, updated_by: viewer.id }).eq("key", key);
    if (error) throw new ActionError(error.message);
    revalidatePath("/admin/system-settings");
    return undefined;
  });
}
