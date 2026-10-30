"use server";

import { z } from "zod";
import { clientIp, rateLimit, runAction } from "@/lib/actions";
import { ActionError } from "@/lib/auth";
import { loadGradableQuestions } from "@/lib/learning/questions-server";
import { gradeResponse } from "@/lib/questions/grading";
import type { QuestionResponse } from "@/lib/questions/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public demo questions: practice questions of the first A1 unit only (never quiz/exam items). */
export async function sampleQuestionIds(limit = 3): Promise<string[]> {
  const db = createAdminClient();
  const { data: unit } = await db.from("units").select("id").eq("slug", "a1-u01-hello").maybeSingle();
  if (!unit) return [];
  const { data } = await db
    .from("questions")
    .select("id, type, lessons!inner(unit_id)")
    .eq("lessons.unit_id", unit.id)
    .eq("status", "published")
    .in("stage", ["guided", "independent"])
    .in("type", ["single_choice", "word_order", "fill_blank", "matching", "dialogue_completion", "contextual_vocabulary"])
    .limit(30);
  const seen = new Set<string>();
  return (data ?? []).filter((q) => (seen.has(q.type) ? false : seen.add(q.type))).slice(0, limit).map((q) => q.id);
}

export async function checkSampleAction(questionId: string, response: unknown) {
  return runAction(async () => {
    await rateLimit(`sample:${await clientIp()}`, 30, 60);
    const id = z.uuid().parse(questionId);
    const allowed = await sampleQuestionIds(10);
    if (!allowed.includes(id)) throw new ActionError("Soal contoh tidak ditemukan.", "not_found");
    const q = (await loadGradableQuestions([id])).get(id);
    if (!q) throw new ActionError("Soal contoh tidak ditemukan.", "not_found");
    return { ...gradeResponse(q, response as QuestionResponse), explanation: q.explanation, misconception: q.misconception };
  });
}
