"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  couponCode?: string;
  discountRate: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyCoupon: (code: string) => boolean;
  clearCart: () => void;
};

function normalizeQuantity(quantity: number) {
  return Math.max(1, Math.floor(quantity));
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartDiscount(subtotal: number, discountRate: number) {
  return subtotal * discountRate;
}

export function getCartShipping(subtotal: number) {
  return subtotal >= 1999 || subtotal === 0 ? 0 : 149;
}

export function getCartTotal(subtotal: number, discount: number, shipping: number) {
  return subtotal - discount + shipping;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  couponCode: undefined,
  discountRate: 0,
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((entry) => entry.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, quantity: normalizeQuantity(entry.quantity + 1) }
              : entry,
          ),
        };
      }

      return {
        items: [...state.items, { ...item, quantity: 1 }],
      };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item,
      ),
    })),
  applyCoupon: (code) => {
    const normalized = code.trim().toUpperCase();
    if (normalized === "GLOW10") {
      set({ couponCode: normalized, discountRate: 0.1 });
      return true;
    }

    if (normalized === "ENVIOGRATIS") {
      set({ couponCode: normalized, discountRate: 0 });
      return true;
    }

    set({ couponCode: undefined, discountRate: 0 });
    return false;
  },
  clearCart: () => set({ items: [], couponCode: undefined, discountRate: 0 }),
}));

