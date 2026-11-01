import { PillLink, SectionLabel } from "@/components/marketing/editorial";

export function PublicHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="border-b">
      <div className="container-site pt-12 pb-14 md:pt-16 md:pb-20">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="type-h2 mt-6 max-w-5xl">{title}</h1>
        <p className="type-lead mt-6 max-w-2xl text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

export function PublicCta({ title = "Siap mulai belajar?", text = "Daftar gratis dan temukan level yang tepat lewat placement test." }: { title?: string; text?: string }) {
  return (
    <section className="border-t">
      <div className="container-site grid items-end gap-8 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
        <h2 className="type-h2 lg:col-span-7">{title}</h2>
        <div className="lg:col-span-4 lg:col-start-9">
          <p className="type-lead text-muted-foreground">{text}</p>
          <PillLink href="/register" variant="lime" size="lg" className="mt-7">
            Daftar gratis
          </PillLink>
        </div>
      </div>
    </section>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="prose-lesson mx-auto max-w-3xl px-4 py-12 sm:px-6">{children}</div>;
}
