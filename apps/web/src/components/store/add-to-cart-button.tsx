"use client";

import { useState } from "react";

import { useCartStore } from "@/store/cart-store";

type AddToCartButtonProps = {
  productId: string;
  slug: string;
  name: string;
  price: number;
};

export function AddToCartButton({ productId, slug, name, price }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  return (
    <button
      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
      onClick={() => {
        addItem({ productId, slug, name, price });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      type="button"
    >
      {added ? "Agregado" : "Agregar al carrito"}
    </button>
  );
}

