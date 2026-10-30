import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Select options for the question editor (scoped to a level when given). */
export async function questionEditorOptions(levelId: string | null) {
  const supabase = await createClient();
  const [{ data: levels }, { data: lessons }, { data: units }, { data: passages }, { data: listening }, { data: grammar }] = await Promise.all([
    supabase.from("levels").select("id, code").order("sort_order"),
    levelId
      ? supabase.from("lessons").select("id, slug, title, units!inner(courses!inner(level_id))").eq("units.courses.level_id", levelId).order("slug").limit(500)
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string }[] }),
    levelId
      ? supabase.from("units").select("id, slug, title, courses!inner(level_id)").eq("courses.level_id", levelId).order("slug")
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string }[] }),
    supabase.from("reading_passages").select("id, title, level_id").order("title").limit(500),
    supabase.from("listening_materials").select("id, title, level_id").order("title").limit(500),
    supabase.from("grammar_topics").select("id, title, level_id").order("title").limit(500),
  ]);
  const inLevel = <T extends { level_id: string }>(rows: T[] | null) => (rows ?? []).filter((r) => !levelId || r.level_id === levelId);
  return {
    levels: (levels ?? []).map((l) => ({ value: l.id, label: l.code })),
    lessons: (lessons ?? []).map((l) => ({ value: l.id, label: `${l.slug} — ${l.title}` })),
    units: (units ?? []).map((u) => ({ value: u.id, label: `${u.slug} — ${u.title}` })),
    passages: inLevel(passages).map((p) => ({ value: p.id, label: p.title })),
    listening: inLevel(listening).map((p) => ({ value: p.id, label: p.title })),
    grammar: inLevel(grammar).map((p) => ({ value: p.id, label: p.title })),
  };
}
