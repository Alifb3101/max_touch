import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import OrderSummaryView from "@/components/shop/OrderSummaryView";
import { createClient } from "@/lib/supabase/server";
import type { OrderSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ order?: string; token?: string }> };

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { order: orderNumber, token } = await searchParams;
  const supabase = await createClient();

  let order: OrderSummary | null = null;
  if (supabase && orderNumber && token) {
    const { data } = await supabase.rpc("get_order_by_token", { p_order_number: orderNumber, p_token: token });
    order = (data as OrderSummary | null) ?? null;
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        {order ? (
          <>
            <div className="sp-rise text-center">
              <p className="text-[2.2rem] text-gold" aria-hidden>
                ✦
              </p>
              <p className="sp-eyebrow mt-2">Thank you, {order.full_name.split(" ")[0]}</p>
              <h1 className="sp-title mt-3 text-[clamp(2.4rem,5vw,3.8rem)]">Your order is confirmed</h1>
              <p className="mx-auto mt-4 max-w-lg text-[0.9rem] leading-relaxed text-taupe/85">
                We&apos;ve received order <strong className="text-burgundy">{order.order_number}</strong> and will be in touch
                on {order.phone} to arrange delivery.
              </p>
            </div>
            <div className="sp-rise mt-12" style={{ "--d": "150ms" } as React.CSSProperties}>
              <OrderSummaryView order={order} />
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/makeup-kits" className="sp-btn">
                Continue shopping
              </Link>
              <Link href="/account" className="sp-btn sp-btn-ghost">
                My orders
              </Link>
            </div>
          </>
        ) : (
          <div className="sp-panel mx-auto max-w-xl px-8 py-16 text-center">
            <h1 className="sp-title text-[2rem]">We couldn&apos;t find that order</h1>
            <p className="mt-3 text-[0.9rem] text-taupe/80">Check the link in your confirmation, or sign in to see your orders.</p>
            <Link href="/account" className="sp-btn mt-8">
              My account
            </Link>
          </div>
        )}
      </section>
    </PageShell>
  );
}
