"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addToPoolAction, removeFromPoolAction } from "@/app/admin/pool-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Item = { id: string; key: string | null; prompt: string; type: string; category: string; status: string; stage: string };

export function PoolManager({ kind, ownerId, items, canWrite }: { kind: "quiz" | "exam"; ownerId: string; items: Item[]; canWrite: boolean }) {
  const router = useRouter();
  const [refs, setRefs] = useState("");
  const [pending, start] = useTransition();
  const byCategory = items.reduce<Record<string, number>>((acc, q) => ((acc[q.category] = (acc[q.category] ?? 0) + 1), acc), {});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pool soal ({items.length})</CardTitle>
        <CardDescription>
          Per kategori: {Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}. Hanya soal published, auto-gradable, dan bukan practice-only yang dipakai saat attempt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canWrite && (
          <div className="space-y-2">
            <Textarea rows={3} value={refs} onChange={(e) => setRefs(e.target.value)} placeholder="Key atau ID soal, satu per baris (mis. a1-u01-l1-q3)" className="font-mono text-xs" aria-label="Tambah soal ke pool" />
            <Button
              size="sm"
              disabled={pending || !refs.trim()}
              onClick={() =>
                start(async () => {
                  const res = await addToPoolAction(kind, ownerId, refs);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(`${res.data.added} soal ditambahkan${res.data.missing ? `, ${res.data.missing} tidak ditemukan` : ""}`);
                  setRefs("");
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <Plus />} Tambahkan
            </Button>
          </div>
        )}
        <ul className="max-h-[32rem] divide-y overflow-y-auto rounded-lg border text-sm">
          {items.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 p-2">
              <Link href={`/admin/questions/${q.id}/edit`} className="min-w-0 hover:underline">
                <span className="block truncate">{q.prompt}</span>
                <span className="font-mono text-[0.7rem] text-muted-foreground">
                  {q.key ?? q.id} · {q.type} · {q.stage}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {q.status !== "published" && <Badge variant="outline">{q.status}</Badge>}
                {canWrite && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Keluarkan dari pool"
                    onClick={() =>
                      start(async () => {
                        const res = await removeFromPoolAction(kind, ownerId, q.id);
                        if (!res.ok) toast.error(res.error);
                        router.refresh();
                      })
                    }
                  >
                    <X />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
