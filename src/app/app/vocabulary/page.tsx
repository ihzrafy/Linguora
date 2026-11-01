import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { SpeakButton } from "@/components/learning/lesson-client";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AddWordDialog, CollectionDialog, ImportDialog, LearnButton, WordActions } from "./vocab-client";

export const metadata: Metadata = { title: "Vocabulary" };
const PAGE_SIZE = 24;

type SP = { tab?: string; q?: string; level?: string; topic?: string; page?: string; collection?: string; fav?: string };

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/vocabulary");
  const tab = sp.tab === "wordbook" ? "wordbook" : "dictionary";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data: levels } = await supabase.from("levels").select("id, code").order("sort_order");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vocabulary" title="Kosakata" description="Cari kata di kamus Linguora, simpan ke wordbook pribadi, dan biarkan spaced repetition menjadwalkan review-nya." actions={<AddWordDialog />} />
      <div className="flex gap-1 rounded-full border bg-card p-1 sm:w-fit" role="tablist">
        {[
          { key: "dictionary", label: "Kamus" },
          { key: "wordbook", label: "Wordbook saya" },
        ].map((t) => (
          <Link
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            href={`/app/vocabulary?tab=${t.key}`}
            className={cn("flex-1 rounded-full px-4 py-1.5 text-center text-sm font-medium whitespace-nowrap", tab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {tab === "dictionary" ? <Dictionary sp={sp} page={page} viewerId={viewer.id} levels={levels ?? []} /> : <Wordbook sp={sp} page={page} viewerId={viewer.id} />}
    </div>
  );
}

async function Dictionary({ sp, page, viewerId, levels }: { sp: SP; page: number; viewerId: string; levels: { id: string; code: string }[] }) {
  const supabase = await createClient();
  const q = (sp.q ?? "").trim().slice(0, 60);
  let query = supabase
    .from("vocabulary_entries")
    .select("id, word, part_of_speech, ipa, definition, meaning_id, examples, synonyms, antonyms, collocations, phrases, related_words, topic, levels(code)", { count: "exact" })
    .eq("status", "published")
    .order("word")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`word.ilike.%${q.replace(/[%,()]/g, "")}%,meaning_id.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const level = levels.find((l) => l.code === sp.level);
  if (level) query = query.eq("level_id", level.id);
  if (sp.topic) query = query.eq("topic", sp.topic);
  const [{ data: entries, count }, { data: mine }] = await Promise.all([query, supabase.from("user_vocabulary").select("entry_id").eq("user_id", viewerId).not("entry_id", "is", null)]);
  const owned = new Set((mine ?? []).map((m) => m.entry_id));

  return (
    <div className="space-y-5">
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <input type="hidden" name="tab" value="dictionary" />
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Cari kata atau arti…" className="h-10 pl-9" aria-label="Cari kosakata" />
        </div>
        <NativeSelect size="lg" name="level" defaultValue={sp.level ?? ""} aria-label="Filter level">
          <option value="">Semua level</option>
          {levels.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" className="h-10">
          Cari
        </Button>
      </form>
      {sp.topic && (
        <p className="text-sm">
          Topik: <Badge variant="secondary">{sp.topic}</Badge>{" "}
          <Link href={`/app/vocabulary?tab=dictionary&level=${sp.level ?? ""}`} className="text-primary underline">
            hapus filter
          </Link>
        </p>
      )}
      {!entries?.length ? (
        <EmptyState title="Kata tidak ditemukan" description="Coba kata kunci lain atau tambahkan kata sendiri ke wordbook." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => {
            const examples = (e.examples ?? []) as { en: string; id?: string }[];
            return (
              <Card key={e.id} className="gap-3 py-4">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1 text-lg font-semibold">
                        {e.word} <SpeakButton text={e.word} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.part_of_speech}
                        {e.ipa && ` · ${e.ipa}`} · {(e.levels as { code: string } | null)?.code}
                      </p>
                    </div>
                    <LearnButton entryId={e.id} inWordbook={owned.has(e.id)} />
                  </div>
                  <p className="font-medium">{e.meaning_id}</p>
                  <p className="text-sm text-muted-foreground">{e.definition}</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary">Detail</summary>
                    <div className="mt-2 space-y-1.5">
                      {examples.map((x, i) => (
                        <p key={i} className="italic">
                          “{x.en}”{x.id && <span className="not-italic text-muted-foreground"> — {x.id}</span>}
                        </p>
                      ))}
                      {[
                        ["Sinonim", e.synonyms],
                        ["Antonim", e.antonyms],
                        ["Kolokasi", e.collocations],
                        ["Frasa", e.phrases],
                        ["Kata terkait", e.related_words],
                      ].map(([label, list]) =>
                        (list as string[]).length ? (
                          <p key={label as string}>
                            <span className="font-medium">{label as string}:</span> {(list as string[]).join(", ")}
                          </p>
                        ) : null,
                      )}
                      {e.topic && (
                        <Link href={`/app/vocabulary?tab=dictionary&topic=${encodeURIComponent(e.topic)}`} className="text-xs text-primary underline">
                          Topik: {e.topic}
                        </Link>
                      )}
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/app/vocabulary" params={{ tab: "dictionary", q, level: sp.level, topic: sp.topic }} />
    </div>
  );
}

async function Wordbook({ sp, page, viewerId }: { sp: SP; page: number; viewerId: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("user_vocabulary")
    .select("id, custom_word, custom_meaning, custom_example, is_favorite, collection_id, added_at, vocabulary_entries(word, meaning_id, ipa, part_of_speech)", { count: "exact" })
    .eq("user_id", viewerId)
    .order("added_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.collection) query = query.eq("collection_id", sp.collection);
  if (sp.fav === "1") query = query.eq("is_favorite", true);
  const [{ data: words, count }, { data: collections }, { data: schedules }] = await Promise.all([
    query,
    supabase.from("vocabulary_collections").select("id, name").eq("user_id", viewerId).order("name"),
    supabase.from("review_schedules").select("item_id, mastery, due_at").eq("user_id", viewerId).eq("item_type", "user_vocabulary"),
  ]);
  const mastery = new Map((schedules ?? []).map((s) => [s.item_id, s]));
  const stats = { total: schedules?.length ?? 0, mastered: 0, review: 0, learning: 0, new: 0 } as Record<string, number>;
  (schedules ?? []).forEach((s) => (stats[s.mastery] = (stats[s.mastery] ?? 0) + 1));
  const due = (schedules ?? []).filter((s) => new Date(s.due_at) <= new Date()).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Total kata", stats.total],
          ["Dikuasai", stats.mastered],
          ["Review", stats.review],
          ["Dipelajari", stats.learning],
          ["Jatuh tempo", due],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card p-3">
            <p className="text-2xl font-bold tabular-nums">{value as number}</p>
            <p className="text-xs text-muted-foreground">{label as string}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={due ? "default" : "outline"}>
          <Link href="/app/review">Review sekarang</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/flashcards">Flashcards & kuis</Link>
        </Button>
        <CollectionDialog />
        <ImportDialog />
        <Button asChild variant="ghost">
          <a href="/app/vocabulary/export?format=csv">
            <Download /> CSV
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href="/app/vocabulary/export?format=json">
            <Download /> JSON
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 text-sm">
        <FilterLink href="/app/vocabulary?tab=wordbook" active={!sp.collection && sp.fav !== "1"}>
          Semua
        </FilterLink>
        <FilterLink href="/app/vocabulary?tab=wordbook&fav=1" active={sp.fav === "1"}>
          ★ Favorit
        </FilterLink>
        {(collections ?? []).map((c) => (
          <FilterLink key={c.id} href={`/app/vocabulary?tab=wordbook&collection=${c.id}`} active={sp.collection === c.id}>
            {c.name}
          </FilterLink>
        ))}
      </div>
      {!words?.length ? (
        <EmptyState title="Wordbook masih kosong" description="Tambahkan kata dari kamus, dari daftar kosakata di lesson, atau tulis kata sendiri." />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {words.map((w) => {
            const e = w.vocabulary_entries as { word: string; meaning_id: string; ipa: string | null; part_of_speech: string } | null;
            const s = mastery.get(w.id);
            return (
              <li key={w.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {e?.word ?? w.custom_word}
                    {s && <Badge variant="outline" className="capitalize">{s.mastery}</Badge>}
                    {!e && <Badge variant="secondary">kata sendiri</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {e?.meaning_id ?? w.custom_meaning}
                    {w.custom_example && <span className="italic"> · “{w.custom_example}”</span>}
                  </p>
                </div>
                <WordActions id={w.id} favorite={w.is_favorite} collectionId={w.collection_id} collections={collections ?? []} />
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/app/vocabulary" params={{ tab: "wordbook", collection: sp.collection, fav: sp.fav }} />
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("rounded-full border px-3 py-1", active ? "border-primary bg-primary/10 text-primary dark:text-brand-lavender" : "hover:bg-muted")}>
      {children}
    </Link>
  );
}
