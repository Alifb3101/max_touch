import type { StoreSettings } from "./types";

export type PaymentMethod = "cod" | "card";

/** Mirrors the totals logic inside the `place_order` database function. */
export function computeTotals(subtotal: number, discount: number, settings: StoreSettings, method: PaymentMethod) {
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShipping = settings.freeShippingThreshold !== null && afterDiscount >= settings.freeShippingThreshold;
  const shipping = (freeShipping ? 0 : settings.shippingFee) + (method === "cod" ? settings.codFee : 0);
  return {
    subtotal,
    discount,
    shipping,
    freeShipping,
    total: Math.round((afterDiscount + shipping) * 100) / 100,
  };
}

export const MAX_QTY = 10;
