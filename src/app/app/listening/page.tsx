import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Headphones } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { LISTENING_KIND_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Listening Lab" };

export default async function ListeningPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/listening");
  const supabase = await createClient();
  const [{ data: levels }, { data: unlocks }, { data: items }, { data: progress }] = await Promise.all([
    supabase.from("levels").select("code").order("sort_order"),
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id),
    supabase.from("listening_materials").select("id, slug, title, kind, audio_source, level_id, levels(code, sort_order)").eq("status", "published"),
    supabase.from("listening_progress").select("material_id, best_score, plays, completed_at").eq("user_id", viewer.id),
  ]);
  const open = new Set((unlocks ?? []).map((u) => u.level_id));
  const prog = new Map((progress ?? []).map((p) => [p.material_id, p]));
  const list = (items ?? [])
    .filter((m) => !sp.level || (m.levels as { code: string }).code === sp.level)
    .sort((a, b) => (a.levels as { sort_order: number }).sort_order - (b.levels as { sort_order: number }).sort_order);
  const completed = (progress ?? []).filter((p) => p.completed_at).length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Listening Lab" title="Listening" description={`Dialog, monolog, pengumuman, percakapan telepon, wawancara, dan materi gaya podcast. ${completed} materi sudah kamu selesaikan.`} />
      <div className="flex flex-wrap gap-1.5 text-sm">
        <Link href="/app/listening" className={cn("rounded-full border px-3 py-1", !sp.level ? "border-primary bg-primary/10" : "hover:bg-muted")}>
          Semua
        </Link>
        {(levels ?? []).map((l) => (
          <Link key={l.code} href={`/app/listening?level=${l.code}`} className={cn("rounded-full border px-3 py-1", sp.level === l.code ? "border-primary bg-primary/10" : "hover:bg-muted")}>
            {l.code}
          </Link>
        ))}
      </div>
      {!list.length ? (
        <EmptyState title="Belum ada materi" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => {
            const locked = !open.has(m.level_id);
            const p = prog.get(m.id);
            const body = (
              <div className={cn("flex h-full gap-3 rounded-2xl border bg-card p-4", locked ? "opacity-60" : "hover:border-primary/50")}>
                <Headphones className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{(m.levels as { code: string }).code}</Badge>
                    <Badge variant="outline">{LISTENING_KIND_LABEL[m.kind]}</Badge>
                    {locked && <Badge variant="secondary">Level terkunci</Badge>}
                  </div>
                  <p className="mt-2 font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.audio_source === "tts" ? "Text-to-speech" : "Audio"}
                    {p && ` · diputar ${p.plays}×`}
                    {p?.completed_at && (
                      <span className="ml-1 inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="size-3" /> {Number(p.best_score)}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
            return locked ? <div key={m.id}>{body}</div> : <Link key={m.id} href={`/app/listening/${m.slug}`}>{body}</Link>;
          })}
        </div>
      )}
    </div>
  );
}
