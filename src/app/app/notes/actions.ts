"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  id: z.uuid().nullable(),
  kind: z.enum(["note", "journal"]),
  title: z.string().trim().max(150),
  body: z.string().max(20_000),
  mood: z.enum(["😀", "🙂", "😐", "😕", "😫"]).nullable().optional(),
});

export async function saveNoteAction(input: z.input<typeof noteSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = noteSchema.parse(input);
    if (!data.title && !data.body.trim()) throw new ActionError("Catatan masih kosong.");
    const supabase = await createClient();
    const row = { kind: data.kind, title: data.title, body: data.body, mood: data.mood ?? null };
    const { error } = data.id
      ? await supabase.from("notes").update(row).eq("id", data.id).eq("user_id", viewer.id)
      : await supabase.from("notes").insert({ ...row, user_id: viewer.id });
    if (error) throw new ActionError("Catatan gagal disimpan.");
    revalidatePath("/app/notes");
    return undefined;
  });
}

export async function deleteNoteAction(id: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    await supabase.from("notes").delete().eq("id", z.uuid().parse(id)).eq("user_id", viewer.id);
    revalidatePath("/app/notes");
    return undefined;
  });
}
