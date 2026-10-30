import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { NotesBoard } from "./notes-client";

export const metadata: Metadata = { title: "Catatan & Jurnal" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: k } = await searchParams;
  const kind = k === "journal" ? "journal" : "note";
  const viewer = await requireViewer("/app/notes");
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id, kind, title, body, mood, updated_at").eq("user_id", viewer.id).eq("kind", kind).order("updated_at", { ascending: false }).limit(100);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Alat belajar" title="Catatan & Jurnal Belajar" description="Simpan catatan materi dan tulis jurnal refleksi harian." />
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 sm:w-fit" role="tablist">
        {[
          ["note", "Catatan"],
          ["journal", "Jurnal belajar"],
        ].map(([key, label]) => (
          <Link key={key} role="tab" aria-selected={kind === key} href={`/app/notes?kind=${key}`} className={cn("flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium", kind === key ? "bg-background shadow-xs" : "text-muted-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      <NotesBoard key={kind} kind={kind} notes={(data ?? []) as never} />
    </div>
  );
}
