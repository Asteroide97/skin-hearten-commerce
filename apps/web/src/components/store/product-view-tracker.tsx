"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

type ProductViewTrackerProps = {
  productId: string;
  productName: string;
  category: string;
  price: number;
};

export function ProductViewTracker({
  productId,
  productName,
  category,
  price,
}: ProductViewTrackerProps) {
  useEffect(() => {
    trackEvent("product_view", {
      product_id: productId,
      product_name: productName,
      category,
      price,
    });
  }, [category, price, productId, productName]);

  return null;
}

