"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
};

export type AppliedCoupon = {
  code: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  discountAmount: number;
  freeShipping: boolean;
  message: string;
};

type CartState = {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCoupon: (coupon: AppliedCoupon) => void;
  clearCoupon: () => void;
  clearCart: () => void;
};

function normalizeQuantity(quantity: number) {
  return Math.max(1, Math.floor(quantity));
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartDiscount(coupon: AppliedCoupon | null | undefined) {
  return coupon?.discountAmount ?? 0;
}

export function getCartShipping(subtotal: number, coupon?: AppliedCoupon | null) {
  return subtotal >= 1999 || subtotal === 0 || coupon?.freeShipping ? 0 : 149;
}

export function getCartTotal(subtotal: number, discount: number, shipping: number) {
  return subtotal - discount + shipping;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  coupon: null,
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((entry) => entry.productId === item.productId);
      if (existing) {
        return {
          coupon: null,
          items: state.items.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, quantity: normalizeQuantity(entry.quantity + 1) }
              : entry,
          ),
        };
      }

      return {
        coupon: null,
        items: [...state.items, { ...item, quantity: 1 }],
      };
    }),
  removeItem: (productId) =>
    set((state) => ({
      coupon: null,
      items: state.items.filter((item) => item.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      coupon: null,
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item,
      ),
    })),
  setCoupon: (coupon) => set({ coupon }),
  clearCoupon: () => set({ coupon: null }),
  clearCart: () => set({ items: [], coupon: null }),
}));
