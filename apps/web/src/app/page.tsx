import Link from "next/link";

import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/store/product-card";
import {
  benefits,
  blogPosts,
  brands,
  categories,
  getBestSellerProducts,
  getFeaturedProducts,
  testimonials,
} from "@/lib/site-data";

export default function HomePage() {
  const featured = getFeaturedProducts();
  const bestSellers = getBestSellerProducts();

  return (
    <div className="mx-auto max-w-7xl space-y-20 px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="overflow-hidden rounded-hero bg-stone-950 text-white shadow-soft">
        <div className="grid gap-8 px-6 py-10 sm:px-8 md:grid-cols-[1.15fr_0.85fr] md:px-12 md:py-14">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-300">
              Skincare premium para todos los dias
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                Ciencia para tu piel. Resultados reales.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
                Una experiencia de compra clara, elegante y enfocada en formulas que priorizan
                firmeza, hidratacion y confianza desde el primer toque.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950"
                href="/productos"
              >
                Comprar ahora
              </Link>
              <Link
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white"
                href="/blog"
              >
                Ver blog
              </Link>
            </div>
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-white/20 via-white/5 to-transparent p-4">
            <div className="grid h-full gap-4 rounded-[1.5rem] border border-white/15 p-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-rose-100 via-white to-stone-100 p-5 text-stone-900">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Best seller</p>
                <p className="mt-16 font-serif text-3xl">Serum Renovador</p>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  Textura seda, peptidos y luminosidad uniforme.
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-300">Entrega</p>
                  <p className="mt-6 text-3xl font-semibold">24-72h</p>
                  <p className="mt-2 text-sm text-stone-300">Cobertura nacional en Mexico.</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-300">Pagos</p>
                  <p className="mt-6 text-2xl font-semibold">Stripe, PayPal, MP</p>
                  <p className="mt-2 text-sm text-stone-300">Checkout preparado para conversion.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Categorias destacadas"
          title="Rutinas ordenadas por necesidad real"
          description="La navegacion prioriza decision rapida en movil, claridad visual y rutas directas a compra."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category, index) => (
            <Link
              className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft transition hover:-translate-y-1"
              href={`/productos?categoria=${category.slug}`}
              key={category.id}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                0{index + 1}
              </p>
              <h3 className="mt-8 font-serif text-2xl text-stone-900">{category.name}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Productos destacados"
          title="Curaduria premium para conversion"
          description="Cada tarjeta comunica marca, beneficio principal, precio y contexto de uso sin saturar la vista."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[2rem] bg-[#f5efe8] px-6 py-8 sm:px-8">
        <SectionHeading
          eyebrow="Mas vendidos"
          title="Lo que ya esta funcionando"
          description="Base visual lista para convertirse despues en carrusel conectado a ventas reales."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-8">
          <SectionHeading
            eyebrow="Marcas"
            title="Portafolio confiable y coherente"
            description="La tienda comunica criterio, no acumulacion."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {brands.map((brand) => (
              <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-soft" key={brand.id}>
                <p className="font-serif text-2xl text-stone-900">{brand.name}</p>
                <p className="mt-3 text-sm leading-6 text-stone-600">{brand.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft">
          <SectionHeading
            eyebrow="Beneficios"
            title="Confianza operativa desde el home"
            description="Mensajes concretos para reducir friccion antes del checkout."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div className="rounded-[1.5rem] bg-stone-50 p-5" key={benefit.title}>
                <p className="font-semibold text-stone-900">{benefit.title}</p>
                <p className="mt-3 text-sm leading-6 text-stone-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft">
          <SectionHeading
            eyebrow="Testimonios"
            title="Validacion social con tono sobrio"
            description="Listo para conectarse a reseñas verificadas."
          />
          <div className="mt-8 space-y-4">
            {testimonials.map((testimonial) => (
              <blockquote className="rounded-[1.5rem] bg-stone-50 p-5" key={testimonial.id}>
                <p className="text-sm leading-7 text-stone-700">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <footer className="mt-3 text-sm font-semibold text-stone-900">{testimonial.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft">
          <SectionHeading
            eyebrow="Blog"
            title="Contenido SEO que sostiene adquisicion"
            description="Ultimos articulos con enfoque practico y visual limpio."
          />
          <div className="mt-8 space-y-4">
            {blogPosts.map((post) => (
              <Link
                className="block rounded-[1.5rem] bg-stone-50 p-5 transition hover:bg-stone-100"
                href={`/blog/${post.slug}`}
                key={post.id}
              >
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{post.publishedAt}</p>
                <h3 className="mt-3 font-serif text-2xl text-stone-900">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
