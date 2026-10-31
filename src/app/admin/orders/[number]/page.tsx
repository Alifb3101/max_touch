import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderEditor } from "@/components/admin/DeskForms";
import { requireAdmin } from "@/lib/admin";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatDate, money } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

type Props = { params: Promise<{ number: string }> };

export default async function AdminOrderPage({ params }: Props) {
  const { number } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_status, payment_method, email, full_name, phone, shipping_address,
       currency, subtotal, discount_total, shipping_total, total, coupon_code, notes, created_at,
       order_items(product_name, product_slug, image_url, size_label, unit_price, quantity, line_total)`,
    )
    .eq("order_number", number)
    .maybeSingle();

  if (!data) notFound();

  const { data: eventRows } = await supabase
    .from("order_events")
    .select("kind, from_value, to_value, note, created_at")
    .eq("order_id", data.id)
    .order("created_at");

  const address = data.shipping_address as {
    line1?: string;
    line2?: string | null;
    city?: string;
    region?: string;
    country?: string;
    postal_code?: string | null;
  };
  const items = (data.order_items ?? []) as {
    product_name: string;
    product_slug: string | null;
    image_url: string | null;
    size_label: string | null;
    unit_price: number | string;
    quantity: number;
    line_total: number | string;
  }[];
  const events = (eventRows ?? []) as { kind: string; from_value: string | null; to_value: string | null; note: string | null; created_at: string }[];

  return (
    <div>
      <Link href="/admin/orders" className="sp-link text-[0.8rem]">
        All orders
      </Link>
      <p className="sp-eyebrow mt-4">Order</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">{data.order_number}</h1>
      <p className="mt-2 text-[0.85rem] text-taupe/70">{formatDate(data.created_at)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-8">
          <section className="sp-panel p-6">
            <ul className="divide-y divide-mauve/60">
              {items.map((item, i) => {
                const photo = mediaUrl(item.image_url);
                return (
                  <li key={`${item.product_name}-${i}`} className="flex items-center gap-4 py-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <span className="h-14 w-14 rounded-xl bg-blush" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{item.product_name}</span>
                      <span className="text-[0.75rem] text-taupe/70">
                        {item.size_label} · {item.quantity} × {money(Number(item.unit_price), data.currency)}
                      </span>
                    </span>
                    <span className="font-semibold">{money(Number(item.line_total), data.currency)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-2 text-[0.88rem]">
              <Row label="Subtotal" value={money(Number(data.subtotal), data.currency)} />
              <Row label="Discount" value={money(Number(data.discount_total), data.currency)} />
              <Row label="Delivery" value={money(Number(data.shipping_total), data.currency)} />
              <Row label="Total" value={money(Number(data.total), data.currency)} strong />
            </dl>
          </section>

          <section className="sp-panel p-6">
            <p className="sp-eyebrow">Update</p>
            <div className="mt-5">
              <OrderEditor
                orderNumber={data.order_number}
                status={data.status}
                paymentStatus={data.payment_status}
                notes={data.notes ?? ""}
              />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="sp-panel p-6">
            <p className="sp-eyebrow">Customer</p>
            <p className="mt-3 font-semibold text-burgundy">{data.full_name}</p>
            <p className="text-[0.85rem]">{data.email}</p>
            <p className="text-[0.85rem]">{data.phone}</p>
            <p className="mt-4 text-[0.85rem] leading-relaxed">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.region}
              {address.postal_code ? ` ${address.postal_code}` : ""}
              <br />
              {address.country}
            </p>
            <p className="mt-4 text-[0.78rem] text-taupe/70">
              {PAYMENT_METHOD_LABEL[data.payment_method] ?? data.payment_method}
              {data.coupon_code ? ` · ${data.coupon_code}` : ""}
            </p>
          </section>

          <section className="sp-panel p-6">
            <p className="sp-eyebrow">History</p>
            <ol className="mt-4 space-y-3">
              {events.map((event, i) => (
                <li key={`${event.created_at}-${i}`} className="text-[0.82rem]">
                  <span className="block text-taupe/60">{formatDate(event.created_at)}</span>
                  <span>
                    {event.note
                      ? event.note
                      : `${event.kind === "payment" ? "Payment" : "Status"}: ${label(event.kind, event.from_value)} → ${label(event.kind, event.to_value)}`}
                  </span>
                </li>
              ))}
              {events.length === 0 ? <li className="text-[0.82rem] text-taupe/70">History starts after the latest SQL file is applied.</li> : null}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-burgundy" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function label(kind: string, value: string | null) {
  if (!value) return "—";
  if (kind === "payment") return PAYMENT_STATUS_LABEL[value] ?? value;
  return ORDER_STATUS_LABEL[value] ?? value;
}
