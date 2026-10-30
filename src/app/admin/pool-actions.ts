"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

/** Adds questions (by external key or id, one per line) to a quiz or exam pool. */
export async function addToPoolAction(kind: "quiz" | "exam", ownerId: string, refs: string) {
  return runAction(async () => {
    await assertPermission("content.write");
    const id = z.uuid().parse(ownerId);
    const list = [...new Set(refs.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))].slice(0, 200);
    if (!list.length) throw new ActionError("Masukkan minimal satu key atau ID soal.");
    const supabase = await createClient();
    const ids = list.filter((r) => UUID.test(r));
    const keys = list.filter((r) => !UUID.test(r));
    const found = [
      ...(ids.length ? (await supabase.from("questions").select("id").in("id", ids)).data ?? [] : []),
      ...(keys.length ? (await supabase.from("questions").select("id").in("external_key", keys)).data ?? [] : []),
    ];
    if (!found.length) throw new ActionError("Tidak ada soal yang cocok.");
    const rows = found.map((q, i) => (kind === "quiz" ? { quiz_id: id, question_id: q.id, sort_order: i } : { exam_id: id, question_id: q.id, sort_order: i }));
    const { error } = kind === "quiz" ? await supabase.from("quiz_questions").upsert(rows as never, { onConflict: "quiz_id,question_id" }) : await supabase.from("exam_questions").upsert(rows as never, { onConflict: "exam_id,question_id" });
    if (error) throw new ActionError(error.message);
    revalidatePath(kind === "quiz" ? "/admin/quizzes" : "/admin/exams");
    return { added: found.length, missing: list.length - found.length };
  });
}

export async function removeFromPoolAction(kind: "quiz" | "exam", ownerId: string, questionId: string) {
  return runAction(async () => {
    await assertPermission("content.write");
    const supabase = await createClient();
    const { error } =
      kind === "quiz"
        ? await supabase.from("quiz_questions").delete().eq("quiz_id", z.uuid().parse(ownerId)).eq("question_id", z.uuid().parse(questionId))
        : await supabase.from("exam_questions").delete().eq("exam_id", z.uuid().parse(ownerId)).eq("question_id", z.uuid().parse(questionId));
    if (error) throw new ActionError(error.message);
    revalidatePath(kind === "quiz" ? "/admin/quizzes" : "/admin/exams");
    return undefined;
  });
}
