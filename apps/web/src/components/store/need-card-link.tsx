"use client";

import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/shared/icons";
import { trackEvent, type NeedAnalyticsValue } from "@/lib/analytics";

type NeedCardLinkProps = {
  accent: string;
  analyticsNeed: NeedAnalyticsValue;
  description: string;
  eyebrow: string;
  href: string;
  title: string;
};

export function NeedCardLink({
  accent,
  analyticsNeed,
  description,
  eyebrow,
  href,
  title,
}: NeedCardLinkProps) {
  return (
    <Link
      className="group relative overflow-hidden rounded-[2.1rem] border border-stone-200/80 bg-[#fcf8f3] transition duration-300 hover:-translate-y-1 hover:border-stone-300"
      href={href}
      onClick={() => {
        trackEvent("need_card_click", {
          need: analyticsNeed,
        });
      }}
    >
      <div className={`absolute right-4 top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-80 blur-2xl`} />
      <div className="absolute right-5 top-5 rounded-full border border-white/70 bg-white/80 p-2 text-stone-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <ArrowUpRightIcon />
      </div>
      <div className="relative flex min-h-[280px] flex-col justify-between p-6">
        <div>
          <p className="section-label">{eyebrow}</p>
          <h3 className="mt-14 max-w-[10rem] font-serif text-[2.15rem] leading-[0.96] text-stone-950">{title}</h3>
          <p className="mt-4 max-w-sm text-sm leading-7 text-stone-600">{description}</p>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
          <p className="text-sm font-semibold text-stone-900">Descubrir rutina</p>
          <span className="text-sm text-stone-500">Ver seleccion</span>
        </div>
      </div>
    </Link>
  );
}
