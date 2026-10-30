import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Audit log" };
const PAGE = 50;

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ entity?: string; action?: string; page?: string }> }) {
  const sp = await searchParams;
  await requirePermission("audit.view", "/admin/audit-logs");
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.entity) query = query.eq("entity_type", sp.entity);
  if (sp.action) query = query.eq("action", sp.action);
  const { data: rows, count } = await query;
  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, username").in("id", actorIds) : { data: [] };
  const name = (id: string | null) => (id ? (actors?.find((a) => a.id === id)?.username ?? id.slice(0, 8)) : "sistem");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Sistem" title="Audit log" description="Setiap perubahan konten, role, pengaturan, penilaian, ekspor, dan rollback oleh staf dicatat otomatis." />
      <form className="flex flex-wrap gap-2">
        <Input name="entity" defaultValue={sp.entity} placeholder="Tabel (mis. questions)" className="w-56" aria-label="Filter entitas" />
        <Input name="action" defaultValue={sp.action} placeholder="Aksi (insert/update/delete/…)" className="w-56" aria-label="Filter aksi" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" })}</TableCell>
                <TableCell className="text-sm">{name(r.actor_id)}</TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="font-mono text-xs">
                  {r.entity_type}
                  {r.entity_id && <span className="block text-muted-foreground">{r.entity_id.slice(0, 36)}</span>}
                </TableCell>
                <TableCell className="max-w-80 truncate font-mono text-xs">{JSON.stringify(r.metadata)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/audit-logs" params={{ entity: sp.entity, action: sp.action }} />
    </div>
  );
}
