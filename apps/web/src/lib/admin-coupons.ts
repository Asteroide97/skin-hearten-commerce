export type AdminCouponDiscountType = "percentage" | "fixed_amount" | "free_shipping";

export type AdminCoupon = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: AdminCouponDiscountType;
  discountValue: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCouponWriteInput = {
  code: string;
  name: string;
  description?: string | null;
  discountType: AdminCouponDiscountType;
  discountValue: number;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  isActive: boolean;
};

export type AdminCouponUpdateInput = Partial<AdminCouponWriteInput>;

export const ADMIN_COUPON_DISCOUNT_TYPE_OPTIONS: Array<{
  value: AdminCouponDiscountType;
  label: string;
}> = [
  { value: "percentage", label: "Porcentaje" },
  { value: "fixed_amount", label: "Monto fijo" },
  { value: "free_shipping", label: "Envio gratis" },
];

export function getAdminCouponDiscountTypeLabel(discountType: AdminCouponDiscountType) {
  return (
    ADMIN_COUPON_DISCOUNT_TYPE_OPTIONS.find((option) => option.value === discountType)?.label ?? discountType
  );
}

export function getAdminCouponDiscountPreview(coupon: Pick<AdminCoupon, "discountType" | "discountValue">) {
  if (coupon.discountType === "free_shipping") {
    return "Envio gratis";
  }
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}%`;
  }
  return `$${coupon.discountValue.toFixed(2)} MXN`;
}
