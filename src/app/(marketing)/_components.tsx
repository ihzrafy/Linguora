import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 md:py-20">
        <p className="text-sm font-semibold text-primary dark:text-brand-lavender">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

export function PublicCta({ title = "Siap mulai belajar?", text = "Daftar gratis dan temukan level yang tepat lewat placement test." }: { title?: string; text?: string }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl border bg-card px-6 py-12 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        <p className="max-w-xl text-muted-foreground">{text}</p>
        <Button asChild size="lg">
          <Link href="/register">
            Daftar gratis <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="prose-lesson mx-auto max-w-3xl px-4 py-12 sm:px-6">{children}</div>;
}
