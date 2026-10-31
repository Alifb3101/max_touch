import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatDate, money } from "@/lib/format";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filter = ORDER_STATUSES.find((s) => s === status);
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("orders")
    .select("order_number, full_name, email, total, currency, status, payment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;

  return (
    <div>
      <p className="sp-eyebrow">Sales</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Orders</h1>
      <p className="mt-3 max-w-xl text-[0.88rem] text-taupe/80">
        Customers see their own orders under My account. Everything placed in the shop is listed here.
      </p>

      <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="Filter orders">
        <Filter href="/admin/orders" current={!filter}>
          All
        </Filter>
        {ORDER_STATUSES.map((s) => (
          <Filter key={s} href={`/admin/orders?status=${s}`} current={filter === s}>
            {ORDER_STATUS_LABEL[s]}
          </Filter>
        ))}
      </nav>

      <ul className="mt-6 divide-y divide-mauve/60">
        {(data ?? []).map((o) => (
          <li key={o.order_number}>
            <Link href={`/admin/orders/${o.order_number}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-burgundy">
              <span>
                <span className="block font-semibold">{o.order_number}</span>
                <span className="text-[0.78rem] text-taupe/70">
                  {o.full_name} · {o.email} · {formatDate(o.created_at)}
                </span>
              </span>
              <span className="flex items-center gap-4">
                <span className="rounded-full border border-gold/60 px-3 py-1 text-[0.62rem] font-semibold tracking-[0.14em] uppercase">
                  {ORDER_STATUS_LABEL[o.status] ?? o.status}
                </span>
                <span className="font-semibold">{money(Number(o.total), o.currency)}</span>
              </span>
            </Link>
          </li>
        ))}
        {(data ?? []).length === 0 ? <li className="py-8 text-[0.9rem] text-taupe/70">No orders in this view.</li> : null}
      </ul>
    </div>
  );
}

function Filter({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.12em] whitespace-nowrap uppercase ${
        current ? "bg-burgundy text-ivory" : "bg-blush/60 text-burgundy"
      }`}
    >
      {children}
    </Link>
  );
}
