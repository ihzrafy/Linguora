"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, assertPermission } from "@/lib/auth";
import { runAction } from "@/lib/actions";
import { getResource, type FieldDef } from "@/lib/admin/resources";
import { createClient } from "@/lib/supabase/server";

function fieldSchema(f: FieldDef): z.ZodType {
  const opt = (s: z.ZodType) => (f.required ? s : s.optional().nullable());
  switch (f.kind) {
    case "number": {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      return f.required ? n : z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), n.nullable());
    }
    case "boolean":
      return z.boolean().default(false);
    case "lines":
      return z.preprocess((v) => (typeof v === "string" ? v.split("\n").map((s) => s.trim()).filter(Boolean) : v), z.array(z.string().max(500)).max(200));
    case "json":
      return z.preprocess((v) => {
        if (typeof v !== "string") return v;
        if (!v.trim()) return f.required ? undefined : null;
        try {
          return JSON.parse(v);
        } catch {
          return Symbol("invalid");
        }
      }, f.required ? z.any().refine((v) => v !== undefined && typeof v !== "symbol", `${f.label}: JSON tidak valid.`) : z.any().refine((v) => typeof v !== "symbol", `${f.label}: JSON tidak valid.`));
    case "select": {
      const s = z.string().min(1, `${f.label} wajib dipilih.`);
      return f.required ? s : z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional());
    }
    case "date":
      return z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional());
    default: {
      let s = z.string().trim();
      if (f.required) s = s.min(1, `${f.label} wajib diisi.`);
      if (f.max) s = s.max(f.max, `${f.label} maksimal ${f.max} karakter.`);
      if (f.name === "slug") s = s.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung.");
      return f.required ? s : z.preprocess((v) => (v === "" ? null : v), opt(s));
    }
  }
}

export async function saveResourceAction(resourceKey: string, id: string | null, values: Record<string, unknown>) {
  return runAction(async () => {
    const def = getResource(resourceKey);
    await assertPermission(def.writePermission);
    const fields = def.fields.filter((f) => !(id && f.immutable));
    const schema = z.object(Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)])));
    const data = schema.parse(values) as Record<string, unknown>;
    if (def.table === "writing_prompts" && Number(data.max_words) <= Number(data.min_words)) throw new ActionError("Maksimal kata harus lebih besar dari minimal kata.");
    const hasPublishedAt = def.fields.some((f) => f.name === "published_at") || def.table === "courses";
    if (hasPublishedAt && data.status === "published" && !data.published_at) data.published_at = new Date().toISOString();
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from(def.table as any) as any;
    const idCol = def.idColumn ?? "id";
    const res = id ? await table.update(data).eq(idCol, id).select(idCol).single() : await table.insert(data).select(idCol).single();
    if (res.error) {
      if (res.error.code === "23505") throw new ActionError("Data dengan nilai unik yang sama sudah ada (slug/key/urutan).", "conflict");
      if (res.error.code === "42501" || /permission|row-level/i.test(res.error.message)) throw new ActionError(res.error.message.includes("reviewer") ? res.error.message : "Kamu tidak memiliki izin untuk perubahan ini.", "forbidden");
      throw new ActionError(res.error.message);
    }
    revalidatePath(def.path.split("?")[0]);
    return { id: res.data[idCol] as string };
  });
}

export async function deleteResourceAction(resourceKey: string, id: string) {
  return runAction(async () => {
    const def = getResource(resourceKey);
    if (!def.deletable) throw new ActionError("Data ini tidak dapat dihapus.", "forbidden");
    await assertPermission("content.delete");
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(def.table as any) as any).delete().eq(def.idColumn ?? "id", z.uuid().parse(id));
    if (error) throw new ActionError(error.code === "23503" ? "Data masih dipakai oleh data lain, tidak dapat dihapus. Arsipkan saja." : error.message);
    revalidatePath(def.path.split("?")[0]);
    return undefined;
  });
}

/** Bulk status change for resources with a status column. */
export async function bulkStatusAction(resourceKey: string, ids: string[], status: "draft" | "in_review" | "published" | "archived") {
  return runAction(async () => {
    const def = getResource(resourceKey);
    if (!def.hasStatus) throw new ActionError("Resource ini tidak memiliki status.");
    await assertPermission(status === "published" ? "content.publish" : "content.write");
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(def.table as any) as any).update({ status }).in("id", z.array(z.uuid()).max(200).parse(ids));
    if (error) throw new ActionError(error.message);
    revalidatePath(def.path.split("?")[0]);
    return { count: ids.length };
  });
}
