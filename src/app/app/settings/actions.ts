"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, assertViewer } from "@/lib/auth";
import { clientIp, rateLimit, runAction } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { passwordSchema, usernameSchema } from "@/lib/validation";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Nama wajib diisi.").max(60),
  username: usernameSchema,
  bio: z.string().trim().max(280).optional(),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = profileSchema.parse(input);
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ display_name: data.displayName, username: data.username, bio: data.bio || null }).eq("id", viewer.id);
    if (error?.code === "23505") throw new ActionError("Username sudah dipakai.", "conflict");
    if (error) throw new ActionError("Profil gagal disimpan.");
    revalidatePath("/app", "layout");
    return undefined;
  });
}

export async function updateAvatarAction(path: string | null) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const supabase = await createClient();
    let url: string | null = null;
    if (path) {
      if (!path.startsWith(`${viewer.id}/`)) throw new ActionError("Lokasi berkas tidak valid.", "forbidden");
      url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", viewer.id);
    revalidatePath("/app", "layout");
    return { url };
  });
}

const prefSchema = z.object({
  timezone: z.string().max(64),
  dailyGoalXp: z.number().int().min(10).max(500),
  dailyGoalMinutes: z.number().int().min(5).max(240),
  trackSlug: z.string().max(60).nullable(),
  leaderboardOptIn: z.boolean(),
  learningGoal: z.enum(["daily", "academic", "business", "career", "travel", "exam"]).nullable(),
});

export async function updatePreferencesAction(input: z.input<typeof prefSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    const data = prefSchema.parse(input);
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.timezone });
    } catch {
      throw new ActionError("Zona waktu tidak valid.");
    }
    const supabase = await createClient();
    const { data: track } = data.trackSlug ? await supabase.from("learning_tracks").select("id").eq("slug", data.trackSlug).maybeSingle() : { data: null };
    const { error } = await supabase
      .from("profiles")
      .update({
        timezone: data.timezone,
        daily_goal_xp: data.dailyGoalXp,
        daily_goal_minutes: data.dailyGoalMinutes,
        active_track_id: track?.id ?? null,
        leaderboard_opt_in: data.leaderboardOptIn,
        learning_goal: data.learningGoal,
      })
      .eq("id", viewer.id);
    if (error) throw new ActionError("Pengaturan gagal disimpan.");
    revalidatePath("/app", "layout");
    return undefined;
  });
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, "Masukkan password saat ini."), next: passwordSchema, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { message: "Konfirmasi password tidak sama.", path: ["confirm"] });

export async function changePasswordAction(input: z.input<typeof passwordChangeSchema>) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`password:${viewer.id}`, 5, 3600);
    const data = passwordChangeSchema.parse(input);
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: viewer.email!, password: data.current });
    if (authError) throw new ActionError("Password saat ini salah.");
    const { error } = await supabase.auth.updateUser({ password: data.next });
    if (error) throw new ActionError(error.code === "same_password" ? "Gunakan password yang berbeda." : "Password gagal diperbarui.");
    return undefined;
  });
}

/** Permanently deletes the account and all learning data (cascades from auth.users). */
export async function deleteAccountAction(confirmation: string) {
  const result = await runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`delete:${await clientIp()}`, 5, 3600);
    if (confirmation.trim() !== "HAPUS") throw new ActionError('Ketik "HAPUS" untuk konfirmasi.');
    const admin = createAdminClient();
    for (const bucket of ["avatars", "recordings"]) {
      const { data: files } = await admin.storage.from(bucket).list(viewer.id, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${viewer.id}/${f.name}`));
    }
    await admin.from("audit_logs").insert({ actor_id: null, action: "account_deleted", entity_type: "profiles", entity_id: viewer.id, metadata: { self_service: true } });
    const { error } = await admin.auth.admin.deleteUser(viewer.id);
    if (error) throw new ActionError("Akun gagal dihapus. Hubungi kami.");
    const supabase = await createClient();
    await supabase.auth.signOut();
    return undefined;
  });
  if (result.ok) redirect("/?accountDeleted=1");
  return result;
}
