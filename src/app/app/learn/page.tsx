import type { Metadata } from "next";
import Link from "next/link";
import { Award, ChevronRight, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Learning Path" };

export default async function LearnPage() {
  const viewer = await requireViewer("/app/learn");
  const supabase = await createClient();
  const [{ data: levels }, { data: unlocks }, { data: lessons }, { data: progress }, { data: certs }, { data: tracks }] = await Promise.all([
    supabase.from("levels").select("id, code, slug, name, name_id, description, sort_order").order("sort_order"),
    supabase.from("user_level_unlocks").select("level_id").eq("user_id", viewer.id),
    supabase.from("lessons").select("id, units!inner(courses!inner(level_id, is_core))").eq("status", "published").eq("units.courses.is_core", true),
    supabase.from("learning_progress").select("lesson_id, status").eq("user_id", viewer.id),
    supabase.from("certificates").select("level_id, score_percent").eq("user_id", viewer.id),
    supabase.from("learning_tracks").select("slug, name, description, goals").eq("status", "published").order("sort_order"),
  ]);
  const done = new Set((progress ?? []).filter((p) => p.status !== "in_progress").map((p) => p.lesson_id));
  const unlocked = new Set((unlocks ?? []).map((u) => u.level_id));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Kurikulum CEFR" title="Learning Path" description="Enam level dari A1 hingga C2. Selesaikan unit secara berurutan, lulus ujian level, lalu lanjut ke level berikutnya." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(levels ?? []).map((level) => {
          const levelLessons = (lessons ?? []).filter((l) => (l.units as unknown as { courses: { level_id: string } }).courses.level_id === level.id);
          const completed = levelLessons.filter((l) => done.has(l.id)).length;
          const pct = levelLessons.length ? Math.round((completed / levelLessons.length) * 100) : 0;
          const isOpen = unlocked.has(level.id);
          const cert = certs?.find((c) => c.level_id === level.id);
          const current = viewer.profile.current_level_id === level.id;
          return (
            <Link key={level.id} href={`/app/learn/${level.slug}`} className="group">
              <Card className={cn("h-full transition group-hover:border-primary/50 group-hover:shadow-md", current && "border-primary ring-2 ring-primary/20", !isOpen && "opacity-80")}>
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className={cn("flex size-14 items-center justify-center rounded-2xl text-xl font-bold", isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {level.code}
                    </div>
                    <div className="flex gap-1.5">
                      {current && <Badge>Level kamu</Badge>}
                      {cert && (
                        <Badge className="bg-success text-success-foreground">
                          <Award className="size-3" /> Lulus
                        </Badge>
                      )}
                      {!isOpen && (
                        <Badge variant="outline">
                          <Lock className="size-3" /> Terkunci
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      {level.name} <span className="text-sm font-normal text-muted-foreground">· {level.name_id}</span>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{level.description}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {completed}/{levelLessons.length} lesson
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} aria-label={`Progres level ${level.code}`} />
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary dark:text-brand-lavender">
                    Buka level <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Learning tracks</h2>
        <p className="text-sm text-muted-foreground">
          Semua track memakai jalur inti General English sebagai fondasi. Materi khusus tiap track ditambahkan bertahap melalui CMS dan muncul di halaman level masing-masing.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(tracks ?? []).map((t) => (
            <Card key={t.slug}>
              <CardContent className="space-y-2">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {t.goals.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
