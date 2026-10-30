import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PathMap } from "@/components/learning/path-map";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { requireViewer } from "@/lib/auth";
import { getCoursePath } from "@/lib/learning/lessons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  await requireViewer(`/app/course/${courseSlug}`);
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, levels(code, slug), learning_tracks(name)")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) notFound();
  const level = course.levels as { code: string; slug: string } | null;
  const units = await getCoursePath(course.id);

  return (
    <div className="space-y-8">
      <Link href={level ? `/app/learn/${level.slug}` : "/app/learn"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Level {level?.code}
      </Link>
      <PageHeader eyebrow={(course.learning_tracks as { name: string } | null)?.name} title={course.title} description={course.description} />
      {units.length ? <PathMap units={units} exam={null} /> : <EmptyState title="Belum ada unit yang dipublikasikan" />}
    </div>
  );
}
