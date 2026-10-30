import "server-only";
import { ActionError, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LessonStatus = "locked" | "available" | "in_progress" | "completed" | "mastered" | "needs_review";

export type PathLesson = { id: string; slug: string; title: string; summary: string; estimatedMinutes: number; sort: number; status: LessonStatus; bestScore: number | null };
export type PathUnit = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sort: number;
  unlocked: boolean;
  completed: boolean;
  lessonsDone: boolean;
  unitTestQuizId: string | null;
  unitTestPassed: boolean;
  lessons: PathLesson[];
};

/** Learning path of a course with statuses computed by the database (single source of truth). */
export async function getCoursePath(courseId: string): Promise<PathUnit[]> {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: units }, { data: lessons }] = await Promise.all([
    supabase.rpc("get_course_path", { p_course: courseId }),
    supabase.from("units").select("id, slug, title, description, sort_order").eq("course_id", courseId).eq("status", "published").order("sort_order"),
    supabase
      .from("lessons")
      .select("id, slug, title, summary, estimated_minutes, sort_order, unit_id, units!inner(course_id)")
      .eq("units.course_id", courseId)
      .eq("status", "published"),
  ]);
  if (error) throw new Error(error.message);
  return (units ?? []).map((u) => {
    const unitRows = (rows ?? []).filter((r) => r.unit_id === u.id);
    const first = unitRows[0];
    return {
      id: u.id,
      slug: u.slug,
      title: u.title,
      description: u.description,
      sort: u.sort_order,
      unlocked: first?.unit_unlocked ?? false,
      completed: first?.unit_completed ?? false,
      lessonsDone: first?.lessons_done ?? false,
      unitTestQuizId: first?.unit_test_quiz_id ?? null,
      unitTestPassed: first?.unit_test_passed ?? false,
      lessons: unitRows
        .map((r) => {
          const l = lessons?.find((x) => x.id === r.lesson_id);
          return {
            id: r.lesson_id,
            slug: l?.slug ?? "",
            title: l?.title ?? "",
            summary: l?.summary ?? "",
            estimatedMinutes: l?.estimated_minutes ?? 15,
            sort: r.lesson_sort,
            status: r.lesson_status as LessonStatus,
            bestScore: r.best_score === null ? null : Number(r.best_score),
          };
        })
        .sort((a, b) => a.sort - b.sort),
    };
  });
}

async function assertAccessible(viewer: Viewer, lessonId: string) {
  const { data } = await createAdminClient().rpc("lesson_accessible_for", { p_user: viewer.id, p_lesson: lessonId });
  if (!data) throw new ActionError("Lesson ini masih terkunci. Selesaikan prasyaratnya terlebih dahulu.", "locked");
}

/** Marks a lesson as started (in progress). Requires the lesson to be unlocked. */
export async function startLesson(viewer: Viewer, lessonId: string) {
  await assertAccessible(viewer, lessonId);
  const db = createAdminClient();
  const { error } = await db.from("learning_progress").upsert(
    { user_id: viewer.id, lesson_id: lessonId, last_activity_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id", ignoreDuplicates: false },
  );
  if (error) throw new Error(error.message);
}

/** The learner confirms they studied all sections; this unlocks the mini quiz. */
export async function completeLessonMaterial(viewer: Viewer, lessonId: string) {
  await assertAccessible(viewer, lessonId);
  const db = createAdminClient();
  const { data: existing } = await db.from("learning_progress").select("material_completed_at").eq("user_id", viewer.id).eq("lesson_id", lessonId).maybeSingle();
  if (existing?.material_completed_at) return;
  const { error } = await db.from("learning_progress").upsert(
    { user_id: viewer.id, lesson_id: lessonId, material_completed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) throw new Error(error.message);
  await db.rpc("record_activity", { p_user: viewer.id, p_minutes: 0 });
}
