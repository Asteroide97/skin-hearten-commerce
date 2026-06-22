import type { Metadata } from "next";
import Link from "next/link";

import { ArrowUpRightIcon, CheckCircleIcon } from "@/components/shared/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { RatingStars } from "@/components/shared/rating-stars";
import { NeedCardLink } from "@/components/store/need-card-link";
import { ProductCard } from "@/components/store/product-card";
import {
  benefits,
  blogPosts,
  brands,
  getBestSellerProducts,
  getFeaturedProducts,
  shopNeeds,
  testimonials,
} from "@/lib/site-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Skincare premium para manchas, antiedad e hidratacion",
  description:
    "Compra skincare premium segun tu necesidad: manchas, antiedad, sensibilidad, hidratacion y protector solar con envio a todo Mexico.",
  openGraph: {
    title: "Skin Hearten | Skincare premium por necesidad real",
    description:
      "Rutinas curadas para manchas, antiedad, hidratacion, sensibilidad y proteccion solar.",
    type: "website",
    siteName: "Skin Hearten",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Skin Hearten | Skincare premium por necesidad real",
    description:
      "Compra productos, marcas e ingredientes con enfoque en conversion, confianza y compra movil.",
  },
};

const trustSignals = [
  "Productos originales",
  "Envios a todo Mexico",
  "Pago seguro",
  "Asesoria especializada",
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Skin Hearten",
  url: siteUrl,
  description:
    "Ecommerce de skincare premium para mujeres que buscan soluciones para manchas, antiedad, hidratacion, sensibilidad y proteccion solar.",
  email: "hola@skinhearten.com",
  areaServed: "MX",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hola@skinhearten.com",
      areaServed: "MX",
      availableLanguage: ["es"],
    },
  ],
};

export default function HomePage() {
  const featured = getFeaturedProducts().slice(0, 4);
  const bestSellers = getBestSellerProducts().slice(0, 3);
  const featuredPost = blogPosts[0];
  const secondaryPosts = blogPosts.slice(1);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-7xl space-y-16 px-5 py-6 sm:px-6 lg:space-y-20 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[2.4rem] bg-stone-950 text-white shadow-[0_36px_90px_rgba(23,18,15,0.16)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-12">
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-stone-300">
                  Skincare premium para piel real
                </p>
                <h1 className="max-w-3xl font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  Corrige manchas, hidrata a profundidad y protege tu piel con formulas que si quieres usar todos los dias.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
                  Skin Hearten ordena la compra por necesidad, no por saturacion. Encuentra
                  soluciones para antiedad, sensibilidad, acne adulto y proteccion solar con una
                  experiencia pensada para convertir mejor en movil.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                  href="#shop-needs"
                >
                  Comprar por necesidad
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/40"
                  href="#bestsellers"
                >
                  Ver bestsellers
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {trustSignals.map((signal) => (
                  <div
                    className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-200"
                    key={signal}
                  >
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#f4cab9]" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-8 top-2 h-24 rounded-full bg-[#f1cbc1] opacity-30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#2c211d] via-[#201916] to-[#140f0d] p-5">
                <div className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-[1.7rem] bg-gradient-to-br from-[#f7dfd8] via-[#fff7f2] to-[#efe4d8] p-6 text-stone-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">
                        Rutinas curadas
                      </p>
                      <h2 className="mt-12 font-serif text-4xl leading-tight">
                        Compra segun lo que tu piel necesita resolver.
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-stone-700">
                        Manchas, antiedad, hidratacion, sensibilidad y protector solar con seleccion clara y premium.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/7 p-5">
                        <p className="text-xs uppercase tracking-[0.26em] text-stone-300">Confianza</p>
                        <p className="mt-7 text-4xl font-semibold text-white">4.8/5</p>
                        <p className="mt-2 text-sm text-stone-300">Valoracion promedio en productos destacados.</p>
                      </div>
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/7 p-5">
                        <p className="text-xs uppercase tracking-[0.26em] text-stone-300">Categorias clave</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["Manchas", "Antiedad", "Sensibilidad", "FPS diario"].map((label) => (
                            <span
                              className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-stone-200"
                              key={label}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {benefits.slice(0, 3).map((benefit) => (
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4" key={benefit.title}>
                        <p className="text-sm font-semibold text-white">{benefit.title}</p>
                        <p className="mt-2 text-sm leading-6 text-stone-300">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8" id="shop-needs">
          <SectionHeading
            eyebrow="Compra segun tu necesidad"
            title="Explora por problema de piel y llega mas rapido a la compra"
            description="Cada entrada concentra una necesidad concreta para reducir friccion, mejorar confianza y acelerar decision."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shopNeeds.map((need) => (
              <NeedCardLink
                accent={need.accent}
                analyticsNeed={need.analyticsNeed}
                description={need.description}
                eyebrow={need.eyebrow}
                href={need.href}
                key={need.id}
                title={need.title}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-white px-5 py-5 shadow-soft sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Marcas seleccionadas</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">Curaduria de alto desempeno sin ruido visual</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <span
                  className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700"
                  key={brand.id}
                >
                  {brand.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Productos destacados"
            title="Texturas, activos y beneficios visibles desde la primera pantalla"
            description="Cards rediseñadas para hacer mas facil comparar, confiar y agregar al carrito desde movil."
          />
          <div className="grid gap-6 xl:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" id="bestsellers">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Bestsellers"
              title="Lo que mas se recompra cuando la experiencia inspira confianza"
              description="Una segunda capa enfocada en los productos que empujan intencion de compra y credibilidad."
            />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f6efe8] p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Confianza en la compra</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
              Informacion suficiente para comprar sin salir a investigar a otro sitio.
            </h2>
            <div className="mt-8 grid gap-4">
              {benefits.map((benefit) => (
                <div className="rounded-[1.5rem] bg-white/90 p-5" key={benefit.title}>
                  <p className="font-semibold text-stone-900">{benefit.title}</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] bg-stone-950 p-6 text-white shadow-[0_30px_80px_rgba(23,18,15,0.12)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-300">Social proof</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">
              La confianza crece cuando la experiencia se siente clara, curada y segura.
            </h2>
            <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
              <RatingStars className="text-stone-200" rating={4.9} reviewCount={1247} />
              <p className="mt-4 text-sm leading-7 text-stone-300">
                Clientas de Ciudad de Mexico, Monterrey y Guadalajara destacan facilidad de compra,
                claridad de informacion y sensacion premium desde movil.
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="text-3xl font-semibold">+12k</p>
                <p className="mt-2 text-sm text-stone-300">sesiones mensuales listas para convertir mejor</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="text-3xl font-semibold">4.8/5</p>
                <p className="mt-2 text-sm text-stone-300">valoracion promedio en productos destacados</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-soft"
                key={testimonial.id}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e5dc] font-serif text-xl text-stone-900">
                    {testimonial.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{testimonial.name}</p>
                    <p className="text-sm text-stone-500">{testimonial.city}</p>
                  </div>
                </div>
                <RatingStars className="mt-5" rating={testimonial.rating} />
                <p className="mt-5 text-sm leading-7 text-stone-700">{testimonial.text}</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Compra verificada
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Diario Skin Hearten"
            title="Una lectura que se siente mas revista que blog"
            description="Contenido editorial para educar, posicionar SEO y reforzar autoridad sin romper la experiencia premium."
          />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Link
              className="overflow-hidden rounded-[2.2rem] border border-stone-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1"
              href={`/blog/${featuredPost.slug}`}
            >
              <div className="grid min-h-[420px] gap-6 bg-gradient-to-br from-[#f7efe8] via-white to-[#f3e5dc] p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Edicion principal</p>
                    <p className="mt-2 text-sm text-stone-500">{featuredPost.publishedAt}</p>
                  </div>
                  <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-600">
                    Guia experta
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-end">
                  <h3 className="max-w-2xl font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">
                    {featuredPost.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-stone-700 sm:text-base">
                    {featuredPost.excerpt}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900">
                    Leer articulo
                    <ArrowUpRightIcon />
                  </div>
                </div>
              </div>
            </Link>
            <div className="grid gap-6">
              {secondaryPosts.map((post, index) => (
                <Link
                  className="rounded-[1.9rem] border border-stone-200 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1"
                  href={`/blog/${post.slug}`}
                  key={post.id}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">
                    Columna 0{index + 1}
                  </p>
                  <h3 className="mt-5 font-serif text-3xl leading-tight text-stone-900">{post.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-stone-600">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between text-sm text-stone-500">
                    <span>{post.author}</span>
                    <span>{post.publishedAt}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
