"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const SECTION_KINDS = ["objectives", "explanation", "examples", "vocabulary", "grammar", "mistakes", "guided_practice", "independent_practice", "mini_assessment", "summary", "review_cards", "completion", "media"] as const;

const lessonSchema = z.object({
  id: z.uuid().nullable(),
  unitId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung.").max(120),
  title: z.string().trim().min(1, "Judul wajib diisi.").max(200),
  summary: z.string().trim().max(600),
  objectives: z.array(z.string().trim().min(1).max(300)).max(20),
  completionCriteria: z.string().trim().max(600),
  estimatedMinutes: z.number().int().min(1).max(240),
  xpReward: z.number().int().min(0).max(500),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  publishAt: z.string().nullable(),
  sections: z
    .array(
      z.object({
        kind: z.enum(SECTION_KINDS),
        title: z.string().trim().min(1).max(150),
        body_md: z.string().max(50_000),
        data: z.string().max(100_000),
      }),
    )
    .max(30),
  prerequisites: z.array(z.uuid()).max(20),
  note: z.string().max(200).optional(),
});

export async function saveLessonAction(input: z.input<typeof lessonSchema>) {
  return runAction(async () => {
    const viewer = await assertPermission("content.write");
    await rateLimit(`cms:${viewer.id}`, 120, 60);
    const d = lessonSchema.parse(input);
    if (d.status === "published") await assertPermission("content.publish");
    const sections = d.sections.map((s, i) => {
      let data: unknown = {};
      if (s.data.trim()) {
        try {
          data = JSON.parse(s.data);
        } catch {
          throw new ActionError(`Bagian ${i + 1} (${s.title}): data JSON tidak valid.`);
        }
      }
      return { kind: s.kind, title: s.title, body_md: s.body_md, data };
    });
    const supabase = await createClient();
    const { data: id, error } = await supabase.rpc("cms_save_lesson", {
      p_lesson: {
        id: d.id,
        unit_id: d.unitId,
        slug: d.slug,
        title: d.title,
        summary: d.summary,
        objectives: d.objectives,
        completion_criteria: d.completionCriteria,
        estimated_minutes: d.estimatedMinutes,
        xp_reward: d.xpReward,
        status: d.status,
        publish_at: d.publishAt || "",
      } as unknown as Json,
      p_sections: sections as unknown as Json,
      p_prerequisites: d.prerequisites,
      p_note: d.note ?? (d.id ? "edit" : "create"),
    });
    if (error) {
      if (error.code === "23505") throw new ActionError("Slug atau urutan lesson sudah dipakai.", "conflict");
      if (error.code === "42501") throw new ActionError(error.message.includes("reviewer") ? error.message : "Kamu tidak memiliki izin untuk perubahan ini.", "forbidden");
      throw new ActionError(error.message);
    }
    // Every lesson needs a mini quiz record (questions are linked in the question bank).
    const { data: quiz } = await supabase.from("quizzes").select("id").eq("lesson_id", id as string).eq("kind", "lesson_quiz").maybeSingle();
    if (!quiz) {
      await supabase.from("quizzes").insert({
        kind: "lesson_quiz",
        lesson_id: id as string,
        title: `Mini Quiz: ${d.title}`,
        pass_threshold: 70,
        status: viewer.permissions.has("content.publish") ? "published" : "draft",
      });
    }
    revalidatePath("/admin/lessons");
    return { id: id as string };
  });
}

export async function duplicateLessonAction(id: string) {
  return runAction(async () => {
    await assertPermission("content.write");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cms_duplicate_lesson", { p_lesson: z.uuid().parse(id) });
    if (error) throw new ActionError(error.message);
    revalidatePath("/admin/lessons");
    return { id: data as string };
  });
}
