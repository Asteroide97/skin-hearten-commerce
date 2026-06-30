"use client";

import Link from "next/link";

import { SkinQuizModal } from "@/components/quiz/skin-quiz-modal";
import { SkinQuizTrigger } from "@/components/quiz/skin-quiz-trigger";
import { CartIcon, WhatsAppIcon } from "@/components/shared/icons";
import { SiteSearch } from "@/components/layout/site-search";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";

const navItems = [
  { href: "/productos", label: "Productos" },
  { href: "/productos?problema=Manchas", label: "Manchas" },
  { href: "/productos?problema=Firmeza", label: "Antiedad" },
  { href: "/productos?categoria=protector-solar", label: "Protector solar" },
  { href: "/reviews", label: "Resenas" },
  { href: "/blog", label: "Blog" },
  { href: "/cuenta", label: "Cuenta" },
];

type SiteHeaderProps = {
  catalogProducts: Product[];
};

export function SiteHeader({ catalogProducts }: SiteHeaderProps) {
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <>
      <SkinQuizModal catalogProducts={catalogProducts} />
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/92 backdrop-blur">
        <div className="border-b border-stone-200/70 bg-[#f6efe7]">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-5 py-2 text-[11px] tracking-[0.08em] text-stone-600 sm:px-6 lg:px-8">
            <p>Skin Hearten. Journal of skincare.</p>
            <p className="hidden sm:block">Asesoria por WhatsApp y envios a todo Mexico</p>
          </div>
        </div>
        <div className="mx-auto max-w-[1320px] px-5 py-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
            <Link className="shrink-0 font-serif text-[1.8rem] leading-none tracking-[-0.05em] text-stone-950 sm:text-[2rem]" href="/">
              Skin Hearten
            </Link>
            <SiteSearch className="hidden flex-1 lg:block" />
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Link
                className="btn-secondary gap-2 px-3.5 py-2.5 text-sm"
                href="https://wa.me/525500000000?text=Hola%20Skin%20Hearten%2C%20necesito%20asesoria%20para%20mi%20rutina."
                target="_blank"
              >
                <WhatsAppIcon className="text-[#1a6f4e]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Link>
              <Link
                className="btn-ghost hidden px-4 py-2.5 md:inline-flex"
                href="/cuenta"
              >
                Cuenta
              </Link>
              <Link
                className="btn-primary gap-2 px-4 py-2.5"
                href="/carrito"
              >
                <CartIcon className="h-4 w-4" />
                <span>Carrito</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{itemCount}</span>
              </Link>
            </div>
          </div>
          <SiteSearch className="mt-4 lg:hidden" />
          <nav className="mt-4 flex gap-1.5 overflow-x-auto border-t border-stone-200 pt-4 text-sm text-stone-700">
            <SkinQuizTrigger
              className="btn-secondary whitespace-nowrap px-4 py-2.5"
              source="header"
            >
              Encontrar mi rutina
            </SkinQuizTrigger>
            {navItems.map((item) => (
              <Link
                className="inline-flex whitespace-nowrap rounded-full px-4 py-2.5 text-stone-700 transition hover:bg-stone-100/80 hover:text-stone-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
