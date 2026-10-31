"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { ProductPayload } from "@/lib/product-draft";

export type DeskResult = { ok: true; id?: string; slug?: string } | { ok: false; error: string };

const MISSING =
  "The shop desk is not switched on in the database yet. In Supabase, open SQL Editor and run supabase/migrations/20261015000000_commerce_admin.sql, then try again.";

function friendly(message: string): string {
  if (/could not find the function|schema cache/i.test(message)) return MISSING;
  if (message.includes("FORBIDDEN")) return "Only the store owner can do that.";
  if (message.includes("COMPARE_PRICE")) return "The old price must be higher than the selling price.";
  if (message.includes("IMAGE_REQUIRED")) return "Add a card photo or a case photo before saving.";
  if (message.includes("SIZE_NOT_FOUND")) return "Choose a size.";
  if (message.includes("INVALID_PRODUCT")) return "Check the name, link, price and stock.";
  if (message.includes("OUT_OF_STOCK")) return "There is not enough stock left to reopen this order.";
  if (message.includes("CANNOT_DEMOTE_SELF")) return "You cannot remove your own owner access.";
  if (message.includes("products_slug") || (message.includes("duplicate key") && message.includes("slug"))) {
    return "Another kit already uses this link.";
  }
  if (message.includes("products_sku") || message.includes("sku")) return "Another kit already uses this SKU.";
  if (message.includes("NOT_FOUND")) return "That record is no longer there.";
  return "That could not be saved. Please try again.";
}

function refreshShop(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/kits/${slug}`);
}

export async function saveProduct(payload: ProductPayload): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_save_product", { p: payload });
  if (error) return { ok: false, error: friendly(error.message) };
  const saved = data as { id?: string; slug?: string } | null;
  refreshShop(saved?.slug);
  return { ok: true, id: saved?.id, slug: saved?.slug };
}

export async function deleteProduct(id: string): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  refreshShop();
  return { ok: true };
}

export async function updateOrder(input: {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  notes: string;
}): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_update_order", {
    p_order_number: input.orderNumber,
    p_status: input.status,
    p_payment_status: input.paymentStatus,
    p_notes: input.notes,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderNumber}`);
  revalidatePath("/account");
  return { ok: true };
}

export async function saveCoupon(input: {
  id?: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  expiresAt: string;
  isActive: boolean;
}): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const row = {
    code: input.code.trim().toUpperCase(),
    description: input.description.trim() || null,
    discount_type: input.discountType,
    value: input.value,
    min_subtotal: input.minSubtotal,
    max_uses: input.maxUses,
    expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    is_active: input.isActive,
  };
  const { error } = input.id
    ? await supabase.from("coupons").update(row).eq("id", input.id)
    : await supabase.from("coupons").insert(row);
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function setReviewApproval(id: string, approved: boolean): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("reviews").update({ is_approved: approved }).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  refreshShop();
  return { ok: true };
}

export async function saveSettings(input: {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  codFee: number;
}): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("store_settings")
    .update({
      currency: input.currency.trim().toUpperCase(),
      shipping_fee: input.shippingFee,
      free_shipping_threshold: input.freeShippingThreshold,
      cod_fee: input.codFee,
    })
    .eq("id", true);
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUserRole(userId: string, role: "customer" | "admin"): Promise<DeskResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/admin/customers");
  return { ok: true };
}
