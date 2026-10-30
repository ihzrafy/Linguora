import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { createPublicClient } from "@/lib/supabase/public";
import { PublicCta, PublicHero } from "../_components";

export const metadata: Metadata = { title: "Kurikulum", description: "Kurikulum Linguora A1–C2: unit, lesson, dan tujuan pembelajaran setiap level." };
export const revalidate = 3600;

export default async function CurriculumPage() {
  const supabase = createPublicClient();
  const [{ data: levels }, { data: units }, { data: tracks }] = await Promise.all([
    supabase.from("levels").select("id, code, name, name_id, description, objectives").order("sort_order"),
    supabase
      .from("units")
      .select("id, title, description, sort_order, courses!inner(level_id, is_core), lessons(title, sort_order, status)")
      .eq("status", "published")
      .eq("courses.is_core", true)
      .order("sort_order"),
    supabase.from("learning_tracks").select("name, description").eq("status", "published").order("sort_order"),
  ]);

  return (
    <>
      <PublicHero eyebrow="Kurikulum" title="Kurikulum A1 sampai C2" description="Materi disusun bertahap: penjelasan berbahasa Indonesia untuk pemula, lalu semakin banyak bahasa Inggris seiring naiknya level." />
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-16 sm:px-6">
        {(levels ?? []).map((level) => {
          const levelUnits = (units ?? []).filter((u) => (u.courses as unknown as { level_id: string }).level_id === level.id);
          return (
            <section key={level.id} aria-labelledby={`lvl-${level.code}`} className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{level.code}</span>
                <div>
                  <h2 id={`lvl-${level.code}`} className="text-2xl font-bold">
                    {level.name} <span className="text-base font-normal text-muted-foreground">· {level.name_id}</span>
                  </h2>
                  <p className="text-muted-foreground">{level.description}</p>
                </div>
              </div>
              <ul className="grid gap-1 pl-1 text-sm text-muted-foreground sm:grid-cols-2">
                {level.objectives.map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
              <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
                {levelUnits.map((u) => (
                  <AccordionItem key={u.id} value={u.id}>
                    <AccordionTrigger>
                      <span className="text-left">
                        <span className="text-muted-foreground">Unit {u.sort_order}.</span> {u.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2 text-muted-foreground">{u.description}</p>
                      <ol className="list-decimal space-y-1 pl-5">
                        {[...u.lessons]
                          .filter((l) => l.status === "published")
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((l) => (
                            <li key={l.title}>{l.title}</li>
                          ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Learning tracks</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(tracks ?? []).map((t) => (
              <div key={t.name} className="rounded-xl border bg-card p-4">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        </section>
        <p className="text-xs text-muted-foreground">CEFR digunakan sebagai acuan kurikulum, bukan klaim sertifikasi resmi.</p>
      </div>
      <PublicCta />
    </>
  );
}
