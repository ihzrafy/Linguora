import type { Metadata } from "next";
import { PoolManager } from "@/components/admin/pool-manager";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Quiz" };

export default async function QuizzesAdminPage({ searchParams }: { searchParams: Promise<ResourceSearchParams> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("content.read", "/admin/quizzes");
  let pool = null;
  if (sp.edit && sp.edit !== "new") {
    const supabase = await createClient();
    const { data } = await supabase.from("quiz_questions").select("questions(id, external_key, prompt, type, category, status, stage)").eq("quiz_id", sp.edit).order("sort_order").limit(1000);
    pool = (data ?? []).map((r) => r.questions as unknown as { id: string; external_key: string | null; prompt: string; type: string; category: string; status: string; stage: string }).filter(Boolean);
  }
  return (
    <div className="space-y-6">
      <ResourcePage resourceKey="quizzes" sp={sp} />
      {pool && <PoolManager kind="quiz" ownerId={sp.edit!} items={pool.map((q) => ({ ...q, key: q.external_key }))} canWrite={viewer.permissions.has("content.write")} />}
    </div>
  );
}
