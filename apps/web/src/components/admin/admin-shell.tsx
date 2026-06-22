"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/crm/reminders", label: "Recordatorios" },
  { href: "/admin/crm/templates", label: "Plantillas CRM" },
  { href: "/admin/crm/automations", label: "Automatizaciones" },
  { href: "/admin/skin-quiz-analytics", label: "Skin Quiz Analytics" },
  { href: "/admin/skin-quiz-leads", label: "Skin Quiz Leads" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[250px_1fr] lg:px-8">
      <aside className="soft-panel h-fit rounded-[1.8rem] p-6">
        <p className="font-serif text-3xl text-stone-900">SuperAdmin</p>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Base preparada para productos, inventario, pedidos, clientes, blog, cupones y ajustes.
        </p>
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
