import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PronunciationDrill } from "./drill";

export const metadata: Metadata = { title: "Pronunciation" };

export default async function PronunciationPage() {
  const viewer = await requireViewer("/app/pronunciation");
  const supabase = await createClient();
  const levelId = viewer.profile.current_level_id;
  const { data: words } = levelId
    ? await supabase.from("vocabulary_entries").select("word, ipa, meaning_id, examples").eq("level_id", levelId).eq("status", "published").not("ipa", "is", null).limit(200)
    : { data: [] };
  const items = (words ?? []).map((w) => ({ word: w.word, ipa: w.ipa, meaning: w.meaning_id, example: ((w.examples ?? []) as { en: string }[])[0]?.en ?? null }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pronunciation"
        title="Latihan Pelafalan"
        description="Dengarkan model pelafalan (text-to-speech), lihat IPA, lalu ucapkan kata dan kalimatnya. Speech recognition menunjukkan kata apa yang ditangkap browser — ini membantu, tetapi bukan penilaian pronunciation profesional."
      />
      {items.length ? <PronunciationDrill userId={viewer.id} items={items} /> : <EmptyState title="Belum ada kata dengan IPA di level kamu" />}
    </div>
  );
}
