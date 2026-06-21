import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatLongDate } from "@/lib/format";
import { getBlogPostBySlug } from "@/lib/site-data";

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.metaTitle,
    description: post.metaDescription,
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <header className="soft-panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">{post.author}</p>
        <h1 className="mt-4 font-serif text-4xl text-stone-900 sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-stone-500">{formatLongDate(post.publishedAt)}</p>
        <p className="mt-6 text-base leading-8 text-stone-600">{post.excerpt}</p>
      </header>

      <div className="soft-panel rounded-[2rem] p-8">
        <div className="space-y-6 text-sm leading-8 text-stone-700 sm:text-base">
          {post.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}

