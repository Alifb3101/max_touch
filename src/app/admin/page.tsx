import Link from "next/link";
import SetupBanner from "@/components/admin/SetupBanner";
import { deskMissing, requireAdmin, type DashboardStats } from "@/lib/admin";
import { ORDER_STATUS_LABEL, formatDate, money } from "@/lib/format";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();
  const [{ data: stats, error }, { data: recent }, { data: low }] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase
      .from("orders")
      .select("order_number, full_name, total, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("products").select("id, name, stock").eq("is_active", true).lte("stock", 5).order("stock").limit(6),
  ]);

  const desk = (stats ?? null) as DashboardStats | null;
  const missing = deskMissing(error?.message);

  const cards = desk
    ? [
        { label: "Open orders", value: String(desk.open_orders), href: "/admin/orders?status=pending" },
        { label: "Unpaid", value: String(desk.unpaid), href: "/admin/orders" },
        { label: "Kits on sale", value: String(desk.active_products), href: "/admin/products" },
        { label: "Low stock", value: String(desk.low_stock), href: "/admin/products" },
        { label: "Order value", value: money(Number(desk.order_value)), href: "/admin/orders" },
        { label: "Customers", value: String(desk.customers), href: "/admin/customers" },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sp-eyebrow">Today</p>
          <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">The shop</h1>
        </div>
        <Link href="/admin/products/new" className="sp-btn sp-btn-sm">
          Add a kit
        </Link>
      </div>

      {missing ? <div className="mt-8"><SetupBanner /></div> : null}

      {cards.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.label}>
              <Link href={card.href} className="sp-panel block p-5 transition-colors hover:border-gold">
                <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-taupe/70 uppercase">{card.label}</span>
                <span className="mt-2 block font-display text-[1.8rem] text-burgundy">{card.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="sp-panel p-6">
          <p className="sp-eyebrow">Latest orders</p>
          <ul className="mt-4 divide-y divide-mauve/60">
            {(recent ?? []).map((o) => (
              <li key={o.order_number}>
                <Link href={`/admin/orders/${o.order_number}`} className="flex items-center justify-between gap-3 py-3 hover:text-burgundy">
                  <span>
                    <span className="block font-semibold">{o.order_number}</span>
                    <span className="text-[0.75rem] text-taupe/70">
                      {o.full_name} · {formatDate(o.created_at)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold">{money(Number(o.total), o.currency)}</span>
                    <span className="text-[0.68rem] tracking-wide text-taupe/70 uppercase">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                  </span>
                </Link>
              </li>
            ))}
            {(recent ?? []).length === 0 ? <li className="py-4 text-[0.88rem] text-taupe/70">No orders yet. They appear here after checkout.</li> : null}
          </ul>
        </section>

        <section className="sp-panel p-6">
          <p className="sp-eyebrow">Running low</p>
          <ul className="mt-4 divide-y divide-mauve/60">
            {(low ?? []).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between py-3 hover:text-burgundy">
                  <span>{p.name}</span>
                  <span className="font-semibold">{p.stock} left</span>
                </Link>
              </li>
            ))}
            {(low ?? []).length === 0 ? <li className="py-4 text-[0.88rem] text-taupe/70">No kit is at 5 or below.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
