import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
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
import { QUESTION_STAGES, QUESTION_TYPES, SKILL_CATEGORIES } from "@/lib/content/schema";
import { TYPE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { ImportDialog } from "./import-dialog";

export const metadata: Metadata = { title: "Admin · Bank soal" };
const PAGE = 30;
type SP = { q?: string; level?: string; type?: string; category?: string; stage?: string; status?: string; page?: string };

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("content.read", "/admin/question-bank");
  const canWrite = viewer.permissions.has("content.write");
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data: levels } = await supabase.from("levels").select("id, code").order("sort_order");
  let query = supabase
    .from("questions")
    .select("id, external_key, type, category, stage, prompt, topic, difficulty, status, version, updated_at, levels(code)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) query = query.or(`prompt.ilike.%${sp.q.replace(/[%,()]/g, "")}%,topic.ilike.%${sp.q.replace(/[%,()]/g, "")}%,external_key.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  if (sp.level) query = query.eq("level_id", sp.level);
  if (sp.type) query = query.eq("type", sp.type as never);
  if (sp.category) query = query.eq("category", sp.category as never);
  if (sp.stage) query = query.eq("stage", sp.stage as never);
  if (sp.status) query = query.eq("status", sp.status as never);
  const { data: rows, count } = await query;
  const exportQuery = new URLSearchParams(Object.entries({ level: sp.level, type: sp.type, category: sp.category, stage: sp.stage, status: sp.status }).filter((e): e is [string, string] => Boolean(e[1])));

  const select = (name: keyof SP, label: string, values: readonly string[], labels?: Record<string, string>) => (
    <NativeSelect name={name} defaultValue={sp[name] ?? ""} aria-label={label}>
      <option value="">{label}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {labels?.[v] ?? v}
        </option>
      ))}
    </NativeSelect>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin CMS"
        title="Bank soal"
        description={`${(count ?? 0).toLocaleString("id-ID")} soal sesuai filter. Kunci jawaban disimpan terpisah dan tidak pernah dikirim ke pelajar sebelum menjawab.`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/question-bank/export?${exportQuery}`}>
                <Download /> Export JSON
              </a>
            </Button>
            {canWrite && <ImportDialog />}
            {canWrite && (
              <Button asChild>
                <Link href="/admin/questions/create">
                  <Plus /> Soal baru
                </Link>
              </Button>
            )}
          </>
        }
      />
      <form className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={sp.q} placeholder="Cari prompt, topik, atau key…" className="pl-9" aria-label="Cari soal" />
        </div>
        <NativeSelect name="level" defaultValue={sp.level ?? ""} aria-label="Level">
          <option value="">Level</option>
          {(levels ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.code}
            </option>
          ))}
        </NativeSelect>
        {select("type", "Tipe", QUESTION_TYPES, TYPE_LABEL)}
        {select("category", "Kategori", SKILL_CATEGORIES)}
        {select("stage", "Stage", QUESTION_STAGES)}
        {select("status", "Status", ["draft", "in_review", "published", "archived"])}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      {canWrite && <BulkStatusBar resourceKey="questions" formId="qbank" />}
      {!rows?.length ? (
        <EmptyState title="Tidak ada soal" />
      ) : (
        <div id="qbank" className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {canWrite && <TableHead className="w-8" />}
                <TableHead>Prompt</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Kategori / topik</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>v</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id}>
                  {canWrite && (
                    <TableCell>
                      <input type="checkbox" data-bulk value={q.id} aria-label="Pilih soal" />
                    </TableCell>
                  )}
                  <TableCell className="max-w-96">
                    <p className="truncate font-medium">{q.prompt}</p>
                    <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{q.external_key ?? q.id}</p>
                  </TableCell>
                  <TableCell className="text-xs">{TYPE_LABEL[q.type]}</TableCell>
                  <TableCell>{(q.levels as { code: string } | null)?.code}</TableCell>
                  <TableCell className="max-w-48 truncate text-xs">
                    {q.category} · {q.topic}
                  </TableCell>
                  <TableCell className="text-xs">{q.stage}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[q.status]}>
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{q.version}</TableCell>
                  <TableCell>
                    <Link href={`/admin/questions/${q.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                      {canWrite ? "Edit" : "Lihat"}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/question-bank" params={{ q: sp.q, level: sp.level, type: sp.type, category: sp.category, stage: sp.stage, status: sp.status }} />
    </div>
  );
}
