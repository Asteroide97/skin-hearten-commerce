"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

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
    <>
      <div className="admin-workspace mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-5 lg:px-6 xl:px-8">
        <div className="grid items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-8">
          <aside className="hidden xl:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[1.5rem] border border-stone-200 bg-[#fbf7f2] px-4 py-5">
              <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-5">
                <div>
                  <p className="section-label">Skin Hearten Admin</p>
                  <p className="mt-2 font-serif text-[1.9rem] leading-none text-stone-950">SuperAdmin</p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Operacion compacta para catalogo, clientes, pedidos y decisiones.
                  </p>
                </div>
                <button
                  className="btn-ghost border border-stone-300 px-3 py-2 text-[11px]"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOut();
                  }}
                  type="button"
                >
                  {isSigningOut ? "Cerrando" : "Salir"}
                </button>
              </div>

              <nav className="mt-5 space-y-1">
                {sections.map((section) => {
                  const isActive = pathname === section.href;

                  return (
                    <Link
                      className={`flex items-center justify-between rounded-[1rem] px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-stone-950 text-white"
                          : "text-stone-700 hover:bg-white hover:text-stone-950"
                      }`}
                      href={section.href}
                      key={section.href}
                    >
                      <span>{section.label}</span>
                      {isActive ? <span className="text-[10px] tracking-[0.08em] text-white/75">Actual</span> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="sticky top-3 z-30 rounded-[1.2rem] border border-stone-200 bg-[#fbf7f2]/95 px-4 py-3 backdrop-blur xl:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Skin Hearten Admin</p>
                  <p className="mt-1 font-serif text-2xl text-stone-950">SuperAdmin</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() => {
                      setIsNavOpen(true);
                    }}
                    type="button"
                  >
                    Menu
                  </button>
                  <button
                    className="btn-ghost border border-stone-300 px-3 py-2 text-xs"
                    disabled={isSigningOut}
                    onClick={() => {
                      void handleSignOut();
                    }}
                    type="button"
                  >
                    Salir
                  </button>
                </div>
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>

      {isNavOpen ? (
        <div className="fixed inset-0 z-50 bg-stone-950/35 backdrop-blur-[2px] xl:hidden">
          <div className="absolute inset-y-0 left-0 w-full max-w-[320px] border-r border-stone-200 bg-[#fbf7f2] px-4 py-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <p className="section-label">Skin Hearten Admin</p>
                <p className="mt-2 font-serif text-[1.9rem] leading-none text-stone-950">SuperAdmin</p>
              </div>
              <button
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => {
                  setIsNavOpen(false);
                }}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <nav className="mt-5 space-y-1">
              {sections.map((section) => {
                const isActive = pathname === section.href;

                return (
                  <Link
                    className={`block rounded-[1rem] px-3.5 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-stone-950 text-white"
                        : "bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-950"
                    }`}
                    href={section.href}
                    key={section.href}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            aria-label="Cerrar menu"
            className="absolute inset-0 left-[320px]"
            onClick={() => {
              setIsNavOpen(false);
            }}
            type="button"
          />
        </div>
      ) : null}
    </>
  );
}
