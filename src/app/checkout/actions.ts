"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/pricing";

export interface PlaceOrderInput {
  items: { productId: string; quantity: number }[];
  contact: { email: string; fullName: string; phone: string };
  address: { line1: string; line2: string; city: string; region: string; postalCode: string };
  paymentMethod: PaymentMethod;
  couponCode: string;
  notes: string;
  saveAddress: boolean;
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; token: string }
  | { ok: false; error: string; field?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9\s-]{7,20}$/;
const trim = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function friendlyError(message: string): PlaceOrderResult {
  if (message.includes("OUT_OF_STOCK")) {
    const name = message.split("OUT_OF_STOCK:")[1]?.split("\n")[0]?.trim();
    return { ok: false, error: `${name || "An item"} doesn't have enough stock left. Please update your bag.` };
  }
  if (message.includes("PRODUCT_UNAVAILABLE")) return { ok: false, error: "An item in your bag is no longer available." };
  if (message.includes("INVALID_COUPON")) return { ok: false, error: "That discount code can't be used.", field: "coupon" };
  if (message.includes("EMPTY_CART")) return { ok: false, error: "Your bag is empty." };
  if (message.includes("INVALID_QUANTITY")) return { ok: false, error: "Please choose between 1 and 10 of each kit." };
  if (message.includes("INVALID_DETAILS")) return { ok: false, error: "Please check your contact and delivery details." };
  return { ok: false, error: "We couldn't place your order. Please try again." };
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "The store isn't connected yet. Please try again later." };

  const contact = {
    email: trim(input.contact?.email).toLowerCase(),
    full_name: trim(input.contact?.fullName, 120),
    phone: trim(input.contact?.phone, 30),
  };
  const address = {
    line1: trim(input.address?.line1),
    line2: trim(input.address?.line2),
    city: trim(input.address?.city, 80),
    region: trim(input.address?.region, 80),
    country: "AE",
    postal_code: trim(input.address?.postalCode, 20),
  };

  if (!contact.full_name) return { ok: false, error: "Please enter your full name.", field: "fullName" };
  if (!EMAIL.test(contact.email)) return { ok: false, error: "Please enter a valid email address.", field: "email" };
  if (!PHONE.test(contact.phone)) return { ok: false, error: "Please enter a valid phone number.", field: "phone" };
  if (!address.line1) return { ok: false, error: "Please enter your street address.", field: "line1" };
  if (!address.city) return { ok: false, error: "Please enter your city or area.", field: "city" };
  if (!address.region) return { ok: false, error: "Please choose your emirate.", field: "region" };

  const items = (Array.isArray(input.items) ? input.items : [])
    .filter((i) => typeof i?.productId === "string" && Number.isInteger(i.quantity))
    .slice(0, 20)
    .map((i) => ({ product_id: i.productId, quantity: i.quantity }));
  if (items.length === 0) return { ok: false, error: "Your bag is empty." };

  const paymentMethod: PaymentMethod = input.paymentMethod === "card" ? "card" : "cod";
  if (paymentMethod === "card") return { ok: false, error: "Card payments are coming soon. Please choose cash on delivery." };

  const { data, error } = await supabase.rpc("place_order", {
    p_items: items,
    p_contact: contact,
    p_address: address,
    p_payment_method: paymentMethod,
    p_coupon_code: trim(input.couponCode, 40) || null,
    p_notes: trim(input.notes, 1000) || null,
  });

  if (error || !data) {
    console.error("[checkout] place_order failed:", error?.message);
    return friendlyError(error?.message ?? "");
  }

  const user = await getCurrentUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ full_name: contact.full_name, phone: contact.phone })
      .eq("id", user.id);

    if (input.saveAddress) {
      const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      await supabase.from("addresses").insert({
        user_id: user.id,
        full_name: contact.full_name,
        phone: contact.phone,
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        region: address.region,
        country: address.country,
        postal_code: address.postal_code || null,
        is_default: !count,
      });
    }
  }

  const result = data as { order_number: string; access_token: string };
  return { ok: true, orderNumber: result.order_number, token: result.access_token };
}

export async function checkCoupon(code: string, subtotal: number) {
  const supabase = await createClient();
  if (!supabase) return { valid: false, message: "Discount codes aren't available right now." };
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: trim(code, 40),
    p_subtotal: Math.max(0, Number(subtotal) || 0),
  });
  if (error || !data) return { valid: false, message: "This code is not valid." };
  return data as { valid: boolean; code?: string; discount?: number; message: string };
}
