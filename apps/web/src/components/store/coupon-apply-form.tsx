"use client";

import { useEffect, useMemo, useState } from "react";

import { buildCouponValidationRequest, validateCouponCode } from "@/lib/coupons";
import { formatCurrency } from "@/lib/format";
import { getCartDiscount, useCartStore } from "@/store/cart-store";

type CouponApplyFormProps = {
  customerEmail?: string;
  customerPhone?: string;
};

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

function getReasonMessage(reasonCode: string, fallbackMessage: string) {
  switch (reasonCode) {
    case "inactive":
      return "Este cupon ya no esta activo.";
    case "not_started":
      return "Este cupon aun no esta disponible.";
    case "expired":
      return "Este cupon ya expiro.";
    case "usage_limit_reached":
      return "Este cupon ya alcanzo su limite de uso.";
    case "per_customer_limit_reached":
      return "Ya usaste el limite permitido para este cupon.";
    case "subtotal_too_low":
      return fallbackMessage;
    case "invalid_code":
      return "El codigo no es valido.";
    case "valid":
    default:
      return fallbackMessage;
  }
}

export function CouponApplyForm({ customerEmail, customerPhone }: CouponApplyFormProps) {
  const { items, coupon, setCoupon, clearCoupon } = useCartStore();
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const discount = getCartDiscount(coupon);

  const [couponInput, setCouponInput] = useState(coupon?.code ?? "");
  const [notice, setNotice] = useState<Notice>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setCouponInput(coupon?.code ?? "");
  }, [coupon?.code]);

  async function handleApply() {
    if (items.length === 0) {
      setNotice({
        kind: "error",
        message: "Agrega productos antes de aplicar un cupon.",
      });
      return;
    }

    const normalizedCode = couponInput.trim();
    if (!normalizedCode) {
      clearCoupon();
      setNotice({
        kind: "error",
        message: "Ingresa un codigo de cupon.",
      });
      return;
    }

    setIsApplying(true);
    setNotice(null);

    const result = await validateCouponCode(
      buildCouponValidationRequest({
        code: normalizedCode,
        items,
        subtotal,
        customerEmail,
        customerPhone,
      }),
    );

    if (!result.ok) {
      clearCoupon();
      setNotice({
        kind: "error",
        message: result.message,
      });
      setIsApplying(false);
      return;
    }

    if (!result.data.valid || !result.data.code || !result.data.discountType) {
      clearCoupon();
      setNotice({
        kind: "error",
        message: getReasonMessage(result.data.reasonCode, result.data.message),
      });
      setIsApplying(false);
      return;
    }

    setCoupon({
      code: result.data.code,
      discountAmount: result.data.discountAmount,
      discountType: result.data.discountType,
      freeShipping: result.data.freeShipping,
      message: result.data.message,
    });
    setCouponInput(result.data.code);
    setNotice({
      kind: "success",
      message: getReasonMessage(result.data.reasonCode, result.data.message),
    });
    setIsApplying(false);
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-semibold text-stone-900">Cupon</span>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm uppercase tracking-[0.12em] text-stone-700"
            onChange={(event) => setCouponInput(event.target.value)}
            placeholder="GLOW10"
            value={couponInput}
          />
          <button
            className="rounded-full bg-stone-950 px-4 py-3 text-sm font-medium text-white disabled:bg-stone-300"
            disabled={isApplying}
            onClick={() => {
              void handleApply();
            }}
            type="button"
          >
            {isApplying ? "Validando..." : "Aplicar"}
          </button>
        </div>
      </label>

      {coupon ? (
        <div className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-900">{coupon.code}</p>
              <p className="mt-1 text-xs text-stone-500">
                {coupon.freeShipping
                  ? "Envio gratis confirmado en backend."
                  : `Descuento validado: -${formatCurrency(discount)}`}
              </p>
            </div>
            <button
              className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700"
              onClick={() => {
                clearCoupon();
                setCouponInput("");
                setNotice(null);
              }}
              type="button"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className={`text-sm ${notice.kind === "error" ? "text-red-700" : "text-stone-600"}`}>
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
