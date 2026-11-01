"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { initials } from "@/components/layout/user-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { changePasswordAction, deleteAccountAction, updateAvatarAction, updatePreferencesAction, updateProfileAction } from "./actions";

/** Lets a number field be cleared while typing; snaps into range when the field loses focus. */
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n) || min));

export function ProfileForm({ userId, initial }: { userId: string; initial: { displayName: string; username: string; bio: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return void toast.error("Format gambar harus PNG, JPG, atau WebP.");
    if (file.size > 2 * 1024 * 1024) return void toast.error("Ukuran maksimal 2 MB.");
    setUploading(true);
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type }); // unique path: no upsert (that would need a SELECT policy)
    if (error) {
      setUploading(false);
      return void toast.error("Unggah gagal.");
    }
    const res = await updateAvatarAction(path);
    setUploading(false);
    if (!res.ok) return void toast.error(res.error);
    setForm((f) => ({ ...f, avatarUrl: res.data.url }));
    router.refresh();
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateProfileAction({ displayName: form.displayName, username: form.username, bio: form.bio });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Profil disimpan");
          router.refresh();
        });
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {form.avatarUrl && <AvatarImage src={form.avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(form.displayName)}</AvatarFallback>
        </Avatar>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Ganti foto
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {form.avatarUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={async () => (await updateAvatarAction(null), setForm((f) => ({ ...f, avatarUrl: null })), router.refresh())}>
            Hapus foto
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nama tampilan</Label>
          <Input id="p-name" maxLength={60} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-username">Username</Label>
          <Input id="p-username" maxLength={24} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-bio">Bio</Label>
        <Textarea id="p-bio" maxLength={280} rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Simpan profil
      </Button>
    </form>
  );
}

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Amsterdam", "America/New_York", "America/Los_Angeles", "UTC"];

export function PreferencesForm({
  initial,
  tracks,
}: {
  initial: { timezone: string; dailyGoalXp: number; dailyGoalMinutes: number; trackSlug: string | null; leaderboardOptIn: boolean; learningGoal: string | null };
  tracks: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const zones = TIMEZONES.includes(f.timezone) ? TIMEZONES : [f.timezone, ...TIMEZONES];
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updatePreferencesAction({ ...f, learningGoal: f.learningGoal as never });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Pengaturan disimpan");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tz">Zona waktu</Label>
          <NativeSelect id="tz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Dipakai untuk menghitung streak dan target harian.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="track">Learning track</Label>
          <NativeSelect id="track" value={f.trackSlug ?? ""} onChange={(e) => setF({ ...f, trackSlug: e.target.value || null })}>
            <option value="">—</option>
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="xp-goal">Target XP harian</Label>
          <Input id="xp-goal" type="number" min={10} max={500} step={5} value={f.dailyGoalXp || ""}
            onChange={(e) => setF({ ...f, dailyGoalXp: Number(e.target.value) })}
            onBlur={() => setF((cur) => ({ ...cur, dailyGoalXp: clamp(cur.dailyGoalXp, 10, 500) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min-goal">Target menit harian</Label>
          <Input id="min-goal" type="number" min={5} max={240} step={5} value={f.dailyGoalMinutes || ""}
            onChange={(e) => setF({ ...f, dailyGoalMinutes: Number(e.target.value) })}
            onBlur={() => setF((cur) => ({ ...cur, dailyGoalMinutes: clamp(cur.dailyGoalMinutes, 5, 240) }))}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <Label htmlFor="lb" className="flex flex-col items-start gap-1">
          <span>Tampil di leaderboard</span>
          <span className="text-xs font-normal text-muted-foreground">Hanya nama tampilan, username, dan XP yang terlihat oleh pengguna lain.</span>
        </Label>
        <Switch id="lb" checked={f.leaderboardOptIn} onCheckedChange={(v) => setF({ ...f, leaderboardOptIn: v })} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Simpan pengaturan
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await changePasswordAction(f);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Password diperbarui");
          setF({ current: "", next: "", confirm: "" });
        });
      }}
    >
      <Input type="password" autoComplete="current-password" aria-label="Password saat ini" placeholder="Password saat ini" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
      <Input type="password" autoComplete="new-password" aria-label="Password baru" placeholder="Password baru" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
      <Input type="password" autoComplete="new-password" aria-label="Ulangi password baru" placeholder="Ulangi password baru" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
      <Button type="submit" disabled={pending} className="sm:w-fit">
        {pending && <Loader2 className="animate-spin" />} Ganti password
      </Button>
    </form>
  );
}

export function DeleteAccount() {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Hapus akun
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus akun secara permanen?</DialogTitle>
          <DialogDescription>Profil, progres, XP, jawaban, tulisan, rekaman, catatan, dan sertifikat internal akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="del">Ketik HAPUS untuk konfirmasi</Label>
        <Input id="del" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <Button
          variant="destructive"
          disabled={text !== "HAPUS" || pending}
          onClick={() =>
            start(async () => {
              const res = await deleteAccountAction(text);
              if (res && !res.ok) toast.error(res.error);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Hapus akun saya
        </Button>
      </DialogContent>
    </Dialog>
  );
}
