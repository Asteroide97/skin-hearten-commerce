"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/store/cart-store";

type AddToCartButtonProps = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  className?: string;
  label?: string;
};

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  className,
  label = "Agregar al carrito",
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  return (
    <button
      className={className ?? "btn-primary"}
      onClick={() => {
        addItem({ productId, slug, name, price });
        trackEvent("add_to_cart", {
          product_id: productId,
          product_name: name,
          quantity: 1,
          price,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      type="button"
    >
      {added ? "Agregado" : label}
    </button>
  );
}
