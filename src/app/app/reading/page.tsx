import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { GENRE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reading Lab" };

export default async function ReadingPage({ searchParams }: { searchParams: Promise<{ level?: string; genre?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/reading");
  const supabase = await createClient();
  const [{ data: levels }, { data: unlocks }, { data: passages }, { data: history }] = await Promise.all([
    supabase.from("levels").select("id, code").order("sort_order"),
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id),
    supabase.from("reading_passages").select("id, slug, title, genre, word_count, estimated_minutes, level_id, levels(code, sort_order)").eq("status", "published"),
    supabase.from("reading_progress").select("passage_id, best_score, time_spent_seconds, completed_at, last_read_at").eq("user_id", viewer.id).order("last_read_at", { ascending: false }),
  ]);
  const open = new Set((unlocks ?? []).map((u) => u.level_id));
  const done = new Map((history ?? []).map((h) => [h.passage_id, h]));
  const list = (passages ?? [])
    .filter((p) => !sp.level || (p.levels as { code: string }).code === sp.level)
    .filter((p) => !sp.genre || p.genre === sp.genre)
    .sort((a, b) => (a.levels as { sort_order: number }).sort_order - (b.levels as { sort_order: number }).sort_order);
  const recent = (history ?? []).slice(0, 5).map((h) => ({ ...h, passage: passages?.find((p) => p.id === h.passage_id) }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Reading Lab" title="Reading" description="Artikel, cerita, email, berita, dan teks akademik sesuai level — dengan kosakata yang disorot, click-to-translate, dan kuis pemahaman." />
      <div className="flex flex-wrap gap-1.5 text-sm">
        <Chip href="/app/reading" active={!sp.level && !sp.genre}>
          Semua
        </Chip>
        {(levels ?? []).map((l) => (
          <Chip key={l.code} href={`/app/reading?level=${l.code}`} active={sp.level === l.code}>
            {l.code}
          </Chip>
        ))}
        <span className="mx-1 border-l" />
        {Object.entries(GENRE_LABEL).map(([k, v]) => (
          <Chip key={k} href={`/app/reading?genre=${k}${sp.level ? `&level=${sp.level}` : ""}`} active={sp.genre === k}>
            {v}
          </Chip>
        ))}
      </div>
      {!list.length ? (
        <EmptyState title="Belum ada bacaan untuk filter ini" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const locked = !open.has(p.level_id);
            const progress = done.get(p.id);
            const card = (
              <div className={cn("h-full rounded-2xl border bg-card p-4 transition", locked ? "opacity-60" : "hover:border-primary/50 hover:shadow-sm")}>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{(p.levels as { code: string }).code}</Badge>
                  <Badge variant="outline">{GENRE_LABEL[p.genre]}</Badge>
                  {locked && <Badge variant="secondary">Level terkunci</Badge>}
                </div>
                <p className="mt-2 font-semibold">{p.title}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> ±{p.estimated_minutes} menit
                  </span>
                  <span>{p.word_count} kata</span>
                  {progress?.completed_at && (
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="size-3" /> {Number(progress.best_score)}%
                    </span>
                  )}
                </p>
              </div>
            );
            return locked ? <div key={p.id}>{card}</div> : <Link key={p.id} href={`/app/reading/${p.slug}`}>{card}</Link>;
          })}
        </div>
      )}
      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Riwayat membaca</h2>
          <ul className="divide-y rounded-2xl border bg-card text-sm">
            {recent.map((h) => (
              <li key={h.passage_id} className="flex items-center justify-between gap-2 p-3">
                <Link href={`/app/reading/${h.passage?.slug}`} className="font-medium hover:underline">
                  {h.passage?.title}
                </Link>
                <span className="text-muted-foreground">
                  {h.best_score !== null ? `skor ${Number(h.best_score)}% · ` : ""}
                  {Math.round(h.time_spent_seconds / 60)} menit
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("rounded-full border px-3 py-1", active ? "border-primary bg-primary/10 text-primary dark:text-brand-lavender" : "hover:bg-muted")}>
      {children}
    </Link>
  );
}
