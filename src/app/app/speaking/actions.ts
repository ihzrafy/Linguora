"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { normalizeAnswer } from "@/lib/questions/normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const sessionSchema = z.object({
  promptId: z.uuid().nullable(),
  mode: z.enum(["speaking", "pronunciation", "conversation"]),
  transcript: z.string().max(10_000).default(""),
  recognitionAvailable: z.boolean(),
  confidence: z.number().min(0).max(1).nullable(),
  durationSeconds: z.number().int().min(0).max(3600).nullable(),
  audioPath: z.string().max(300).nullable(),
  selfRating: z.object({ fluency: z.number().int().min(1).max(5), confidence: z.number().int().min(1).max(5) }).partial(),
  reflection: z.string().max(2000).optional(),
});

/** Saves a speaking session. Matched target phrases are computed on the server from the transcript. */
export async function saveSpeakingSessionAction(input: z.input<typeof sessionSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`speaking:${viewer.id}`, 30, 3600);
    const data = sessionSchema.parse(input);
    if (data.audioPath && !data.audioPath.startsWith(`${viewer.id}/`)) throw new ActionError("Lokasi rekaman tidak valid.", "forbidden");
    const supabase = await createClient();
    let matched: string[] = [];
    if (data.promptId) {
      const { data: prompt } = await supabase.from("speaking_prompts").select("target_phrases").eq("id", data.promptId).maybeSingle();
      const said = normalizeAnswer(data.transcript);
      matched = (prompt?.target_phrases ?? []).filter((p) => said.includes(normalizeAnswer(p)));
    }
    const words = data.transcript.trim() ? data.transcript.trim().split(/\s+/).length : 0;
    const { data: row, error } = await supabase
      .from("speaking_sessions")
      .insert({
        user_id: viewer.id,
        prompt_id: data.promptId,
        mode: data.mode,
        transcript: data.transcript || null,
        recognition_available: data.recognitionAvailable,
        recognition_confidence: data.confidence,
        duration_seconds: data.durationSeconds,
        audio_path: data.audioPath,
        matched_phrases: matched,
        word_count: words,
        self_rating: data.selfRating,
        reflection: data.reflection ?? null,
      })
      .select("id")
      .single();
    if (error) throw new ActionError("Sesi gagal disimpan.");
    const admin = createAdminClient();
    if (data.durationSeconds && data.durationSeconds >= 60) await admin.rpc("record_activity", { p_user: viewer.id, p_minutes: Math.floor(data.durationSeconds / 60) });
    else await admin.rpc("record_activity", { p_user: viewer.id });
    await admin.rpc("evaluate_achievements", { p_user: viewer.id });
    revalidatePath("/app/speaking");
    return { id: row.id, matched, words };
  });
}

export async function deleteSpeakingSessionAction(id: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    const { data } = await supabase.from("speaking_sessions").select("audio_path").eq("id", z.uuid().parse(id)).eq("user_id", viewer.id).maybeSingle();
    if (data?.audio_path) await supabase.storage.from("recordings").remove([data.audio_path]);
    await supabase.from("speaking_sessions").delete().eq("id", id).eq("user_id", viewer.id);
    revalidatePath("/app/speaking");
    return undefined;
  });
}
