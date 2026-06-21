import Link from "next/link";

import { SectionHeading } from "@/components/shared/section-heading";
import { blogPosts } from "@/lib/site-data";

export default function BlogListingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Blog"
        title="Contenido SEO listo para crecer"
        description="Listado base de articulos con metadata y ruta individual optimizada."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {blogPosts.map((post) => (
          <Link
            className="soft-panel rounded-[1.8rem] p-6 transition hover:-translate-y-1"
            href={`/blog/${post.slug}`}
            key={post.id}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{post.publishedAt}</p>
            <h2 className="mt-4 font-serif text-3xl text-stone-900">{post.title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">{post.excerpt}</p>
            <p className="mt-6 text-sm font-semibold text-stone-900">Leer articulo</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

