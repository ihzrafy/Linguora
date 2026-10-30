"use server";

import { clientIp, rateLimit, runAction } from "@/lib/actions";
import { ActionError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema } from "@/lib/validation";

export async function contactAction(input: unknown) {
  return runAction(async () => {
    const data = contactSchema.parse(input);
    await rateLimit(`contact:${await clientIp()}`, 3, 3600);
    const { error } = await createAdminClient().from("contact_messages").insert(data);
    if (error) throw new ActionError("Pesan gagal dikirim. Coba lagi nanti.");
    return undefined;
  });
}
