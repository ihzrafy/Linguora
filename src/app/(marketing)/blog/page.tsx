import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { createPublicClient } from "@/lib/supabase/public";
import { PublicHero } from "../_components";

export const metadata: Metadata = { title: "Blog", description: "Tips belajar bahasa Inggris dan pembaruan dari tim kurikulum Linguora." };
export const revalidate = 600;

export default async function BlogPage() {
  const supabase = createPublicClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, tags, author_name, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (
    <>
      <PublicHero eyebrow="Blog" title="Tips & wawasan belajar" description="Artikel dari tim kurikulum Linguora tentang cara belajar bahasa Inggris yang efektif." />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {!posts?.length ? (
          <EmptyState title="Belum ada artikel" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="block h-full rounded-2xl border bg-card p-6 transition hover:border-primary/50 hover:shadow-md">
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{p.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {p.author_name} · {p.published_at ? new Date(p.published_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
