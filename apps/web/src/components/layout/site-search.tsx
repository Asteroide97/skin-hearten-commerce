"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SearchIcon } from "@/components/shared/icons";

type SiteSearchProps = {
  className?: string;
};

export function SiteSearch({ className }: SiteSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const normalized = query.trim();
        const href = normalized ? `/productos?q=${encodeURIComponent(normalized)}` : "/productos";
        router.push(href);
      }}
    >
      <label className="sr-only" htmlFor="site-search">
        Buscar productos, marcas o ingredientes
      </label>
      <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(32,25,20,0.06)] transition focus-within:border-stone-400">
        <SearchIcon className="text-stone-400" />
        <input
          className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
          id="site-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar productos, marcas o ingredientes"
          type="search"
          value={query}
        />
        <button
          className="inline-flex shrink-0 items-center rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          type="submit"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
