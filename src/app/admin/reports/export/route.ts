import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** CSV exports of aggregated reports (reports.view). */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.permissions.has("reports.view")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  const type = request.nextUrl.searchParams.get("type");
  let csv: string;
  if (type === "questions") {
    const { data } = await supabase.rpc("admin_question_stats", { p_limit: 200 });
    csv = ["question_id,level,type,answers,accuracy,prompt", ...(data ?? []).map((r) => [r.question_id, r.level_code, r.type, r.answers, r.accuracy, r.prompt].map(cell).join(","))].join("\n");
  } else {
    const { data } = await supabase.rpc("admin_overview");
    const daily = ((data as { daily?: { date: string; active: number; answers: number }[] } | null)?.daily ?? []) as { date: string; active: number; answers: number }[];
    csv = ["date,active_users,answers", ...daily.map((d) => [d.date, d.active, d.answers].map(cell).join(","))].join("\n");
  }
  await supabase.rpc("log_audit", { p_action: "export", p_entity_type: "reports", p_entity_id: type ?? "daily", p_metadata: {} });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linguora-report-${type ?? "daily"}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
