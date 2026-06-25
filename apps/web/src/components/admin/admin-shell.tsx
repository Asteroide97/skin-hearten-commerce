"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ADMIN_LOGIN_PATH } from "@/lib/admin-session";

const sections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/intelligence", label: "Centro de Inteligencia" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/reviews", label: "Resenas" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/imports/shopify", label: "Importar Shopify" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/crm/reminders", label: "Recordatorios" },
  { href: "/admin/crm/templates", label: "Plantillas CRM" },
  { href: "/admin/crm/automations", label: "Automatizaciones" },
  { href: "/admin/skin-quiz-analytics", label: "Skin Quiz Analytics" },
  { href: "/admin/skin-quiz-leads", label: "Skin Quiz Leads" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === ADMIN_LOGIN_PATH) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace(ADMIN_LOGIN_PATH);
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[250px_1fr] lg:px-8">
      <aside className="soft-panel h-fit rounded-[1.8rem] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-3xl text-stone-900">SuperAdmin</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Base preparada para productos, inventario, pedidos, clientes, blog, cupones y ajustes.
            </p>
          </div>
          <button
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSigningOut}
            onClick={() => {
              void handleSignOut();
            }}
            type="button"
          >
            {isSigningOut ? "Cerrando..." : "Cerrar sesion"}
          </button>
        </div>
        <nav className="mt-8 space-y-2">
          {sections.map((section) => {
            const isActive = pathname === section.href;

            return (
              <Link
                className={`block rounded-full px-4 py-3 text-sm font-medium ${
                  isActive ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-700"
                }`}
                href={section.href}
                key={section.href}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
