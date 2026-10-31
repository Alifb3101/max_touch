import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddressBook, ProfileForm, SignOutButton } from "@/components/account/AccountClient";
import PageShell from "@/components/layout/PageShell";
import { ORDER_STATUS_LABEL, formatDate, money } from "@/lib/format";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Address } from "@/lib/types";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const supabase = (await createClient())!;

  const [{ data: profile }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, role").eq("id", user.id).maybeSingle(),
    supabase
      .from("addresses")
      .select("id, label, full_name, phone, line1, line2, city, region, country, postal_code, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at"),
    supabase
      .from("orders")
      .select("order_number, status, total, currency, created_at, order_items(quantity)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 pt-14 pb-24">
        <div className="sp-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="sp-eyebrow">My account</p>
            <h1 className="sp-title mt-3 text-[clamp(2.4rem,5vw,3.6rem)]">{firstName ? `Hello, ${firstName}` : "Welcome"}</h1>
            <p className="mt-2 text-[0.85rem] text-taupe/80">{user.email}</p>
          </div>
          <SignOutButton />
        </div>

        {profile?.role === "admin" ? (
          <Link href="/admin" className="sp-panel sp-rise mt-8 block p-6 transition-colors hover:border-gold">
            <p className="sp-eyebrow">Shop desk</p>
            <p className="mt-2 font-display text-[1.6rem] text-burgundy">Add kits and manage orders</p>
          </Link>
        ) : null}

        {notice === "owner" && profile?.role !== "admin" ? (
          <section className="sp-panel mt-8 p-6 sm:p-8">
            <p className="sp-eyebrow">Shop desk</p>
            <p className="mt-3 text-[0.9rem] leading-relaxed">
              That page is for the store owner. In Supabase, open SQL Editor, run{" "}
              <span className="font-semibold text-burgundy">supabase/migrations/20261015000000_commerce_admin.sql</span>, then run this
              and sign in again:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-blush/50 p-4 text-[0.78rem] leading-relaxed text-burgundy">
              {`update public.profiles set role = 'admin'\nwhere id = (select id from auth.users where email = '${user.email.replace(/'/g, "''")}');`}
            </pre>
          </section>
        ) : null}

        <section id="orders" className="sp-panel sp-rise mt-10 p-6 sm:p-8" style={{ "--d": "80ms" } as React.CSSProperties}>
          <p className="sp-eyebrow">Orders</p>
          {orders && orders.length > 0 ? (
            <ul className="mt-5 divide-y divide-mauve/60">
              {orders.map((o) => {
                const count = (o.order_items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0);
                return (
                  <li key={o.order_number}>
                    <Link
                      href={`/account/orders/${o.order_number}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:text-burgundy"
                    >
                      <span>
                        <span className="block font-semibold text-burgundy">{o.order_number}</span>
                        <span className="text-[0.78rem] text-taupe/70">
                          {formatDate(o.created_at)} · {count} item{count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="rounded-full border border-gold/60 px-3 py-1 text-[0.62rem] font-semibold tracking-[0.14em] text-burgundy uppercase">
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                        <span className="font-semibold">{money(Number(o.total), o.currency)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-[0.88rem] text-taupe/80">
              No orders yet.{" "}
              <Link href="/makeup-kits" className="sp-link">
                Find your first kit
              </Link>
            </p>
          )}
        </section>

        <section className="sp-panel sp-rise mt-8 p-6 sm:p-8" style={{ "--d": "140ms" } as React.CSSProperties}>
          <p className="sp-eyebrow mb-5">Your details</p>
          <ProfileForm userId={user.id} fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
        </section>

        <section className="sp-panel sp-rise mt-8 p-6 sm:p-8" style={{ "--d": "200ms" } as React.CSSProperties}>
          <p className="sp-eyebrow mb-5">Addresses</p>
          <AddressBook userId={user.id} addresses={(addresses ?? []) as Address[]} />
        </section>
      </section>
    </PageShell>
  );
}
