import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const csvCell = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Exports the signed-in learner's wordbook as CSV or JSON. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_vocabulary")
    .select("custom_word, custom_meaning, custom_example, is_favorite, added_at, vocabulary_collections(name), vocabulary_entries(word, meaning_id, part_of_speech, examples)")
    .eq("user_id", viewer.id)
    .order("added_at");
  const rows = (data ?? []).map((r) => {
    const e = r.vocabulary_entries as { word: string; meaning_id: string; part_of_speech: string; examples: { en: string }[] } | null;
    return {
      word: e?.word ?? r.custom_word ?? "",
      meaning: e?.meaning_id ?? r.custom_meaning ?? "",
      example: e?.examples?.[0]?.en ?? r.custom_example ?? "",
      partOfSpeech: e?.part_of_speech ?? "",
      collection: (r.vocabulary_collections as { name: string } | null)?.name ?? "",
      favorite: r.is_favorite,
      addedAt: r.added_at,
    };
  });
  const filename = `linguora-wordbook-${new Date().toISOString().slice(0, 10)}.${format}`;
  const body =
    format === "json"
      ? JSON.stringify(rows, null, 2)
      : ["word,meaning,example,part_of_speech,collection,favorite,added_at", ...rows.map((r) => [r.word, r.meaning, r.example, r.partOfSpeech, r.collection, String(r.favorite), r.addedAt].map(csvCell).join(","))].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
