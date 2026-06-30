"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { Product } from "@/lib/types";

type SiteFrameProps = {
  catalogProducts: Product[];
  children: React.ReactNode;
};

export function SiteFrame({ catalogProducts, children }: SiteFrameProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="app-shell min-h-screen bg-[linear-gradient(180deg,#f8f4ef_0%,#f5f0e9_100%)]">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <SiteHeader catalogProducts={catalogProducts} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
