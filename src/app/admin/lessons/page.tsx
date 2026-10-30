import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { BulkStatusBar } from "@/components/admin/bulk-status";
import { STATUS_BADGE } from "@/components/admin/resource-page";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Lesson" };
const PAGE = 30;

export default async function LessonsAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; unit?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("content.read", "/admin/lessons");
  const canWrite = viewer.permissions.has("content.write");
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data: units } = await supabase.from("units").select("id, slug, title").order("slug");
  let query = supabase.from("lessons").select("id, slug, title, status, version, sort_order, publish_at, updated_at, units(slug)", { count: "exact" }).order("slug").range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) query = query.or(`title.ilike.%${sp.q.replace(/[%,()]/g, "")}%,slug.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  if (sp.unit) query = query.eq("unit_id", sp.unit);
  if (sp.status) query = query.eq("status", sp.status as never);
  const { data: rows, count } = await query;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin CMS"
        title="Lesson"
        description="Kelola 12 bagian materi per lesson, prasyarat, jadwal publikasi, versi, dan rollback."
        actions={
          canWrite && (
            <Button asChild>
              <Link href={`/admin/lessons/new${sp.unit ? `?unit=${sp.unit}` : ""}`}>
                <Plus /> Lesson baru
              </Link>
            </Button>
          )
        }
      />
      <form className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={sp.q} placeholder="Cari judul atau slug…" className="pl-9" aria-label="Cari lesson" />
        </div>
        <NativeSelect name="unit" defaultValue={sp.unit ?? ""} aria-label="Unit" wrapperClassName="max-w-64">
          <option value="">Semua unit</option>
          {(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.slug}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          <option value="">Semua status</option>
          {["draft", "in_review", "published", "archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      {canWrite && <BulkStatusBar resourceKey="lessons" formId="lessons" />}
      {!rows?.length ? (
        <EmptyState title="Tidak ada lesson" />
      ) : (
        <div id="lessons" className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {canWrite && <TableHead className="w-8" />}
                <TableHead>Lesson</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>#</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>v</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  {canWrite && (
                    <TableCell>
                      <input type="checkbox" data-bulk value={l.id} aria-label="Pilih lesson" />
                    </TableCell>
                  )}
                  <TableCell className="max-w-96">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{l.slug}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{(l.units as { slug: string } | null)?.slug}</TableCell>
                  <TableCell>{l.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[l.status]}>
                      {l.status}
                    </Badge>
                    {l.publish_at && <span className="ml-1 text-xs text-muted-foreground">⏱ {new Date(l.publish_at).toLocaleDateString("id-ID")}</span>}
                  </TableCell>
                  <TableCell className="text-xs">{l.version}</TableCell>
                  <TableCell>
                    <Link href={`/admin/lessons/${l.id}`} className="text-sm font-medium text-primary hover:underline">
                      {canWrite ? "Edit" : "Lihat"}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/lessons" params={{ q: sp.q, unit: sp.unit, status: sp.status }} />
    </div>
  );
}
