import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { getProducts } from "@/lib/storefront-api";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Skin Hearten | Skincare premium",
    template: "%s | Skin Hearten",
  },
  description:
    "Skincare premium con enfoque mobile first para manchas, antiedad, sensibilidad, hidratacion y proteccion solar.",
  openGraph: {
    type: "website",
    siteName: "Skin Hearten",
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalogProducts = await getProducts();

  return (
    <html className={`${inter.variable} ${playfair.variable}`} lang="es">
      <body className="font-sans text-stone-900">
        <Providers>
          <div className="app-shell flex min-h-screen flex-col">
            <SiteHeader catalogProducts={catalogProducts} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
