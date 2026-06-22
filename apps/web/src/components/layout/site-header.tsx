"use client";

import Link from "next/link";

import { SkinQuizModal } from "@/components/quiz/skin-quiz-modal";
import { SkinQuizTrigger } from "@/components/quiz/skin-quiz-trigger";
import { CartIcon, WhatsAppIcon } from "@/components/shared/icons";
import { SiteSearch } from "@/components/layout/site-search";
import { useCartStore } from "@/store/cart-store";

const navItems = [
  { href: "/productos", label: "Productos" },
  { href: "/productos?problema=Manchas", label: "Manchas" },
  { href: "/productos?problema=Firmeza", label: "Antiedad" },
  { href: "/productos?categoria=protector-solar", label: "Protector solar" },
  { href: "/blog", label: "Blog" },
  { href: "/cuenta", label: "Cuenta" },
];

export function SiteHeader() {
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <>
      <SkinQuizModal />
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur">
        <div className="border-b border-stone-200/70 bg-[#f7efe8]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-2 text-[11px] uppercase tracking-[0.24em] text-stone-600 sm:px-6 lg:px-8">
            <p>Skincare premium por necesidad real</p>
            <p className="hidden sm:block">Envios a todo Mexico y asesoria por WhatsApp</p>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 lg:gap-6">
            <Link className="shrink-0 font-serif text-[1.8rem] text-stone-950 sm:text-[2rem]" href="/">
              Skin Hearten
            </Link>
            <SiteSearch className="hidden flex-1 lg:block" />
            <div className="flex shrink-0 items-center gap-2">
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[#d9c4b2] bg-[#fff8f3] px-3 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400"
                href="https://wa.me/525500000000?text=Hola%20Skin%20Hearten%2C%20necesito%20asesoria%20para%20mi%20rutina."
                target="_blank"
              >
                <WhatsAppIcon className="text-[#1a6f4e]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Link>
              <Link
                className="hidden rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 md:inline-flex"
                href="/cuenta"
              >
                Mi cuenta
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-sm font-medium text-white"
                href="/carrito"
              >
                <CartIcon className="h-4 w-4" />
                <span>Carrito</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{itemCount}</span>
              </Link>
            </div>
          </div>
          <SiteSearch className="mt-4 lg:hidden" />
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm text-stone-700">
            <SkinQuizTrigger
              className="inline-flex whitespace-nowrap rounded-full border border-[#d9c4b2] bg-[#fff8f3] px-4 py-2 font-medium text-stone-900 transition hover:border-stone-500"
              source="header"
            >
              Encontrar mi rutina
            </SkinQuizTrigger>
            {navItems.map((item) => (
              <Link
                className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 py-2 transition hover:border-stone-400 hover:text-stone-950"
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
