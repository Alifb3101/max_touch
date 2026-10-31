import Image from "next/image";
import Link from "next/link";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatDate, money } from "@/lib/format";
import { canOptimize, mediaUrl } from "@/lib/media";
import type { OrderSummary } from "@/lib/types";

export default function OrderSummaryView({ order }: { order: OrderSummary }) {
  const a = order.shipping_address;
  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="sp-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="sp-eyebrow">Order {order.order_number}</p>
          <span className="rounded-full border border-gold/60 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-burgundy uppercase">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <p className="mt-1 text-[0.8rem] text-taupe/70">Placed {formatDate(order.created_at)}</p>
        <ul className="mt-6 divide-y divide-mauve/60">
          {order.items.map((item, i) => {
            const img = mediaUrl(item.image_url);
            return (
              <li key={`${item.product_name}-${i}`} className="flex items-center gap-4 py-4">
                <span className="relative size-16 flex-none rounded-xl bg-[radial-gradient(circle_at_35%_30%,#fff,#F3DCD4_75%)]">
                  {img && <Image src={img} alt="" fill sizes="64px" className="object-contain p-1.5" unoptimized={!canOptimize(img)} />}
                </span>
                <span className="min-w-0 flex-1">
                  {item.product_slug ? (
                    <Link href={`/kits/${item.product_slug}`} className="font-display text-[1.15rem] text-burgundy italic">
                      {item.product_name}
                    </Link>
                  ) : (
                    <span className="font-display text-[1.15rem] text-burgundy italic">{item.product_name}</span>
                  )}
                  <span className="block text-[0.75rem] text-taupe/70">
                    {item.size_label ? `${item.size_label} kit · ` : ""}Qty {item.quantity}
                  </span>
                </span>
                <span className="text-[0.9rem] font-semibold text-burgundy">{money(Number(item.line_total), order.currency)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-mauve/60 pt-4 text-[0.85rem]">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{money(Number(order.subtotal), order.currency)}</dd>
          </div>
          {Number(order.discount_total) > 0 && (
            <div className="flex justify-between">
              <dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd>− {money(Number(order.discount_total), order.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{Number(order.shipping_total) === 0 ? "Free" : money(Number(order.shipping_total), order.currency)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-[1.05rem] font-semibold text-burgundy">
            <dt>Total</dt>
            <dd>{money(Number(order.total), order.currency)}</dd>
          </div>
        </dl>
      </div>

      <aside className="sp-panel h-fit p-6 sm:p-8">
        <p className="sp-eyebrow">Delivering to</p>
        <address className="mt-3 text-[0.88rem] leading-relaxed text-taupe not-italic">
          <strong className="text-burgundy">{order.full_name}</strong>
          <br />
          {a.line1}
          {a.line2 ? (
            <>
              <br />
              {a.line2}
            </>
          ) : null}
          <br />
          {a.city}, {a.region}
          {a.postal_code ? ` ${a.postal_code}` : ""}
          <br />
          {order.phone}
          <br />
          {order.email}
        </address>
        <p className="sp-eyebrow mt-6">Payment</p>
        <p className="mt-2 text-[0.88rem] text-taupe">{PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</p>
      </aside>
    </div>
  );
}
