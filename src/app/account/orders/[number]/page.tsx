import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import OrderSummaryView from "@/components/shop/OrderSummaryView";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { OrderSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ number: string }> };

export default async function OrderPage({ params }: Props) {
  const { number } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/orders/${encodeURIComponent(number)}`);
  const supabase = (await createClient())!;

  const { data } = await supabase
    .from("orders")
    .select(
      `order_number, status, payment_status, payment_method, email, full_name, phone, shipping_address, currency,
       subtotal, discount_total, shipping_total, total, coupon_code, created_at,
       items:order_items(product_name, product_slug, image_url, size_label, unit_price, quantity, line_total)`,
    )
    .eq("order_number", decodeURIComponent(number))
    .maybeSingle();
  if (!data) notFound();

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-14 pb-24">
        <Link href="/account#orders" className="text-[0.7rem] tracking-[0.16em] text-taupe/70 uppercase hover:text-burgundy">
          ← All orders
        </Link>
        <h1 className="sp-title sp-rise mt-4 mb-10 text-[clamp(2.2rem,4.5vw,3.4rem)]">Order {data.order_number}</h1>
        <OrderSummaryView order={data as unknown as OrderSummary} />
      </section>
    </PageShell>
  );
}
