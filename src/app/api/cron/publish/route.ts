import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Publishes lessons whose scheduled publish time has passed.
 * Call with header `Authorization: Bearer <CRON_SECRET>` (e.g. from Vercel Cron or any scheduler).
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const { data, error } = await db.rpc("publish_scheduled_content");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data) await db.from("audit_logs").insert({ action: "scheduled_publish", entity_type: "lessons", metadata: { published: data } });
  return NextResponse.json({ published: data });
}
