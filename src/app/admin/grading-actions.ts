"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export async function gradeWritingAction(submissionId: string, scores: Record<string, number>, feedback: string) {
  return runAction(async () => {
    await assertPermission("grading.manage");
    const data = z
      .object({ id: z.uuid(), scores: z.record(z.string(), z.number().int().min(0).max(20)), feedback: z.string().trim().min(1, "Feedback wajib diisi.").max(5000) })
      .parse({ id: submissionId, scores, feedback });
    const supabase = await createClient();
    const { error } = await supabase.rpc("review_writing_submission", { p_submission: data.id, p_scores: data.scores, p_feedback: data.feedback });
    if (error) throw new ActionError(error.message);
    revalidatePath("/admin/writing-rubrics");
    revalidatePath("/admin/content-review");
    return undefined;
  });
}

export async function gradeAnswerAction(answerId: string, points: number, feedback: string) {
  return runAction(async () => {
    await assertPermission("grading.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("grade_manual_answer", { p_answer: z.uuid().parse(answerId), p_points: z.number().min(0).max(100).parse(points), p_feedback: z.string().max(2000).parse(feedback) });
    if (error) throw new ActionError(error.message);
    revalidatePath("/admin/content-review");
    return undefined;
  });
}
