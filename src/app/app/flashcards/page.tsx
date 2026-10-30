import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FlashcardTrainer, type DeckItem } from "./trainer";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ deck?: string }> }) {
  const { deck = "wordbook" } = await searchParams;
  const viewer = await requireViewer("/app/flashcards");
  const supabase = await createClient();
  const { data: levels } = await supabase.from("levels").select("id, code").order("sort_order");
  let items: DeckItem[] = [];

  if (deck === "wordbook") {
    const { data } = await supabase
      .from("user_vocabulary")
      .select("custom_word, custom_meaning, custom_example, vocabulary_entries(word, meaning_id, ipa, examples)")
      .eq("user_id", viewer.id)
      .limit(500);
    items = (data ?? []).map((r) => {
      const e = r.vocabulary_entries as { word: string; meaning_id: string; ipa: string | null; examples: { en: string }[] } | null;
      return { word: e?.word ?? r.custom_word ?? "", meaning: e?.meaning_id ?? r.custom_meaning ?? "", ipa: e?.ipa ?? null, example: e?.examples?.[0]?.en ?? r.custom_example };
    });
  } else {
    const level = levels?.find((l) => l.code === deck.toUpperCase());
    if (level) {
      const { data } = await supabase.from("vocabulary_entries").select("word, meaning_id, ipa, examples").eq("level_id", level.id).eq("status", "published").limit(500);
      items = (data ?? []).map((e) => ({ word: e.word, meaning: e.meaning_id, ipa: e.ipa, example: ((e.examples ?? []) as { en: string }[])[0]?.en ?? null }));
    }
  }
  // Distinct meanings are required for multiple-choice and matching modes.
  const seen = new Set<string>();
  items = items.filter((i) => i.word && i.meaning && !seen.has(i.meaning) && seen.add(i.meaning));

  const decks = [{ key: "wordbook", label: "Wordbook saya" }, ...(levels ?? []).map((l) => ({ key: l.code.toLowerCase(), label: `Dek ${l.code}` }))];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vocabulary" title="Flashcards" description="Latih kosakata dengan flip card, pilihan ganda, latihan ejaan, dan mencocokkan kata." />
      <div className="flex flex-wrap gap-1.5">
        {decks.map((d) => (
          <Link key={d.key} href={`/app/flashcards?deck=${d.key}`} className={cn("rounded-full border px-3 py-1 text-sm", deck === d.key ? "border-primary bg-primary/10 text-primary dark:text-brand-lavender" : "hover:bg-muted")}>
            {d.label}
          </Link>
        ))}
      </div>
      {items.length >= 4 ? (
        <FlashcardTrainer deck={items} />
      ) : (
        <EmptyState
          title="Dek ini belum cukup kata"
          description="Minimal 4 kata dibutuhkan. Tambahkan kata ke wordbook atau pilih dek level."
          action={
            <Button asChild>
              <Link href="/app/vocabulary">Buka kamus</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
