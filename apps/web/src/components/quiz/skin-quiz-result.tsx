"use client";

import Link from "next/link";

import { ArrowUpRightIcon, CheckCircleIcon, WhatsAppIcon } from "@/components/shared/icons";
import { formatCurrency } from "@/lib/format";
import type { SkinQuizResult as SkinQuizResultValue } from "@/lib/skin-quiz";

type SkinQuizResultProps = {
  addButtonLabel: string;
  onAddRoutineToCart: () => void;
  onClose: () => void;
  onRestart: () => void;
  result: SkinQuizResultValue;
  whatsappHref: string;
};

export function SkinQuizResult({
  addButtonLabel,
  onAddRoutineToCart,
  onClose,
  onRestart,
  result,
  whatsappHref,
}: SkinQuizResultProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          Tu skincare advisor
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl text-stone-950 sm:text-4xl">Tu rutina recomendada</h2>
            <p className="max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{result.summary}</p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
            onClick={onRestart}
            type="button"
          >
            Volver a responder
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RoutineCard period="AM" steps={result.amRoutine} />
        <RoutineCard period="PM" steps={result.pmRoutine} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Productos recomendados</p>
            <h3 className="mt-2 font-serif text-2xl text-stone-900">Curados desde el catalogo actual</h3>
          </div>
          <p className="text-sm text-stone-500">{result.recommendedProducts.length} esenciales sugeridos</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {result.recommendedProducts.map((product) => (
            <article
              className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-soft"
              key={product.id}
            >
              <div className={`relative bg-gradient-to-br ${product.gradient} px-5 py-5`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_46%)]" />
                <div className="relative space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-700">
                      {product.category}
                    </span>
                    {product.bestSeller ? (
                      <span className="rounded-full bg-stone-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                        Bestseller
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{product.brand}</p>
                    <h4 className="mt-2 text-lg font-semibold leading-tight text-stone-950">{product.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{product.highlight}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-end gap-3">
                  {product.compareAtPrice ? (
                    <span className="text-sm text-stone-400 line-through">{formatCurrency(product.compareAtPrice)}</span>
                  ) : null}
                  <span className="text-xl font-semibold text-stone-950">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.concerns.slice(0, 2).map((concern) => (
                    <span
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600"
                      key={`${product.id}-${concern}`}
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:flex-wrap">
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          href={result.collectionHref}
          onClick={onClose}
        >
          Ver rutina completa
          <ArrowUpRightIcon />
        </Link>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c4b2] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
          href={whatsappHref}
          onClick={onClose}
          rel="noreferrer"
          target="_blank"
        >
          <WhatsAppIcon className="text-[#1a6f4e]" />
          Enviar mi rutina por WhatsApp
        </a>
        <button
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500"
          onClick={onAddRoutineToCart}
          type="button"
        >
          {addButtonLabel}
        </button>
      </div>

      <div className="rounded-[1.5rem] border border-[#ead9cb] bg-[#fffaf7] px-4 py-4 text-sm leading-6 text-stone-600">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#bb8f6f]" />
          <p>
            Esta recomendacion es orientativa y no sustituye una consulta dermatologica.
          </p>
        </div>
      </div>
    </div>
  );
}

type RoutineCardProps = {
  period: "AM" | "PM";
  steps: SkinQuizResultValue["amRoutine"];
};

function RoutineCard({ period, steps }: RoutineCardProps) {
  return (
    <section className="rounded-[1.8rem] border border-stone-200 bg-[#fffaf7] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Rutina {period}</p>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div className="rounded-[1.4rem] bg-white p-4 shadow-soft" key={`${period}-${step.slot}-${step.product.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{step.slot}</p>
                <h4 className="mt-2 text-base font-semibold text-stone-950">{step.product.name}</h4>
              </div>
              <span className="rounded-full border border-stone-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-600">
                {step.product.category}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">{step.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
