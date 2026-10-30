import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Exports questions (authored format incl. answers) for staff with content.read. RLS enforces access. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.permissions.has("content.read")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const supabase = await createClient();
  let query = supabase.from("questions").select("id, status, levels(code), question_answer_keys(authored)").order("external_key").limit(5000);
  for (const key of ["type", "category", "stage", "status"] as const) {
    const v = sp.get(key);
    if (v) query = query.eq(key, v as never);
  }
  if (sp.get("level")) query = query.eq("level_id", sp.get("level")!);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const body = (data ?? []).map((q) => ({
    level: (q.levels as { code: string } | null)?.code,
    ...((q.question_answer_keys as { authored: Record<string, unknown> } | null)?.authored ?? {}),
  }));
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="linguora-questions-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
