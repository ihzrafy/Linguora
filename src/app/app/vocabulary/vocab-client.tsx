"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FolderPlus, Loader2, Plus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { saveWordAction } from "@/app/app/personal-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createCollectionAction, importWordsAction, learnEntryAction, moveToCollectionAction, removeWordAction, toggleFavoriteAction } from "./actions";

export function LearnButton({ entryId, inWordbook }: { entryId: string; inWordbook: boolean }) {
  const [added, setAdded] = useState(inWordbook);
  const [pending, start] = useTransition();
  if (added)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" /> Di wordbook
      </span>
    );
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await learnEntryAction(entryId);
          if (res.ok || res.code === "conflict") setAdded(true);
          if (res.ok) toast.success("Ditambahkan ke wordbook & jadwal review");
          else if (res.code !== "conflict") toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Plus />} Pelajari
    </Button>
  );
}

export function WordActions({ id, favorite, collectionId, collections }: { id: string; favorite: boolean; collectionId: string | null; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  return (
    <div className="flex items-center gap-1">
      <NativeSelect
        size="xs"
        aria-label="Koleksi"
        disabled={pending}
        value={collectionId ?? ""}
        onChange={(e) => run(() => moveToCollectionAction(id, e.target.value || null))}
        wrapperClassName="max-w-36"
      >
        <option value="">Tanpa koleksi</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <Button size="icon-sm" variant="ghost" disabled={pending} aria-pressed={favorite} aria-label={favorite ? "Hapus dari favorit" : "Tandai favorit"} onClick={() => run(() => toggleFavoriteAction(id, !favorite))}>
        <Star className={favorite ? "fill-amber-400 text-amber-500" : ""} />
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={pending} aria-label="Hapus dari wordbook" onClick={() => run(() => removeWordAction(id))}>
        <Trash2 />
      </Button>
    </div>
  );
}

export function AddWordDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ word: "", meaning: "", example: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Tambah kata
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah kata ke wordbook</DialogTitle>
          <DialogDescription>Jika kata ada di kamus Linguora, detail lengkapnya akan ditautkan otomatis.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveWordAction({ word: form.word, meaning: form.meaning, example: form.example || undefined });
              if (!res.ok) return void toast.error(res.error);
              toast.success("Kata disimpan");
              setForm({ word: "", meaning: "", example: "" });
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="w-word">Kata / frasa</Label>
            <Input id="w-word" required maxLength={80} value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-meaning">Arti</Label>
            <Input id="w-meaning" required maxLength={280} value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-example">Contoh kalimat (opsional)</Label>
            <Textarea id="w-example" maxLength={400} rows={2} value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Loader2 className="animate-spin" />} Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus /> Koleksi baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koleksi baru</DialogTitle>
          <DialogDescription>Kelompokkan kata, misalnya “Kosakata kantor” atau “Persiapan wawancara”.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createCollectionAction(name);
              if (!res.ok) return void toast.error(res.error);
              setName("");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <Label htmlFor="c-name">Nama koleksi</Label>
          <Input id="c-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={pending} className="w-full">
            Buat koleksi
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [report, setReport] = useState<{ added: number; skipped: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), setReport(null))}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload /> Impor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impor kata</DialogTitle>
          <DialogDescription>CSV dengan kolom word, meaning, example — atau JSON array berisi objek {"{ word, meaning, example }"}. Maksimal 500 kata.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="fmt" checked={format === "csv"} onChange={() => setFormat("csv")} /> CSV
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="fmt" checked={format === "json"} onChange={() => setFormat("json")} /> JSON
            </label>
            <label className="ml-auto cursor-pointer text-primary underline">
              Pilih berkas
              <input
                type="file"
                accept=".csv,.json,.txt"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 200_000) return void toast.error("Berkas terlalu besar (maks. 200 KB).");
                  setFormat(file.name.endsWith(".json") ? "json" : "csv");
                  setText(await file.text());
                }}
              />
            </label>
          </div>
          <Textarea aria-label="Isi impor" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"word,meaning,example\nschedule,jadwal,My schedule is busy."} />
          {report && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p>
                {report.added} kata ditambahkan, {report.skipped} dilewati (sudah ada).
              </p>
              {report.errors.map((e) => (
                <p key={e} className="text-destructive">
                  {e}
                </p>
              ))}
            </div>
          )}
          <Button
            className="w-full"
            disabled={pending || !text.trim()}
            onClick={() =>
              start(async () => {
                const res = await importWordsAction(text, format);
                if (!res.ok) return void toast.error(res.error);
                setReport(res.data);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Impor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
