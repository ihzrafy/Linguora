import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Mic } from "lucide-react";
import { SpeakingRecorder } from "@/components/learning/speaking-recorder";
import { Markdown } from "@/components/shared/markdown";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DeleteSessionButton } from "./delete-button";

export const metadata: Metadata = { title: "Speaking Lab" };

const KIND: Record<string, string> = { guided: "Terpandu", role_play: "Role-play", situation: "Situasi", pronunciation: "Pronunciation" };

export default async function SpeakingPage({ searchParams }: { searchParams: Promise<{ prompt?: string; level?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/speaking");
  const supabase = await createClient();
  const [{ data: levels }, { data: unlocks }, { data: prompts }, { data: sessions }] = await Promise.all([
    supabase.from("levels").select("code").order("sort_order"),
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id),
    supabase.from("speaking_prompts").select("id, slug, title, kind, prompt_md, target_phrases, sample_answer, tips, level_id, levels(code, sort_order)").eq("status", "published"),
    supabase.from("speaking_sessions").select("id, created_at, transcript, word_count, matched_phrases, duration_seconds, audio_path, self_rating, reflection, speaking_prompts(title)").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const open = new Set((unlocks ?? []).map((u) => u.level_id));
  const selected = prompts?.find((p) => p.slug === sp.prompt && open.has(p.level_id));
  const signed = await Promise.all(
    (sessions ?? []).map(async (s) => (s.audio_path ? (await supabase.storage.from("recordings").createSignedUrl(s.audio_path, 3600)).data?.signedUrl ?? null : null)),
  );

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/app/speaking" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Speaking Lab
        </Link>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Badge>{(selected.levels as { code: string }).code}</Badge>
            <Badge variant="outline">{KIND[selected.kind]}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{selected.title}</h1>
        </div>
        <Card>
          <CardContent className="space-y-3">
            <Markdown>{selected.prompt_md}</Markdown>
            <div className="rounded-xl bg-accent/50 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <Lightbulb className="size-4" /> Tips
              </p>
              <ul className="list-disc space-y-0.5 pl-5">
                {selected.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SpeakingRecorder userId={viewer.id} promptId={selected.id} mode={selected.kind === "pronunciation" ? "pronunciation" : "speaking"} targetPhrases={selected.target_phrases} />
          </CardContent>
        </Card>
        {selected.sample_answer && (
          <details className="rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer font-medium">Lihat contoh jawaban (setelah mencoba)</summary>
            <p className="mt-2 text-sm text-muted-foreground">{selected.sample_answer}</p>
          </details>
        )}
      </div>
    );
  }

  const list = (prompts ?? [])
    .filter((p) => !sp.level || (p.levels as { code: string }).code === sp.level)
    .sort((a, b) => (a.levels as { sort_order: number }).sort_order - (b.levels as { sort_order: number }).sort_order);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Speaking Lab" title="Speaking" description="Latihan berbicara terpandu, role-play, dan situasi nyata. Rekam suaramu, lihat transkrip speech recognition (jika browser mendukung), lalu refleksikan." />
      <div className="flex flex-wrap gap-1.5 text-sm">
        <Link href="/app/speaking" className={cn("rounded-full border px-3 py-1", !sp.level ? "border-primary bg-primary/10" : "hover:bg-muted")}>
          Semua
        </Link>
        {(levels ?? []).map((l) => (
          <Link key={l.code} href={`/app/speaking?level=${l.code}`} className={cn("rounded-full border px-3 py-1", sp.level === l.code ? "border-primary bg-primary/10" : "hover:bg-muted")}>
            {l.code}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const locked = !open.has(p.level_id);
          const body = (
            <div className={cn("h-full rounded-2xl border bg-card p-4", locked ? "opacity-60" : "hover:border-primary/50")}>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{(p.levels as { code: string }).code}</Badge>
                <Badge variant="outline">{KIND[p.kind]}</Badge>
                {locked && <Badge variant="secondary">Level terkunci</Badge>}
              </div>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                <Mic className="size-4 text-primary" /> {p.title}
              </p>
            </div>
          );
          return locked ? <div key={p.id}>{body}</div> : <Link key={p.id} href={`/app/speaking?prompt=${p.slug}`}>{body}</Link>;
        })}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Riwayat speaking</h2>
        {!sessions?.length ? (
          <EmptyState title="Belum ada sesi" description="Pilih prompt di atas untuk mulai berlatih." className="py-8" />
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <Card key={s.id} className="py-4">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-sm">
                    {(s.speaking_prompts as { title: string } | null)?.title ?? "Latihan bebas"} · {new Date(s.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </CardTitle>
                  <DeleteSessionButton id={s.id} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.transcript && <p className="text-muted-foreground">“{s.transcript}”</p>}
                  <p className="text-xs text-muted-foreground">
                    {s.word_count} kata
                    {s.duration_seconds ? ` · ${s.duration_seconds} detik` : ""}
                    {s.matched_phrases.length ? ` · frasa target: ${s.matched_phrases.join(", ")}` : ""}
                  </p>
                  {signed[i] && <audio src={signed[i]!} controls preload="none" className="w-full" />}
                  {s.reflection && <p className="text-xs">Refleksi: {s.reflection}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
