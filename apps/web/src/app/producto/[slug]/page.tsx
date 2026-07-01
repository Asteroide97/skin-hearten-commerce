import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckCircleIcon } from "@/components/shared/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { EditorialFigure } from "@/components/store/editorial-figure";
import { ProductReviewsSection } from "@/components/store/product-reviews-section";
import { ProductViewTracker } from "@/components/store/product-view-tracker";
import { formatCurrency } from "@/lib/format";
import { createEmptyProductReviewSummary } from "@/lib/product-reviews";
import { getProductReviews } from "@/lib/product-reviews-api";
import { getProductBySlug, getProducts } from "@/lib/storefront-api";
import type { Product } from "@/lib/types";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ProductExperience = {
  benefitCards: Array<{ title: string; description: string; tone: string }>;
  editorialComplements: Product[];
  idealFor: string[];
  ingredientCards: Array<{ name: string; effect: string }>;
  notRecommendedIf: string;
  resultTimeline: Array<{ label: string; title: string; description: string }>;
  routineSteps: Array<{ label: string; note: string; product: Product; slot: string; isCurrent: boolean }>;
  usageTimeline: Array<{ label: string; title: string; description: string }>;
};

const ingredientGlossary: Record<string, string> = {
  "Acido mandelico": "Ayuda a refinar la textura con una exfoliacion mas gradual que otras opciones.",
  "Agua de rosas": "Aporta frescura ligera y hace mas agradable sumar hidratacion durante el dia.",
  "Avena coloidal": "Calma y acompana una limpieza que no deja sensacion tirante.",
  BHA: "Trabaja sobre poros y textura para que la piel se vea mas uniforme.",
  "Beta glucanos": "Sostienen confort e hidratacion cuando la piel se siente cansada o reactiva.",
  Ceramidas: "Refuerzan la barrera para que la piel retenga mejor hidratacion y confort.",
  Escualano: "Suaviza y deja una sensacion flexible sin volver pesada la rutina.",
  Glicerina: "Atrae agua hacia la piel y da hidratacion inmediata.",
  Niacinamida: "Acompana luminosidad, uniformidad y una barrera mas estable.",
  Pantenol: "Ayuda a que la piel se sienta mas calmada y menos reactiva.",
  Peptidos: "Acompanan firmeza visual y una textura mas lisa con uso constante.",
  Resveratrol: "Aporta apoyo antioxidante para sostener una piel mas uniforme.",
  "Vitamina E": "Suma confort y soporte antioxidante para una rutina mas estable.",
  "Zinc PCA": "Ayuda a equilibrar brillo y brotes sin resecar de mas.",
  "Extracto de arroz": "Aporta suavidad y ayuda a que la formula se sienta mas ligera.",
  "Filtros fotoestables": "Protegen frente al sol para que manchas y sensibilidad no se intensifiquen.",
  "Manteca de karite": "Envuelve la piel en confort y ayuda a sellar hidratacion.",
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {};
  }

  return {
    title: `${product.name} | Skin Hearten`,
    description: product.highlight,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const [product, products, reviewResult] = await Promise.all([
    getProductBySlug(slug),
    getProducts(),
    getProductReviews(slug),
  ]);

  if (!product) {
    notFound();
  }

  const reviewSummary = reviewResult.ok
    ? reviewResult.data
    : createEmptyProductReviewSummary(Number(product.id));

  const related = products
    .filter((entry) => entry.category === product.category && entry.id !== product.id)
    .slice(0, 2);
  const complementary = products
    .filter((entry) => entry.category !== product.category && entry.id !== product.id)
    .slice(0, 4);
  const experience = buildProductExperience(product, products, related, complementary);

  return (
    <div className="product-page mx-auto max-w-[1320px] space-y-16 px-5 py-8 sm:px-6 lg:px-8 lg:space-y-20">
      <ProductViewTracker
        category={product.category}
        price={product.price}
        productId={product.id}
        productName={product.name}
      />

      <section className="grid gap-8 border-b border-stone-200 pb-14 lg:grid-cols-[1.28fr_0.72fr] lg:items-start">
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <EditorialFigure
            className="min-h-[720px] lg:row-span-2"
            description={product.highlight}
            frame="portrait"
            label="Hero frame"
            title={product.name}
            tone="linen"
          />
          <EditorialFigure
            className="min-h-[350px]"
            description={product.description}
            frame="texture"
            label="What it shifts"
            title={product.concerns[0] ?? product.category}
            tone="blush"
          />
          <EditorialFigure
            className="min-h-[350px]"
            description={product.usage[0]}
            frame="vanity"
            label="Daily gesture"
            title={product.highlight}
            tone="mist"
          />
        </div>

        <div className="space-y-8 lg:sticky lg:top-24">
          <div className="space-y-4">
            <h1 className="font-serif text-[3.2rem] leading-[0.92] text-stone-950 sm:text-[4rem]">
              {product.name}
            </h1>
            <p className="max-w-lg text-base leading-8 text-stone-600">{product.highlight}</p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <p className="text-3xl font-semibold text-stone-950">{formatCurrency(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-lg text-stone-400 line-through">{formatCurrency(product.compareAtPrice)}</p>
            ) : null}
          </div>

          <p className="text-sm text-stone-600">
            Stock disponible: <span className="font-semibold text-stone-950">{product.stock}</span>
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AddToCartButton
              className="btn-primary"
              label="Anadir a mi rutina"
              name={product.name}
              price={product.price}
              productId={product.id}
              slug={product.slug}
            />
            <a className="btn-secondary" href="#como-usarlo">
              Ver como se usa
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]" id="para-quien">
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Problema que resuelve"
            title="Para quien si tiene sentido"
            description="Piensa en este producto como una decision de piel, no de categoria."
          />
          <p className="max-w-md text-sm leading-7 text-stone-600">
            Si tu objetivo hoy es {formatJoinedList(product.concerns)} y tu piel tiende a {formatJoinedList(product.skinTypes)}, esta formula entra con claridad.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] bg-[#f7efe7] p-6 sm:p-7">
            <p className="section-label">Para quien es?</p>
            <div className="mt-5 grid gap-3">
              {experience.idealFor.map((item) => (
                <div className="flex items-start gap-3 text-sm leading-7 text-stone-700" key={item}>
                  <CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-stone-950" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-stone-200 bg-white p-6 sm:p-7">
            <p className="section-label">No recomendado si...</p>
            <p className="mt-5 text-sm leading-8 text-stone-600">{experience.notRecommendedIf}</p>
          </article>
        </div>
      </section>

      <section className="space-y-8 border-y border-stone-200 py-14">
        <SectionHeading
          eyebrow="Como funciona"
          title="La formula acompana un cambio visible sin sentirse complicada"
          description={product.description}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experience.benefitCards.map((card) => (
            <article className={`rounded-[2rem] p-6 ${card.tone}`} key={card.title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300/60 bg-white/70 text-sm font-semibold text-stone-950">
                {card.title.slice(0, 1)}
              </div>
              <h3 className="mt-6 font-serif text-[2rem] leading-[0.96] text-stone-950">{card.title}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8" id="como-usarlo">
        <SectionHeading
          eyebrow="Como se usa"
          title="Una rutina clara sostiene mejor la transformacion"
          description="Manana, noche, frecuencia y una expectativa realista. Nada mas."
        />

        <div className="grid gap-4 lg:grid-cols-4">
          {experience.usageTimeline.map((entry, index) => (
            <article className="rounded-[2rem] border border-stone-200 bg-[#fffaf7] p-5 sm:p-6" key={entry.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{entry.label}</p>
              <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="mt-5 font-serif text-[2rem] leading-[0.98] text-stone-950">{entry.title}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">{entry.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Ingredientes"
          title="Lo importante no es memorizar el INCI"
          description="Lo importante es saber que hace cada pieza dentro de tu rutina."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experience.ingredientCards.map((ingredient) => (
            <article className="rounded-[2rem] border border-stone-200 bg-white p-5 sm:p-6" key={ingredient.name}>
              <p className="section-label">Ingrediente</p>
              <h3 className="mt-4 font-serif text-[2rem] leading-[0.98] text-stone-950">{ingredient.name}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">{ingredient.effect}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[2.4rem] bg-[#f3e8de] p-6 sm:p-8">
        <SectionHeading
          eyebrow="Combinalo con"
          title="Piensalo dentro de una rutina, no como un paso suelto"
          description="Cada paso ayuda a que la formula se entienda mejor en la piel."
        />

        <div className="grid gap-4 lg:grid-cols-4">
          {experience.routineSteps.map((step, index) => (
            <article
              className={`rounded-[2rem] p-5 sm:p-6 ${step.isCurrent ? "bg-stone-950 text-white" : "bg-white/80 text-stone-900"}`}
              key={`${step.slot}-${step.product.id}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${step.isCurrent ? "text-white/70" : "text-stone-500"}`}>
                Paso {index + 1}
              </p>
              <p className={`mt-3 text-sm font-semibold ${step.isCurrent ? "text-white/80" : "text-stone-700"}`}>
                {step.slot}
              </p>
              <h3 className="mt-4 font-serif text-[2rem] leading-[0.98]">{step.product.name}</h3>
              <p className={`mt-3 text-sm leading-7 ${step.isCurrent ? "text-white/75" : "text-stone-600"}`}>
                {step.note}
              </p>
              <div className="mt-5">
                <Link
                  className={`inline-flex text-sm font-semibold ${step.isCurrent ? "text-white" : "text-stone-950"}`}
                  href={`/producto/${step.product.slug}`}
                >
                  {step.label}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Resultados esperados"
          title="Lo que puedes empezar a notar con constancia"
          description="Sin promesas medicas. Solo una lectura honesta de como suele responder la piel."
        />

        <div className="grid gap-4 lg:grid-cols-4">
          {experience.resultTimeline.map((stage) => (
            <article className="rounded-[2rem] border border-stone-200 bg-white p-5 sm:p-6" key={stage.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{stage.label}</p>
              <h3 className="mt-4 font-serif text-[2rem] leading-[0.98] text-stone-950">{stage.title}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">{stage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[2.4rem] bg-[#fbf5ee] p-6 sm:p-8">
        <SectionHeading
          eyebrow="Preguntas frecuentes"
          title="Lo esencial, respondido con calma"
          description="Sin tecnicismos innecesarios. Solo lo que ayuda a decidir mejor."
        />

        <div className="grid gap-4">
          {product.faq.map((entry) => (
            <details className="group rounded-[1.7rem] border border-stone-200 bg-white px-5 py-4 sm:px-6" key={entry.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-base font-semibold text-stone-900">{entry.question}</span>
                <span className="text-sm text-stone-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="pt-4 text-sm leading-7 text-stone-600">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div id="opiniones">
        <ProductReviewsSection
          initialSummary={reviewSummary}
          productName={product.name}
          productRef={product.slug}
        />
      </div>

      <section className="space-y-8 border-t border-stone-200 pt-14">
        <SectionHeading
          eyebrow="Productos complementarios"
          title="Si quieres seguir construyendo la transformacion"
          description="Una salida mas editorial para completar la rutina sin caer en un grid plano."
        />

        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          {experience.editorialComplements[0] ? (
            <Link
              className="group rounded-[2.3rem] bg-[#f7efe7] p-6 sm:p-8"
              href={`/producto/${experience.editorialComplements[0].slug}`}
            >
              <p className="section-label">Empieza por aqui</p>
              <h3 className="mt-5 font-serif text-[2.8rem] leading-[0.94] text-stone-950 transition group-hover:translate-x-1">
                {experience.editorialComplements[0].name}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
                {experience.editorialComplements[0].highlight}
              </p>
              <p className="mt-8 text-sm font-semibold text-stone-950">
                {formatCurrency(experience.editorialComplements[0].price)}
              </p>
            </Link>
          ) : null}

          <div className="grid gap-4">
            {experience.editorialComplements.slice(1, 3).map((entry, index) => (
              <Link
                className={`rounded-[2rem] p-6 sm:p-7 ${index === 0 ? "bg-white" : "bg-[#fbf4ec]"}`}
                href={`/producto/${entry.slug}`}
                key={entry.id}
              >
                <p className="section-label">{index === 0 ? "Paso siguiente" : "Tambien puede gustarte"}</p>
                <h3 className="mt-4 font-serif text-[2rem] leading-[0.98] text-stone-950">{entry.name}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{entry.highlight}</p>
                <p className="mt-6 text-sm font-semibold text-stone-950">{formatCurrency(entry.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function buildProductExperience(
  product: Product,
  products: Product[],
  related: Product[],
  complementary: Product[],
): ProductExperience {
  const primaryConcern = product.concerns[0] ?? "luminosidad";
  const secondaryConcern = product.concerns[1] ?? "textura";
  const idealFor = [...product.skinTypes, ...product.concerns].slice(0, 4);
  const notRecommendedIf =
    product.category === "Tratamientos" || product.category === "Serums"
      ? "Tu barrera esta muy sensibilizada o quieres usar demasiados activos al mismo tiempo. Mejor entra poco a poco y con constancia."
      : product.category === "Protector Solar"
        ? "Esperas que un solo paso corrija tono o firmeza. Aqui protege muy bien, pero funciona mejor dentro de una rutina completa."
        : "Buscas un cambio inmediato sin sostener manana y noche. Esta formula se luce mas cuando la rutina se vuelve estable.";

  return {
    benefitCards: buildBenefitCards(product),
    editorialComplements: [...complementary, ...related].slice(0, 3),
    idealFor,
    ingredientCards: product.ingredients.map((ingredient) => ({
      name: ingredient,
      effect: ingredientGlossary[ingredient] ?? buildFallbackIngredientEffect(ingredient, primaryConcern),
    })),
    notRecommendedIf,
    resultTimeline: buildResultTimeline(primaryConcern, secondaryConcern),
    routineSteps: buildRoutineSteps(product, products),
    usageTimeline: buildUsageTimeline(product, primaryConcern),
  };
}

function buildBenefitCards(product: Product) {
  const concern = product.concerns[0]?.toLowerCase() ?? "uniformidad";

  if (product.category === "Limpiadores") {
    return [
      {
        title: "Limpia",
        description: "Retira residuos y exceso sin dejar a la piel tirante ni incomoda.",
        tone: "bg-[#f7efe7]",
      },
      {
        title: "Calma",
        description: "Hace que la limpieza se sienta suave desde el primer contacto.",
        tone: "bg-white",
      },
      {
        title: "Respeta",
        description: "Mantiene la barrera mas tranquila para que lo que sigue se tolere mejor.",
        tone: "bg-[#fbf4ec]",
      },
      {
        title: "Prepara",
        description: `Deja la piel lista para trabajar ${concern} con mas constancia.`,
        tone: "bg-[#f3e8de]",
      },
    ];
  }

  if (product.category === "Protector Solar") {
    return [
      {
        title: "Protege",
        description: "Cierra la rutina con defensa diaria frente al sol.",
        tone: "bg-[#f7efe7]",
      },
      {
        title: "Previene",
        description: "Ayuda a que manchas y sensibilidad no se intensifiquen tan facil.",
        tone: "bg-white",
      },
      {
        title: "Acompana",
        description: "Se reaplica con mas facilidad cuando la textura no pesa.",
        tone: "bg-[#fbf4ec]",
      },
      {
        title: "Sostiene",
        description: "Convierte el tratamiento previo en un esfuerzo que vale la pena proteger.",
        tone: "bg-[#f3e8de]",
      },
    ];
  }

  if (product.category === "Hidratantes") {
    return [
      {
        title: "Hidrata",
        description: "Deja una sensacion mas flexible y menos tirante desde las primeras aplicaciones.",
        tone: "bg-[#f7efe7]",
      },
      {
        title: "Sella",
        description: "Ayuda a que el resto de la rutina no se evapore demasiado rapido.",
        tone: "bg-white",
      },
      {
        title: "Conforta",
        description: "Hace que la piel se sienta mas arropada sin perder elegancia en la textura.",
        tone: "bg-[#fbf4ec]",
      },
      {
        title: "Suaviza",
        description: "Con constancia, la piel suele verse mas lisa y descansada.",
        tone: "bg-[#f3e8de]",
      },
    ];
  }

  return [
    {
      title: "Uniforma",
      description: `Trabaja ${concern} con una formula pensada para sostenerse mejor en el tiempo.`,
      tone: "bg-[#f7efe7]",
    },
    {
      title: "Suaviza",
      description: "La textura suele verse mas pulida cuando la rutina se vuelve constante.",
      tone: "bg-white",
    },
    {
      title: "Acompana",
      description: "No busca impresionar en una noche. Busca que si quieras seguir usandolo.",
      tone: "bg-[#fbf4ec]",
    },
    {
      title: "Equilibra",
      description: "Ayuda a que la piel se sienta tratada sin entrar en exceso.",
      tone: "bg-[#f3e8de]",
    },
  ];
}

function buildUsageTimeline(product: Product, primaryConcern: string) {
  const usageText = product.usage.join(" ").toLowerCase();
  const frequency =
    usageText.includes("alternados")
      ? "Empieza en dias alternados y sube cuando la piel se vea comoda."
      : usageText.includes("2 a 3")
        ? "Dos a tres veces por semana al principio, luego segun tolerancia."
        : usageText.includes("dia y de noche")
          ? "Manana y noche, como parte de una rutina estable."
          : usageText.includes("cada 2 a 3 horas")
            ? "Reaplicalo durante el dia cada vez que la exposicion lo pida."
            : "Manten una frecuencia constante para que el cambio no dependa de impulsos.";

  const morning =
    product.category === "Protector Solar"
      ? "Ultimo paso de cada manana, antes de salir."
      : product.category === "Tratamientos"
        ? "Solo si tu piel ya lo tolera y siempre seguido de protector solar."
        : product.category === "Serums"
          ? "Despues de limpiar y antes de la crema, si tu piel lo recibe bien."
          : product.usage[0];

  const night =
    product.category === "Protector Solar"
      ? "Por la noche ya no hace falta. Cambia a limpieza, tratamiento e hidratacion."
      : product.category === "Limpiadores"
        ? "Repite el gesto para retirar el dia sin resecar de mas."
        : product.usage[1] ?? product.usage[0];

  return [
    {
      label: "Manana",
      title: "Empieza ligera",
      description: morning,
    },
    {
      label: "Noche",
      title: "Trabaja sin prisa",
      description: night,
    },
    {
      label: "Frecuencia",
      title: "Constancia antes que intensidad",
      description: frequency,
    },
    {
      label: "Resultados",
      title: "Expectativa realista",
      description: `Suele sentirse primero en confort y textura. ${primaryConcern} se entiende mejor cuando la piel recibe tiempo y repeticion.`,
    },
  ];
}

function buildRoutineSteps(product: Product, products: Product[]) {
  const currentSlot =
    product.category === "Limpiadores"
      ? "limpiador"
      : product.category === "Hidratantes"
        ? "hidratante"
        : product.category === "Protector Solar"
          ? "protector"
          : "tratamiento";

  const pickByCategory = (categories: string[]) =>
    products.find(
      (entry) =>
        entry.id !== product.id &&
        categories.includes(entry.category),
    ) ?? product;

  const slots = [
    {
      key: "limpiador",
      slot: "Limpieza",
      product: currentSlot === "limpiador" ? product : pickByCategory(["Limpiadores"]),
      note:
        currentSlot === "limpiador"
          ? "Aqui empieza todo: una limpieza que no rompa el equilibrio."
          : "Empieza con limpieza suave para que el resto de la rutina entre mejor.",
    },
    {
      key: "tratamiento",
      slot: "Tratamiento",
      product:
        currentSlot === "tratamiento"
          ? product
          : pickByCategory(["Serums", "Tratamientos", "Esencias"]),
      note:
        currentSlot === "tratamiento"
          ? "Este es el paso que lleva la transformacion principal."
          : "Aqui entra el activo que empuja tono, textura o brotes con mas direccion.",
    },
    {
      key: "hidratante",
      slot: "Hidratacion",
      product: currentSlot === "hidratante" ? product : pickByCategory(["Hidratantes"]),
      note:
        currentSlot === "hidratante"
          ? "Este paso sella confort para que la rutina se sostenga mejor."
          : "Despues, una capa que mantenga confort y flexibilidad.",
    },
    {
      key: "protector",
      slot: "Proteccion solar",
      product: currentSlot === "protector" ? product : pickByCategory(["Protector Solar"]),
      note:
        currentSlot === "protector"
          ? "Asi se protege el trabajo previo frente al sol diario."
          : "Por la manana, termina con proteccion para cuidar lo que ya estas corrigiendo.",
    },
  ];

  return slots.map((entry) => ({
    isCurrent: entry.product.id === product.id,
    label: entry.product.id === product.id ? "Este es tu paso clave" : "Ver producto",
    note: entry.note,
    product: entry.product,
    slot: entry.slot,
  }));
}

function buildResultTimeline(primaryConcern: string, secondaryConcern: string) {
  return [
    {
      label: "Semana 1",
      title: "Mas comodidad",
      description: "Lo primero suele sentirse en confort, textura y ganas de repetir la rutina.",
    },
    {
      label: "Semana 2",
      title: "Ritmo estable",
      description: `La piel empieza a responder mejor cuando ${secondaryConcern.toLowerCase()} deja de depender de impulsos.`,
    },
    {
      label: "Semana 4",
      title: "Cambio visible",
      description: `Con constancia, ${primaryConcern.toLowerCase()} suele verse mas ordenado y menos dominante.`,
    },
    {
      label: "Semana 8",
      title: "Transformacion sostenida",
      description: "No es magia rapida. Es una mejora mas clara, construida por repeticion y tolerancia.",
    },
  ];
}

function buildFallbackIngredientEffect(ingredient: string, primaryConcern: string) {
  return `${ingredient} acompana una rutina enfocada en ${primaryConcern.toLowerCase()} sin volverla mas pesada de lo necesario.`;
}

function formatJoinedList(values: string[]) {
  if (values.length === 0) {
    return "lo que tu piel necesita hoy";
  }

  if (values.length === 1) {
    return values[0].toLowerCase();
  }

  return `${values.slice(0, -1).join(", ").toLowerCase()} y ${values.at(-1)?.toLowerCase()}`;
}
