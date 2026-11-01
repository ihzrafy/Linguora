"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { scheduleItem } from "@/lib/learning/srs-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

/** Adds a dictionary entry to the wordbook and schedules it for spaced repetition. */
export async function learnEntryAction(entryId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    const { data, error } = await supabase.from("user_vocabulary").insert({ user_id: viewer.id, entry_id: uuid.parse(entryId) }).select("id").single();
    if (error?.code === "23505") throw new ActionError("Kata ini sudah ada di wordbook kamu.", "conflict");
    if (error || !data) throw new ActionError("Gagal menambahkan kata.");
    await scheduleItem(viewer.id, "user_vocabulary", data.id);
    revalidatePath("/app/vocabulary");
    return undefined;
  });
}

export async function toggleFavoriteAction(id: string, favorite: boolean) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    await supabase.from("user_vocabulary").update({ is_favorite: favorite }).eq("id", uuid.parse(id)).eq("user_id", viewer.id);
    revalidatePath("/app/vocabulary");
    return undefined;
  });
}

export async function removeWordAction(id: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    const wordId = uuid.parse(id);
    const { data: removed } = await supabase.from("user_vocabulary").delete().eq("id", wordId).eq("user_id", viewer.id).select("id");
    // Its review card would otherwise stay due in the review queue and the counters.
    if (removed?.length) await createAdminClient().from("review_schedules").delete().eq("user_id", viewer.id).eq("item_type", "user_vocabulary").eq("item_id", wordId);
    revalidatePath("/app/vocabulary");
    revalidatePath("/app/review");
    return undefined;
  });
}

export async function createCollectionAction(name: string, description?: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = z.object({ name: z.string().trim().min(1, "Nama koleksi wajib diisi.").max(60), description: z.string().trim().max(280).optional() }).parse({ name, description });
    const supabase = await createClient();
    const { error } = await supabase.from("vocabulary_collections").insert({ user_id: viewer.id, ...data });
    if (error?.code === "23505") throw new ActionError("Koleksi dengan nama ini sudah ada.", "conflict");
    if (error) throw new ActionError("Gagal membuat koleksi.");
    revalidatePath("/app/vocabulary");
    return undefined;
  });
}

export async function moveToCollectionAction(id: string, collectionId: string | null) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_vocabulary")
      .update({ collection_id: collectionId ? uuid.parse(collectionId) : null })
      .eq("id", uuid.parse(id))
      .eq("user_id", viewer.id);
    if (error) throw new ActionError("Gagal memindahkan kata.");
    revalidatePath("/app/vocabulary");
    return undefined;
  });
}

const importRow = z.object({
  word: z.string().trim().min(1).max(80),
  meaning: z.string().trim().min(1).max(280),
  example: z.string().trim().max(400).optional(),
});

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Imports words from CSV (word,meaning,example) or a JSON array. Invalid rows are reported, not silently dropped. */
export async function importWordsAction(text: string, format: "csv" | "json") {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`vocab-import:${viewer.id}`, 10, 3600);
    if (text.length > 200_000) throw new ActionError("Berkas terlalu besar (maks. 200 KB).");
    let rows: unknown[] = [];
    if (format === "json") {
      try {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new ActionError("JSON tidak valid.");
      }
    } else {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const header = parseCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
      const hasHeader = header.includes("word");
      rows = (hasHeader ? lines.slice(1) : lines).map((l) => {
        const cells = parseCsvLine(l);
        return { word: cells[0], meaning: cells[1], example: cells[2] || undefined };
      });
    }
    if (rows.length > 500) throw new ActionError("Maksimal 500 kata per impor.");
    const valid: z.infer<typeof importRow>[] = [];
    const errors: string[] = [];
    rows.forEach((r, i) => {
      const p = importRow.safeParse(r);
      if (p.success) valid.push(p.data);
      else errors.push(`Baris ${i + 1}: ${p.error.issues[0]?.message}`);
    });
    const supabase = await createClient();
    let added = 0;
    let skipped = 0;
    for (const row of valid) {
      const { data, error } = await supabase
        .from("user_vocabulary")
        .insert({ user_id: viewer.id, custom_word: row.word, custom_meaning: row.meaning, custom_example: row.example ?? null })
        .select("id")
        .single();
      if (error) {
        skipped++;
        continue;
      }
      added++;
      await scheduleItem(viewer.id, "user_vocabulary", data.id);
    }
    revalidatePath("/app/vocabulary");
    return { added, skipped, errors: errors.slice(0, 20) };
  });
}
