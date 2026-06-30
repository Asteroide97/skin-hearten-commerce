import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { SiteFrame } from "@/components/layout/site-frame";
import { Providers } from "@/components/providers";
import { getProducts } from "@/lib/storefront-api";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
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
    <html className={`${manrope.variable} ${newsreader.variable}`} lang="es">
      <body className="font-sans text-stone-900">
        <Providers>
          <SiteFrame catalogProducts={catalogProducts}>{children}</SiteFrame>
        </Providers>
      </body>
    </html>
  );
}
