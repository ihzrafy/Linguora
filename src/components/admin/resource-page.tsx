import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { BulkStatusBar } from "@/components/admin/bulk-status";
import { ResourceForm } from "@/components/admin/resource-form";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getResource, type FieldDef } from "@/lib/admin/resources";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;
export type ResourceSearchParams = { q?: string; status?: string; level?: string; page?: string; edit?: string };

async function loadOptions(fields: FieldDef[]) {
  const supabase = await createClient();
  const entries = await Promise.all(
    fields
      .filter((f) => f.optionsFrom)
      .map(async (f) => {
        const o = f.optionsFrom!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from(o.table as any) as any).select(`${o.value}, ${o.label}`).order(o.order ?? o.label).limit(1000);
        return [f.name, ((data ?? []) as Record<string, string>[]).map((r) => ({ value: r[o.value], label: r[o.label] }))] as const;
      }),
  );
  return Object.fromEntries(entries);
}

export const STATUS_BADGE: Record<string, string> = {
  draft: "",
  in_review: "bg-warning/20 text-warning-foreground dark:text-warning",
  published: "bg-success text-success-foreground",
  archived: "bg-muted text-muted-foreground",
};

/** Generic CMS list + edit page for a resource definition. */
export async function ResourcePage({ resourceKey, sp, basePath, extraActions }: { resourceKey: string; sp: ResourceSearchParams; basePath?: string; extraActions?: React.ReactNode }) {
  const def = getResource(resourceKey);
  const viewer = await requirePermission(def.readPermission, def.path);
  const canWrite = viewer.permissions.has(def.writePermission);
  const path = basePath ?? def.path.split("?")[0];
  const viewParam = def.path.includes("?") ? def.path.split("?")[1] : "";
  const listHref = viewParam ? `${path}?${viewParam}` : path;
  const supabase = await createClient();
  const options = await loadOptions(def.fields);

  if (sp.edit && canWrite) {
    let initial: Record<string, unknown> = {};
    if (sp.edit !== "new") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from(def.table as any) as any).select("*").eq(def.idColumn ?? "id", sp.edit).maybeSingle();
      initial = (data as Record<string, unknown>) ?? {};
    }
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow={def.title} title={sp.edit === "new" ? `Tambah ${def.singular}` : `Edit ${def.singular}`} description={def.description} />
        <ResourceForm
          resourceKey={def.key}
          id={sp.edit === "new" ? null : sp.edit}
          fields={def.fields}
          initial={initial}
          options={options}
          returnTo={listHref}
          canDelete={def.deletable && viewer.permissions.has("content.delete")}
        />
      </div>
    );
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const listFields = def.fields.filter((f) => f.list);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from(def.table as any) as any).select("*", { count: "exact" });
  for (const o of def.orderBy) query = query.order(o.column, { ascending: o.ascending ?? true });
  if (sp.q && def.search) query = query.ilike(def.search, `%${sp.q.replace(/[%,()]/g, "")}%`);
  if (sp.status && def.hasStatus) query = query.eq("status", sp.status);
  if (sp.level && def.levelFilter) query = query.eq("level_id", sp.level);
  const { data: rows, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const label = (f: FieldDef, v: unknown) => {
    if (f.kind === "boolean") return v ? "✓" : "–";
    if (f.kind === "select") return (f.options ?? options[f.name] ?? []).find((o: { value: string }) => o.value === v)?.label ?? String(v ?? "–");
    return String(v ?? "–");
  };
  const formId = `bulk-${def.key}`;
  const sep = listHref.includes("?") ? "&" : "?";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin CMS"
        title={def.title}
        description={def.description}
        actions={
          <>
            {extraActions}
            {canWrite && (
              <Button asChild>
                <Link href={`${listHref}${sep}edit=new`}>
                  <Plus /> Tambah
                </Link>
              </Button>
            )}
          </>
        }
      />
      <form className="flex flex-col gap-2 md:flex-row" role="search">
        {viewParam && <input type="hidden" name={viewParam.split("=")[0]} value={viewParam.split("=")[1]} />}
        {def.search && (
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input name="q" defaultValue={sp.q} placeholder="Cari…" className="pl-9" aria-label="Cari" />
          </div>
        )}
        {def.levelFilter && (
          <NativeSelect name="level" defaultValue={sp.level ?? ""} aria-label="Level">
            <option value="">Semua level</option>
            {(options.level_id ?? []).map((o: { value: string; label: string }) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        )}
        {def.hasStatus && (
          <NativeSelect name="status" defaultValue={sp.status ?? ""} aria-label="Status">
            <option value="">Semua status</option>
            {["draft", "in_review", "published", "archived"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      {def.hasStatus && canWrite && <BulkStatusBar resourceKey={def.key} formId={formId} />}
      {!rows?.length ? (
        <EmptyState title="Belum ada data" />
      ) : (
        <div id={formId} className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {def.hasStatus && canWrite && <TableHead className="w-8" />}
                {listFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows as Record<string, unknown>[]).map((r) => (
                <TableRow key={String(r[def.idColumn ?? "id"])}>
                  {def.hasStatus && canWrite && (
                    <TableCell>
                      <input type="checkbox" data-bulk value={String(r.id)} aria-label="Pilih baris" />
                    </TableCell>
                  )}
                  {listFields.map((f) => (
                    <TableCell key={f.name} className="max-w-72 truncate">
                      {f.name === "status" ? <Badge variant="outline" className={STATUS_BADGE[String(r.status)]}>{String(r.status)}</Badge> : label(f, r[f.name])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {canWrite ? (
                      <Link href={`${listHref}${sep}edit=${r[def.idColumn ?? "id"]}`} className="text-sm font-medium text-primary hover:underline">
                        Edit
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">baca saja</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath={path} params={{ ...(viewParam ? { [viewParam.split("=")[0]]: viewParam.split("=")[1] } : {}), q: sp.q, status: sp.status, level: sp.level }} />
    </div>
  );
}
