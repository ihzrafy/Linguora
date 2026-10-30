"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { scheduleItem } from "@/lib/learning/srs-server";
import { createClient } from "@/lib/supabase/server";

const bookmarkSchema = z.object({
  targetType: z.enum(["lesson", "grammar", "reading", "listening", "vocabulary", "question"]),
  targetId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  href: z.string().startsWith("/app/").max(300),
});

/** Adds or removes a bookmark. Returns the new state. */
export async function toggleBookmarkAction(input: z.input<typeof bookmarkSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = bookmarkSchema.parse(input);
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("target_type", data.targetType)
      .eq("target_id", data.targetId)
      .maybeSingle();
    if (existing) {
      await supabase.from("bookmarks").delete().eq("id", existing.id);
      revalidatePath("/app/bookmarks");
      return { bookmarked: false };
    }
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: viewer.id, target_type: data.targetType, target_id: data.targetId, title: data.title, href: data.href });
    if (error) throw new ActionError("Bookmark gagal disimpan.");
    revalidatePath("/app/bookmarks");
    return { bookmarked: true };
  });
}

const customWordSchema = z.object({
  word: z.string().trim().min(1, "Masukkan kata.").max(80),
  meaning: z.string().trim().min(1, "Masukkan arti.").max(280),
  example: z.string().trim().max(400).optional(),
  collectionId: z.uuid().nullable().optional(),
});

/** Saves a word to the personal wordbook (links to the dictionary entry when one exists). */
export async function saveWordAction(input: z.input<typeof customWordSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = customWordSchema.parse(input);
    const supabase = await createClient();
    const { data: entry } = await supabase.from("vocabulary_entries").select("id").ilike("word", data.word).eq("status", "published").limit(1).maybeSingle();
    const row = {
      user_id: viewer.id,
      entry_id: entry?.id ?? null,
      custom_word: entry ? null : data.word,
      custom_meaning: entry ? null : data.meaning,
      custom_example: entry ? null : (data.example ?? null),
      collection_id: data.collectionId ?? null,
    };
    const { data: saved, error } = await supabase.from("user_vocabulary").insert(row).select("id").single();
    if (error?.code === "23505") throw new ActionError("Kata ini sudah ada di wordbook kamu.", "conflict");
    if (error || !saved) throw new ActionError("Kata gagal disimpan.");
    await scheduleItem(viewer.id, "user_vocabulary", saved.id);
    revalidatePath("/app/vocabulary");
    return undefined;
  });
}
