"use server";

import { z } from "zod";
import { assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Click-to-translate: looks a word up in the Linguora dictionary (simple lemma fallbacks). */
export async function lookupWordAction(raw: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`lookup:${viewer.id}`, 120, 60);
    const word = z.string().trim().toLowerCase().max(40).parse(raw).replace(/[^a-z'-]/g, "");
    if (!word) return null;
    const candidates = [word, word.replace(/'s$/, ""), word.replace(/ies$/, "y"), word.replace(/es$/, ""), word.replace(/s$/, ""), word.replace(/ed$/, ""), word.replace(/ed$/, "e"), word.replace(/ing$/, ""), word.replace(/ing$/, "e")];
    const supabase = await createClient();
    const { data } = await supabase
      .from("vocabulary_entries")
      .select("id, word, part_of_speech, ipa, meaning_id, definition")
      .in("word", [...new Set(candidates.filter(Boolean))])
      .eq("status", "published")
      .limit(1)
      .maybeSingle();
    return data;
  });
}

/** Adds reading time to the learner's reading history and study minutes. */
export async function recordReadingTimeAction(passageId: string, seconds: number) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const id = z.uuid().parse(passageId);
    const secs = z.number().int().min(0).max(3 * 3600).parse(Math.round(seconds));
    const db = createAdminClient();
    const { data: prev } = await db.from("reading_progress").select("time_spent_seconds").eq("user_id", viewer.id).eq("passage_id", id).maybeSingle();
    await db
      .from("reading_progress")
      .upsert({ user_id: viewer.id, passage_id: id, time_spent_seconds: (prev?.time_spent_seconds ?? 0) + secs, last_read_at: new Date().toISOString() }, { onConflict: "user_id,passage_id" });
    if (secs >= 60) await db.rpc("record_activity", { p_user: viewer.id, p_minutes: Math.floor(secs / 60) });
    return undefined;
  });
}

export async function recordListeningPlayAction(materialId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const id = z.uuid().parse(materialId);
    const db = createAdminClient();
    const { data: prev } = await db.from("listening_progress").select("plays").eq("user_id", viewer.id).eq("material_id", id).maybeSingle();
    await db
      .from("listening_progress")
      .upsert({ user_id: viewer.id, material_id: id, plays: (prev?.plays ?? 0) + 1, last_played_at: new Date().toISOString() }, { onConflict: "user_id,material_id" });
    return undefined;
  });
}
