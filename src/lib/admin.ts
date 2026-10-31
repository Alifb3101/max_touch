import "server-only";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "./supabase/server";

/** Signed-in store owner. Everyone else is sent away. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const supabase = await createClient();
  if (!supabase) redirect("/login?next=/admin");
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/account?notice=owner");
  return { user, supabase, name: (data.full_name as string | null) ?? "" };
}

export interface DashboardStats {
  products: number;
  active_products: number;
  low_stock: number;
  orders: number;
  open_orders: number;
  unpaid: number;
  order_value: number;
  customers: number;
}

export function deskMissing(message: string | undefined) {
  return Boolean(message && /could not find the function|schema cache|admin_dashboard|admin_save_product|admin_customers/i.test(message));
}
