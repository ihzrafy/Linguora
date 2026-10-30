import "server-only";
import type { Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, effectiveStreak, localDate, weekStart, weeklyStreak } from "./streak";

export type CategoryPerf = { category: string; answers: number; correct: number; unique: number; accuracy: number };

export async function getDashboardData(viewer: Viewer) {
  const supabase = await createClient();
  const today = localDate(viewer.profile.timezone);
  const since = addDays(today, -89);

  const [stats, activity, summary, categories, due, nextLesson, achievements, userAch, currentLevel, recentAttempts, vocab] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("daily_activity").select("*").eq("user_id", viewer.id).gte("activity_date", since).order("activity_date"),
    supabase.rpc("my_learning_summary", { p_days: undefined }),
    supabase.rpc("my_category_performance", { p_days: undefined }),
    supabase.from("review_schedules").select("item_type", { count: "exact" }).eq("user_id", viewer.id).lte("due_at", new Date().toISOString()),
    supabase
      .from("learning_progress")
      .select("lesson_id, status, last_activity_at, lessons(slug, title, summary)")
      .eq("user_id", viewer.id)
      .eq("status", "in_progress")
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("achievements").select("id, key, name, description, icon, criteria").eq("is_active", true).order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", viewer.id),
    viewer.profile.current_level_id ? supabase.from("levels").select("id, code, slug, name").eq("id", viewer.profile.current_level_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("assessment_attempts")
      .select("id, kind, score_percent, passed, submitted_at, quiz_id, exam_id")
      .eq("user_id", viewer.id)
      .neq("status", "in_progress")
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase.from("review_schedules").select("mastery").eq("user_id", viewer.id).in("item_type", ["vocabulary", "user_vocabulary"]),
  ]);

  const days = activity.data ?? [];
  const todayRow = days.find((d) => d.activity_date === today);
  const thisWeek = weekStart(today);
  const weekRows = days.filter((d) => d.activity_date >= thisWeek);
  const weekMinutes = weekRows.reduce((s, d) => s + d.minutes_studied, 0);
  const weekXp = weekRows.reduce((s, d) => s + d.xp_earned, 0);

  // Current level progress (core course).
  let levelProgress: { completed: number; total: number } | null = null;
  let nextAvailable: { slug: string; title: string } | null = null;
  if (currentLevel.data) {
    const { data: course } = await supabase.from("courses").select("id").eq("level_id", currentLevel.data.id).eq("is_core", true).maybeSingle();
    if (course) {
      const { data: path } = await supabase.rpc("get_course_path", { p_course: course.id });
      const rows = path ?? [];
      levelProgress = { completed: rows.filter((r) => ["completed", "mastered", "needs_review"].includes(r.lesson_status)).length, total: rows.length };
      const first = rows.find((r) => r.lesson_status === "available" || r.lesson_status === "in_progress");
      if (first) {
        const { data: l } = await supabase.from("lessons").select("slug, title").eq("id", first.lesson_id).maybeSingle();
        nextAvailable = l;
      }
    }
  }

  const unlocked = new Set((userAch.data ?? []).map((u) => u.achievement_id));
  const s = stats.data;
  const metricValue = (metric: string) =>
    ({
      lessons_completed: s?.lessons_completed ?? 0,
      total_xp: s?.total_xp ?? 0,
      streak: s?.longest_streak ?? 0,
      perfect_scores: s?.perfect_scores ?? 0,
      correct_answers: s?.correct_answers ?? 0,
    })[metric];
  const achievementProgress = (achievements.data ?? [])
    .filter((a) => !unlocked.has(a.id))
    .map((a) => {
      const c = a.criteria as { metric: string; threshold: number };
      const value = metricValue(c.metric);
      return value === undefined ? null : { ...a, value, threshold: c.threshold, pct: Math.min(100, Math.round((value / c.threshold) * 100)) };
    })
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const cats: CategoryPerf[] = (categories.data ?? []).map((c) => ({
    category: c.category,
    answers: Number(c.answers),
    correct: Number(c.correct),
    unique: Number(c.unique_questions),
    accuracy: Number(c.answers) ? Math.round((Number(c.correct) / Number(c.answers)) * 100) : 0,
  }));
  const vocabRows = vocab.data ?? [];
  const sum = (summary.data ?? {}) as Record<string, number>;

  return {
    today,
    stats: {
      totalXp: s?.total_xp ?? 0,
      streak: effectiveStreak(s?.current_streak ?? 0, s?.last_active_date ?? null, today),
      longestStreak: s?.longest_streak ?? 0,
      weeklyStreak: weeklyStreak(days.filter((d) => d.xp_earned > 0 || d.questions_answered > 0).map((d) => d.activity_date), today),
      lessonsCompleted: Number(sum.lessons_completed ?? 0),
      answers: Number(sum.answers ?? 0),
      uniqueQuestions: Number(sum.unique_questions ?? 0),
      accuracy: Number(sum.answers) ? Math.round((Number(sum.correct) / Number(sum.answers)) * 100) : null,
    },
    todayXp: todayRow?.xp_earned ?? 0,
    goalMet: todayRow?.goal_met ?? false,
    weekMinutes,
    weekXp,
    days: days.map((d) => ({ date: d.activity_date, xp: d.xp_earned, minutes: d.minutes_studied, answers: d.questions_answered, correct: d.correct_answers })),
    categories: cats,
    grammarMastery: cats.find((c) => c.category === "grammar")?.accuracy ?? null,
    vocabularyMastery: vocabRows.length ? Math.round((vocabRows.filter((v) => v.mastery === "mastered").length / vocabRows.length) * 100) : null,
    vocabularyTracked: vocabRows.length,
    dueReviews: due.count ?? 0,
    continueLesson: nextLesson.data ? (nextLesson.data.lessons as { slug: string; title: string; summary: string } | null) : null,
    nextAvailable,
    currentLevel: currentLevel.data,
    levelProgress,
    achievementProgress,
    recentAttempts: recentAttempts.data ?? [],
  };
}
