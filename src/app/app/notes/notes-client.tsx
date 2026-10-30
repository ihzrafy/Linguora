"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { deleteNoteAction, saveNoteAction } from "./actions";

type Note = { id: string; kind: "note" | "journal"; title: string; body: string; mood: string | null; updated_at: string };
const MOODS = ["😀", "🙂", "😐", "😕", "😫"] as const;

export function NotesBoard({ notes, kind }: { notes: Note[]; kind: "note" | "journal" }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", body: "", mood: null as string | null });
  const [pending, start] = useTransition();
  const reset = () => {
    setEditing(null);
    setForm({ title: "", body: "", mood: null });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <form
        className="space-y-3 rounded-2xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await saveNoteAction({ id: editing?.id ?? null, kind, title: form.title, body: form.body, mood: (form.mood as (typeof MOODS)[number]) ?? null });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Tersimpan");
            reset();
            router.refresh();
          });
        }}
      >
        <p className="font-semibold">{editing ? "Edit" : kind === "journal" ? "Jurnal baru" : "Catatan baru"}</p>
        <Input aria-label="Judul" placeholder={kind === "journal" ? "Apa yang kupelajari hari ini?" : "Judul catatan"} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        {kind === "journal" && (
          <div className="flex gap-1" role="radiogroup" aria-label="Perasaan hari ini">
            {MOODS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={form.mood === m} onClick={() => setForm({ ...form, mood: m })} className={cn("rounded-lg border px-2 py-1 text-lg", form.mood === m && "border-primary bg-primary/10")}>
                {m}
              </button>
            ))}
          </div>
        )}
        <Textarea aria-label="Isi" rows={8} maxLength={20000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={kind === "journal" ? "Refleksi: apa yang mudah, apa yang sulit, apa rencana besok?" : "Tulis catatanmu…"} />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Simpan
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={reset}>
              Batal
            </Button>
          )}
        </div>
      </form>
      <ul className="space-y-3">
        {notes.length === 0 && <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada {kind === "journal" ? "jurnal" : "catatan"}.</li>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {n.mood && <span className="mr-1">{n.mood}</span>}
                  {n.title || "(tanpa judul)"}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(n.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="flex">
                <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => (setEditing(n), setForm({ title: n.title, body: n.body, mood: n.mood }))}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="icon-sm" variant="ghost" aria-label="Hapus">
                      <Trash2 />
                    </Button>
                  }
                  title="Hapus catatan?"
                  description="Catatan akan dihapus permanen."
                  confirmLabel="Hapus"
                  destructive
                  onConfirm={async () => {
                    await deleteNoteAction(n.id);
                    router.refresh();
                  }}
                />
              </div>
            </div>
            <p className="mt-2 line-clamp-6 text-sm whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
