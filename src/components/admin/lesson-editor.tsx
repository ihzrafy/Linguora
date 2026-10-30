"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, History, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { duplicateLessonAction, saveLessonAction } from "@/app/admin/lesson-actions";
import { restoreVersionAction } from "@/app/admin/question-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Section = { kind: string; title: string; body_md: string; data: string };
type Opt = { value: string; label: string };
const KINDS = ["objectives", "explanation", "examples", "vocabulary", "grammar", "mistakes", "guided_practice", "independent_practice", "mini_assessment", "summary", "review_cards", "completion", "media"];
const DEFAULT_SECTIONS: Section[] = [
  ["objectives", "Tujuan Pembelajaran"],
  ["explanation", "Penjelasan Konsep"],
  ["examples", "Contoh Penggunaan"],
  ["vocabulary", "Kosakata"],
  ["grammar", "Pola Grammar"],
  ["mistakes", "Kesalahan Umum"],
  ["guided_practice", "Latihan Terpandu"],
  ["independent_practice", "Latihan Mandiri"],
  ["mini_assessment", "Mini Assessment"],
  ["summary", "Ringkasan"],
  ["review_cards", "Kartu Review"],
  ["completion", "Kriteria Penyelesaian"],
].map(([kind, title]) => ({ kind, title, body_md: "", data: "" }));

export type LessonEditorValue = {
  unitId: string;
  slug: string;
  title: string;
  summary: string;
  objectives: string;
  completionCriteria: string;
  estimatedMinutes: number;
  xpReward: number;
  status: string;
  publishAt: string;
  sections: Section[];
  prerequisites: string[];
};

export function LessonEditor({
  id,
  initial,
  units,
  siblings,
  versions,
  canPublish,
}: {
  id: string | null;
  initial: LessonEditorValue | null;
  units: Opt[];
  siblings: Opt[];
  versions: { id: string; version: number; note: string | null; created_at: string }[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<LessonEditorValue>(
    initial ?? { unitId: units[0]?.value ?? "", slug: "", title: "", summary: "", objectives: "", completionCriteria: "Baca semua bagian materi dan raih skor minimal 70% pada mini quiz.", estimatedMinutes: 15, xpReward: 20, status: "draft", publishAt: "", sections: DEFAULT_SECTIONS, prerequisites: [] },
  );
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const setSection = (i: number, patch: Partial<Section>) => setV((s) => ({ ...s, sections: s.sections.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const move = (i: number, d: -1 | 1) =>
    setV((s) => {
      const next = [...s.sections];
      const j = i + d;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, sections: next };
    });

  const save = () =>
    start(async () => {
      const res = await saveLessonAction({
        id,
        unitId: v.unitId,
        slug: v.slug,
        title: v.title,
        summary: v.summary,
        objectives: v.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
        completionCriteria: v.completionCriteria,
        estimatedMinutes: Number(v.estimatedMinutes),
        xpReward: Number(v.xpReward),
        status: v.status as "draft",
        publishAt: v.publishAt ? new Date(v.publishAt).toISOString() : null,
        sections: v.sections as never,
        prerequisites: v.prerequisites,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Lesson disimpan");
      if (!id) router.replace(`/admin/lessons/${res.data.id}`);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="l-unit">Unit</Label>
            <NativeSelect id="l-unit" value={v.unitId} onChange={(e) => setV({ ...v, unitId: e.target.value })}>
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-slug">Slug</Label>
            <Input id="l-slug" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="l-title">Judul</Label>
            <Input id="l-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="l-summary">Ringkasan singkat</Label>
            <Textarea id="l-summary" rows={2} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-obj">Tujuan (satu per baris)</Label>
            <Textarea id="l-obj" rows={4} value={v.objectives} onChange={(e) => setV({ ...v, objectives: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-crit">Kriteria penyelesaian</Label>
            <Textarea id="l-crit" rows={4} value={v.completionCriteria} onChange={(e) => setV({ ...v, completionCriteria: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l-min">Menit</Label>
              <Input id="l-min" type="number" min={1} max={240} value={v.estimatedMinutes} onChange={(e) => setV({ ...v, estimatedMinutes: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-xp">XP</Label>
              <Input id="l-xp" type="number" min={0} max={500} value={v.xpReward} onChange={(e) => setV({ ...v, xpReward: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l-status">Status</Label>
              <NativeSelect id="l-status" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="in_review">In review</option>
                {canPublish && <option value="published">Published</option>}
                {canPublish && <option value="archived">Archived</option>}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-pub">Jadwal publikasi</Label>
              <Input id="l-pub" type="datetime-local" value={v.publishAt} onChange={(e) => setV({ ...v, publishAt: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground md:col-span-2">Jadwal publikasi berlaku untuk lesson berstatus “In review”: lesson dipublikasikan otomatis oleh tugas terjadwal (/api/cron/publish).</p>
          <div className="space-y-1 md:col-span-2">
            <Label>Prasyarat (lesson lain di unit yang sama)</Label>
            <div className="flex flex-wrap gap-2">
              {siblings.filter((s) => s.value !== id).map((s) => (
                <label key={s.value} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={v.prerequisites.includes(s.value)}
                    onChange={(e) => setV({ ...v, prerequisites: e.target.checked ? [...v.prerequisites, s.value] : v.prerequisites.filter((p) => p !== s.value) })}
                  />
                  {s.label}
                </label>
              ))}
              {siblings.length <= 1 && <span className="text-xs text-muted-foreground">Tidak ada lesson lain di unit ini.</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bagian materi ({v.sections.length})</h2>
        <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
          <Eye /> {preview ? "Kembali ke editor" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <Card>
          <CardContent className="space-y-6">
            <h2 className="text-2xl font-bold">{v.title}</h2>
            {v.sections.map((s, i) => (
              <section key={i} className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {i + 1}. {s.title}
                </h3>
                {s.body_md && <Markdown>{s.body_md}</Markdown>}
                {s.data.trim() && <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">{s.data}</pre>}
              </section>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {v.sections.map((s, i) => (
            <Card key={i} className="py-4">
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <NativeSelect size="sm" value={s.kind} onChange={(e) => setSection(i, { kind: e.target.value })} aria-label="Jenis bagian">
                    {KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </NativeSelect>
                  <Input value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} className="h-8 flex-1" aria-label="Judul bagian" />
                  <Button size="icon-sm" variant="ghost" aria-label="Naik" onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Turun" onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Hapus bagian" onClick={() => setV({ ...v, sections: v.sections.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </div>
                <Textarea rows={["explanation", "summary"].includes(s.kind) ? 8 : 2} value={s.body_md} onChange={(e) => setSection(i, { body_md: e.target.value })} placeholder="Isi markdown (opsional)" className="font-mono text-xs" aria-label="Isi markdown" />
                <Textarea rows={3} value={s.data} onChange={(e) => setSection(i, { data: e.target.value })} placeholder='Data JSON (opsional), mis. {"items":[...]} atau {"questionIds":[...]}' className="font-mono text-xs" aria-label="Data JSON" />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => setV({ ...v, sections: [...v.sections, { kind: "explanation", title: "Bagian baru", body_md: "", data: "" }] })}>
            <Plus /> Tambah bagian
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan lesson
        </Button>
        {id && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await duplicateLessonAction(id);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Lesson diduplikasi sebagai draft");
                router.push(`/admin/lessons/${res.data.id}`);
              })
            }
          >
            <Copy /> Duplikasi
          </Button>
        )}
      </div>

      {id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" /> Riwayat versi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!versions.length ? (
              <p className="text-sm text-muted-foreground">Belum ada versi sebelumnya. Setiap penyimpanan menyimpan snapshot versi lama.</p>
            ) : (
              <ul className="divide-y text-sm">
                {versions.map((ver) => (
                  <li key={ver.id} className="flex items-center justify-between py-2">
                    <span>
                      v{ver.version} · {ver.note ?? "edit"} · {new Date(ver.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          <RotateCcw /> Rollback
                        </Button>
                      }
                      title={`Kembalikan ke versi ${ver.version}?`}
                      description="Isi lesson dan seluruh bagian materinya dikembalikan. Versi saat ini disimpan dulu sebagai snapshot."
                      confirmLabel="Rollback"
                      onConfirm={async () => {
                        const res = await restoreVersionAction(ver.id);
                        if (!res.ok) return void toast.error(res.error);
                        toast.success("Versi dipulihkan");
                        window.location.reload();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
