import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requireViewer } from "@/lib/auth";
import { GRAMMAR_CATEGORY } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Grammar" };


export default async function GrammarPage({ searchParams }: { searchParams: Promise<{ q?: string; level?: string; category?: string }> }) {
  const sp = await searchParams;
  await requireViewer("/app/grammar");
  const supabase = await createClient();
  const q = (sp.q ?? "").trim().slice(0, 100);
  let query = supabase.from("grammar_topics").select("slug, title, category, keywords, levels(code, sort_order)").eq("status", "published").limit(200);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  if (sp.category) query = query.eq("category", sp.category as never);
  const [{ data: levels }, { data: topicsRaw }] = await Promise.all([supabase.from("levels").select("id, code").order("sort_order"), query]);
  let topics = topicsRaw ?? [];
  // Fallback: substring match on title/keywords when full-text finds nothing (e.g. partial words).
  if (q && !topics.length) {
    const like = q.replace(/[%,()]/g, "");
    const { data } = await supabase.from("grammar_topics").select("slug, title, category, keywords, levels(code, sort_order)").eq("status", "published").or(`title.ilike.%${like}%,explanation_md.ilike.%${like}%`).limit(100);
    topics = data ?? [];
  }
  if (sp.level) topics = topics.filter((t) => (t.levels as { code: string } | null)?.code === sp.level);
  topics.sort((a, b) => ((a.levels as { sort_order: number }).sort_order ?? 0) - ((b.levels as { sort_order: number }).sort_order ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Grammar reference" title="Grammar" description="Cari topik grammar berdasarkan kata kunci atau contoh kalimat, misalnya “have been”, “if I were”, atau “passive”." />
      <form className="flex flex-col gap-2 md:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Kata kunci atau contoh kalimat…" className="h-10 pl-9" aria-label="Cari grammar" />
        </div>
        <NativeSelect size="lg" name="level" defaultValue={sp.level ?? ""} aria-label="Level">
          <option value="">Semua level</option>
          {(levels ?? []).map((l) => (
            <option key={l.code}>{l.code}</option>
          ))}
        </NativeSelect>
        <NativeSelect size="lg" name="category" defaultValue={sp.category ?? ""} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {Object.entries(GRAMMAR_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" className="h-10">
          Cari
        </Button>
      </form>
      {!topics.length ? (
        <EmptyState title="Topik tidak ditemukan" description="Coba kata kunci lain atau hapus filter." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((t) => (
            <li key={t.slug}>
              <Link href={`/app/grammar/${t.slug}`} className="block h-full rounded-2xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm">
                <div className="flex items-center gap-2">
                  <Badge>{(t.levels as { code: string } | null)?.code}</Badge>
                  <Badge variant="outline">{GRAMMAR_CATEGORY[t.category] ?? t.category}</Badge>
                </div>
                <p className="mt-2 font-semibold">{t.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.keywords.join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
