"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteResourceAction, saveResourceAction } from "@/app/admin/resource-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDef } from "@/lib/admin/resources";

type Options = Record<string, { value: string; label: string }[]>;

function toFormValue(f: FieldDef, v: unknown): unknown {
  if (f.kind === "lines") return Array.isArray(v) ? v.join("\n") : "";
  if (f.kind === "json") return v === null || v === undefined ? "" : JSON.stringify(v, null, 2);
  if (f.kind === "boolean") return Boolean(v);
  if (f.kind === "date") return typeof v === "string" ? v.slice(0, 10) : "";
  return v ?? "";
}

export function ResourceForm({
  resourceKey,
  id,
  fields,
  initial,
  options,
  returnTo,
  canDelete,
}: {
  resourceKey: string;
  id: string | null;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  options: Options;
  returnTo: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.name, toFormValue(f, initial[f.name] ?? (f.kind === "select" && f.name === "status" ? "draft" : undefined))])));
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveResourceAction(resourceKey, id, values);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Tersimpan");
          router.push(returnTo);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const fid = `f-${f.name}`;
          const wide = ["textarea", "markdown", "json", "lines"].includes(f.kind);
          const disabled = Boolean(id && f.immutable);
          return (
            <div key={f.name} className={wide ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
              <div className="flex items-center justify-between">
                <Label htmlFor={fid}>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.kind === "markdown" && (
                  <button type="button" className="flex items-center gap-1 text-xs text-primary" onClick={() => setPreview(preview === f.name ? null : f.name)}>
                    <Eye className="size-3" /> {preview === f.name ? "Tutup preview" : "Preview"}
                  </button>
                )}
              </div>
              {f.kind === "select" ? (
                <NativeSelect id={fid} disabled={disabled} required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">—</option>
                  {(f.options ?? options[f.name] ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              ) : f.kind === "boolean" ? (
                <div className="flex h-9 items-center">
                  <Switch id={fid} checked={Boolean(values[f.name])} onCheckedChange={(v) => set(f.name, v)} />
                </div>
              ) : f.kind === "textarea" || f.kind === "lines" ? (
                <Textarea id={fid} rows={f.kind === "lines" ? 4 : 3} maxLength={f.max} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.kind === "markdown" || f.kind === "json" ? (
                preview === f.name ? (
                  <div className="max-h-[32rem] overflow-y-auto rounded-lg border p-4">
                    <Markdown>{String(values[f.name] ?? "")}</Markdown>
                  </div>
                ) : (
                  <Textarea id={fid} rows={f.kind === "json" ? 8 : 14} maxLength={f.max} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} className="font-mono text-xs" spellCheck={f.kind === "markdown"} />
                )
              ) : (
                <Input
                  id={fid}
                  type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
                  disabled={disabled}
                  min={f.min}
                  max={f.kind === "number" ? f.max : undefined}
                  maxLength={f.kind === "text" ? f.max : undefined}
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(returnTo)}>
          Batal
        </Button>
        {id && canDelete && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive" className="ml-auto">
                <Trash2 /> Hapus
              </Button>
            }
            title="Hapus data ini?"
            description="Tindakan ini permanen dan tercatat di audit log. Jika data masih dipakai, arsipkan saja."
            confirmLabel="Hapus"
            destructive
            onConfirm={async () => {
              const res = await deleteResourceAction(resourceKey, id);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Dihapus");
              router.push(returnTo);
              router.refresh();
            }}
          />
        )}
      </div>
    </form>
  );
}
