import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RemoveBookmark } from "./remove";

export const metadata: Metadata = { title: "Bookmark" };
const TYPE: Record<string, string> = { lesson: "Lesson", grammar: "Grammar", reading: "Reading", listening: "Listening", vocabulary: "Vocabulary", question: "Soal" };

export default async function BookmarksPage() {
  const viewer = await requireViewer("/app/bookmarks");
  const supabase = await createClient();
  const { data } = await supabase.from("bookmarks").select("id, target_type, target_id, title, href, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Alat belajar" title="Bookmark" description="Lesson, topik grammar, bacaan, dan materi listening yang kamu simpan." />
      {!data?.length ? (
        <EmptyState icon={Bookmark} title="Belum ada bookmark" description="Gunakan tombol Bookmark di halaman lesson, grammar, reading, atau listening." />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-4">
              <Link href={b.href} className="min-w-0 hover:underline">
                <Badge variant="outline" className="mr-2">
                  {TYPE[b.target_type]}
                </Badge>
                <span className="font-medium">{b.title}</span>
              </Link>
              <RemoveBookmark targetType={b.target_type} targetId={b.target_id} title={b.title} href={b.href} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
