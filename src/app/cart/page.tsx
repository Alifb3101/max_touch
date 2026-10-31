import type { Metadata } from "next";
import CartView from "@/components/cart/CartView";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-24">
        <p className="sp-eyebrow sp-rise">Max Touch</p>
        <h1 className="sp-title sp-rise mt-3 mb-10 text-[clamp(2.4rem,5vw,3.8rem)]">Your bag</h1>
        <CartView />
      </section>
    </PageShell>
  );
}
