"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { aiEnabled, aiModel, describeProviderError, tutorAnswer } from "@/lib/ai/tutor";
import { countWords } from "@/lib/questions/normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const draftSchema = z.object({
  id: z.uuid().nullable(),
  promptId: z.uuid().nullable(),
  title: z.string().trim().max(150).optional(),
  content: z.string().max(20_000),
});

/** Autosaves a draft (creates it on first save). Only drafts can be edited (enforced by RLS too). */
export async function saveDraftAction(input: z.input<typeof draftSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`draft:${viewer.id}`, 120, 60);
    const data = draftSchema.parse(input);
    const supabase = await createClient();
    const row = { prompt_id: data.promptId, title: data.title ?? null, content: data.content, word_count: countWords(data.content) };
    if (data.id) {
      const { data: updated, error } = await supabase.from("writing_submissions").update(row).eq("id", data.id).eq("user_id", viewer.id).eq("status", "draft").select("id, updated_at").maybeSingle();
      if (error || !updated) throw new ActionError("Draft tidak dapat disimpan (mungkin sudah dikirim).", "conflict");
      return { id: updated.id, savedAt: updated.updated_at };
    }
    const { data: created, error } = await supabase.from("writing_submissions").insert({ ...row, user_id: viewer.id, status: "draft" }).select("id, updated_at").single();
    if (error) throw new ActionError("Draft gagal dibuat.");
    return { id: created.id, savedAt: created.updated_at };
  });
}

const submitSchema = z.object({
  id: z.uuid(),
  selfAssessment: z.record(z.string(), z.number().int().min(0).max(5)),
});

export async function submitWritingAction(input: z.input<typeof submitSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = submitSchema.parse(input);
    const supabase = await createClient();
    const { data: sub } = await supabase.from("writing_submissions").select("content, word_count, writing_prompts(min_words)").eq("id", data.id).eq("user_id", viewer.id).maybeSingle();
    if (!sub) throw new ActionError("Tulisan tidak ditemukan.", "not_found");
    const min = (sub.writing_prompts as { min_words: number } | null)?.min_words ?? 1;
    if (sub.word_count < min) throw new ActionError(`Tulisan minimal ${min} kata sebelum dikirim untuk dinilai.`);
    const { error } = await supabase
      .from("writing_submissions")
      .update({ status: "submitted", self_assessment: data.selfAssessment, submitted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", viewer.id)
      .eq("status", "draft");
    if (error) throw new ActionError("Tulisan gagal dikirim.");
    const admin = createAdminClient();
    await admin.rpc("record_activity", { p_user: viewer.id });
    await admin.rpc("evaluate_achievements", { p_user: viewer.id });
    revalidatePath("/app/writing");
    return undefined;
  });
}

export async function deleteWritingAction(id: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    await supabase.from("writing_submissions").delete().eq("id", z.uuid().parse(id)).eq("user_id", viewer.id);
    revalidatePath("/app/writing");
    return undefined;
  });
}

/** Preliminary AI feedback on a draft (only when an AI provider is configured). */
export async function requestAiFeedbackAction(id: string): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const res = await runAction(async () => {
    const viewer = await assertViewer();
    if (!aiEnabled()) throw new ActionError("AI belum dikonfigurasi.", "forbidden");
    await rateLimit(`ai-writing:${viewer.id}`, 5, 3600);
    const supabase = await createClient();
    const { data: sub } = await supabase.from("writing_submissions").select("content, writing_prompts(title, instructions_md)").eq("id", z.uuid().parse(id)).eq("user_id", viewer.id).maybeSingle();
    if (!sub) throw new ActionError("Tulisan tidak ditemukan.", "not_found");
    const prompt = sub.writing_prompts as { title: string; instructions_md: string } | null;
    const { data: level } = viewer.profile.current_level_id ? await supabase.from("levels").select("code").eq("id", viewer.profile.current_level_id).maybeSingle() : { data: null };
    let answer;
    try {
      answer = await tutorAnswer({
        mode: "writing",
        levelCode: level?.code ?? null,
        prompt: `Task: ${prompt?.title ?? "Free writing"}\n${prompt?.instructions_md ?? ""}\n\nLearner's text:\n"""\n${sub.content.slice(0, 8000)}\n"""`,
      });
    } catch (error) {
      throw new ActionError(describeProviderError(error));
    }
    if (answer.refused || !answer.text) throw new ActionError("AI tidak dapat memberikan feedback untuk tulisan ini.");
    await createAdminClient()
      .from("writing_submissions")
      .update({ ai_feedback: { text: answer.text, model: aiModel(), created_at: new Date().toISOString() } })
      .eq("id", id)
      .eq("user_id", viewer.id);
    return answer.text;
  });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
}
