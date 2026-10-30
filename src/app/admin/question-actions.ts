"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { parseAuthored, questionMetaSchema, questionTemplate, saveAuthoredQuestion } from "@/lib/admin/questions";
import { authoredQuestionSchema } from "@/lib/content/schema";
import { gradeResponse } from "@/lib/questions/grading";
import { prepareQuestion } from "@/lib/questions/transform";
import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";
import { createClient } from "@/lib/supabase/server";

export async function saveQuestionAction(authoredJson: string, meta: z.input<typeof questionMetaSchema>) {
  return runAction(async () => {
    const viewer = await assertPermission("content.write");
    await rateLimit(`cms:${viewer.id}`, 120, 60);
    let authored;
    try {
      authored = parseAuthored(authoredJson);
    } catch (e) {
      if (e instanceof SyntaxError) throw new ActionError("JSON soal tidak valid.");
      throw e;
    }
    const m = questionMetaSchema.parse(meta);
    if (m.status === "published") await assertPermission("content.publish");
    const id = await saveAuthoredQuestion(authored, m);
    revalidatePath("/admin/question-bank");
    return { id };
  });
}

export async function templateAction(type: string) {
  return runAction(async () => {
    await assertPermission("content.write");
    return JSON.stringify(questionTemplate(type), null, 2);
  });
}

/** Renders an authored question exactly as learners will see it (no answers exposed beyond the editor). */
export async function previewQuestionAction(authoredJson: string) {
  return runAction(async () => {
    await assertPermission("content.read");
    const authored = parseAuthored(authoredJson);
    const p = prepareQuestion(authored);
    const question: ClientQuestion = {
      id: "preview",
      type: p.type,
      category: p.category,
      topic: p.topic,
      difficulty: p.difficulty,
      points: p.points,
      prompt: p.prompt,
      instructions: p.instructions,
      contextMd: p.contextMd,
      data: p.data,
      options: p.options,
      passage: null,
      listening: null,
    };
    return { question };
  });
}

export async function gradePreviewAction(authoredJson: string, response: unknown) {
  return runAction(async () => {
    await assertPermission("content.read");
    const p = prepareQuestion(parseAuthored(authoredJson));
    const result = gradeResponse({ points: p.points, data: p.data, options: p.options, answerKey: p.answerKey, grading: p.grading }, response as QuestionResponse);
    return { ...result, explanation: p.explanation, misconception: p.misconception };
  });
}

export async function restoreVersionAction(versionId: string) {
  return runAction(async () => {
    await assertPermission("content.write");
    const supabase = await createClient();
    const { error } = await supabase.rpc("cms_restore_version", { p_version: z.uuid().parse(versionId) });
    if (error) throw new ActionError(error.code === "42501" ? "Kamu tidak memiliki izin untuk rollback ini." : error.message);
    revalidatePath("/admin/question-bank");
    revalidatePath("/admin/lessons");
    return undefined;
  });
}

const importItem = z.object({ level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]) }).passthrough();

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries((header ?? []).map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

/**
 * Imports questions as draft (or in review). JSON: [{ level: "A1", ...authoredQuestion }].
 * CSV (single-choice style): level,type,category,topic,difficulty,stage,prompt,options,answer,explanation
 * with options separated by "|". Every row is validated; invalid rows are reported and skipped.
 */
export async function importQuestionsAction(text: string, format: "json" | "csv", status: "draft" | "in_review") {
  return runAction(async () => {
    const viewer = await assertPermission("content.write");
    await rateLimit(`import:${viewer.id}`, 10, 3600);
    if (text.length > 2_000_000) throw new ActionError("Berkas terlalu besar (maks. 2 MB).");
    let items: unknown[];
    try {
      items =
        format === "json"
          ? (JSON.parse(text) as unknown[])
          : parseCsv(text).map((r) => ({
              level: r.level,
              type: r.type || "single_choice",
              category: r.category,
              topic: r.topic,
              difficulty: Number(r.difficulty || 2),
              stage: r.stage || "quiz",
              prompt: r.prompt,
              options: (r.options ?? "").split("|").map((s) => s.trim()).filter(Boolean),
              answer: Number(r.answer),
              explanation: r.explanation,
            }));
    } catch {
      throw new ActionError("Format berkas tidak valid.");
    }
    if (!Array.isArray(items)) throw new ActionError("JSON harus berupa array.");
    if (items.length > 500) throw new ActionError("Maksimal 500 soal per impor.");
    const supabase = await createClient();
    const { data: levels } = await supabase.from("levels").select("id, code");
    const errors: string[] = [];
    let imported = 0;
    for (const [i, raw] of items.entries()) {
      const base = importItem.safeParse(raw);
      if (!base.success) {
        errors.push(`#${i + 1}: level wajib (A1–C2)`);
        continue;
      }
      const { level, ...rest } = base.data;
      const parsed = authoredQuestionSchema.safeParse({ id: `imp-${Date.now().toString(36)}-${i}`, ...rest });
      if (!parsed.success) {
        errors.push(`#${i + 1}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
        continue;
      }
      try {
        await saveAuthoredQuestion(parsed.data, {
          id: null,
          levelId: levels!.find((l) => l.code === level)!.id,
          lessonId: null,
          unitId: null,
          passageId: null,
          listeningId: null,
          grammarTopicId: null,
          status,
          note: "import",
        });
        imported++;
      } catch (e) {
        errors.push(`#${i + 1}: ${e instanceof Error ? e.message : "gagal"}`);
      }
    }
    revalidatePath("/admin/question-bank");
    return { imported, failed: errors.length, errors: errors.slice(0, 50) };
  });
}
