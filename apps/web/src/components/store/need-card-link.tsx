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
      className={`group relative overflow-hidden rounded-[1.9rem] border border-stone-200 bg-gradient-to-br ${accent} p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(33,26,20,0.12)]`}
      href={href}
      onClick={() => {
        trackEvent("need_card_click", {
          need: analyticsNeed,
        });
      }}
    >
      <div className="absolute right-4 top-4 rounded-full bg-white/75 p-2 text-stone-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <ArrowUpRightIcon />
      </div>
      <div className="relative flex min-h-[220px] flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">{eyebrow}</p>
          <h3 className="mt-8 font-serif text-3xl text-stone-900">{title}</h3>
          <p className="mt-4 max-w-sm text-sm leading-7 text-stone-700">{description}</p>
        </div>
        <p className="text-sm font-semibold text-stone-900">Descubrir rutina</p>
      </div>
    </Link>
  );
}
