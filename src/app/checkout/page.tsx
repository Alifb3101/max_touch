import type { Metadata } from "next";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import PageShell from "@/components/layout/PageShell";
import { getStoreSettings } from "@/lib/catalog";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getStoreSettings(), getCurrentUser()]);

  let defaults = { email: "", fullName: "", phone: "", address: null as null | { line1: string; line2: string | null; city: string; region: string; postal_code: string | null } };
  if (user) {
    const supabase = await createClient();
    const [{ data: profile }, { data: address }] = await Promise.all([
      supabase!.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      supabase!
        .from("addresses")
        .select("line1, line2, city, region, postal_code")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    defaults = {
      email: user.email,
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      address: address ?? null,
    };
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-24">
        <p className="sp-eyebrow sp-rise">Secure checkout</p>
        <h1 className="sp-title sp-rise mt-3 mb-10 text-[clamp(2.4rem,5vw,3.8rem)]">Checkout</h1>
        {isSupabaseConfigured ? (
          <CheckoutForm settings={settings} signedIn={Boolean(user)} defaults={defaults} />
        ) : (
          <p className="sp-alert sp-alert-error">The store database isn&apos;t connected yet — add your Supabase keys to <code>.env.local</code>.</p>
        )}
      </section>
    </PageShell>
  );
}
