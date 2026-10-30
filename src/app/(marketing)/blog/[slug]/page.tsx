import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { createPublicClient } from "@/lib/supabase/public";
import { PublicCta } from "../../_components";

export const revalidate = 600;

async function getPost(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt } : { title: "Artikel tidak ditemukan" };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Semua artikel
        </Link>
        <h1 className="mt-6 text-4xl font-extrabold">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {post.author_name} · {post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : ""}
        </p>
        <Markdown className="mt-8">{post.body_md}</Markdown>
      </article>
      <PublicCta />
    </>
  );
}
