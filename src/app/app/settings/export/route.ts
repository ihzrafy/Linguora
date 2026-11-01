import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Privacy: downloads all personal learning data of the signed-in user as JSON. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const supabase = await createClient();
  const own = <T extends string>(table: T) => supabase.from(table as never).select("*").eq("user_id", viewer.id);
  const tables = [
    "user_stats",
    "learning_progress",
    "course_enrollments",
    "user_level_unlocks",
    "user_roles",
    "assessment_attempts",
    "assessment_answers",
    "skill_assessments",
    "user_question_stats",
    "xp_transactions",
    "daily_activity",
    "user_achievements",
    "certificates",
    "leaderboard_snapshots",
    "review_schedules",
    "user_vocabulary",
    "reading_progress",
    "listening_progress",
    "vocabulary_collections",
    "writing_submissions",
    "speaking_sessions",
    "study_sessions",
    "study_plans",
    "planned_lessons",
    "notes",
    "bookmarks",
    "notifications",
    "ai_tutor_sessions",
    "ai_tutor_messages",
  ] as const;
  const results = await Promise.all(tables.map((t) => own(t)));
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", viewer.id).single();
  const body = {
    exportedAt: new Date().toISOString(),
    account: { email: viewer.email, profile },
    ...Object.fromEntries(tables.map((t, i) => [t, results[i].data ?? []])),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="linguora-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
