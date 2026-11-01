"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export async function setMessageHandledAction(id: string, handled: boolean) {
  return runAction(async () => {
    await assertPermission("reports.view");
    const supabase = await createClient();
    const messageId = z.uuid().parse(id);
    const { error } = await supabase.from("contact_messages").update({ handled_at: handled ? new Date().toISOString() : null }).eq("id", messageId);
    if (error) throw new ActionError("Status pesan gagal diperbarui.");
    await supabase.rpc("log_audit", { p_action: handled ? "handle" : "reopen", p_entity_type: "contact_messages", p_entity_id: messageId, p_metadata: {} });
    revalidatePath("/admin/messages");
    return undefined;
  });
}
