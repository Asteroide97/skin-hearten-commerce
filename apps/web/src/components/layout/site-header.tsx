"use client";

import Link from "next/link";

import { useCartStore } from "@/store/cart-store";

const navItems = [
  { href: "/productos", label: "Productos" },
  { href: "/blog", label: "Blog" },
  { href: "/cuenta", label: "Cuenta" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
        <Link className="font-serif text-2xl text-stone-950" href="/">
          Skin Hearten
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
          {navItems.map((item) => (
            <Link className="transition hover:text-stone-950" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            className="hidden rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 sm:inline-flex"
            href="/ingresar"
          >
            Ingresar
          </Link>
          <Link
            className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white"
            href="/carrito"
          >
            Carrito ({itemCount})
          </Link>
        </div>
      </div>
    </header>
  );
}

