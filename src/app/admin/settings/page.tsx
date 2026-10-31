import { SettingsForm } from "@/components/admin/DeskForms";
import { requireAdmin } from "@/lib/admin";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("store_settings")
    .select("currency, shipping_fee, free_shipping_threshold, cod_fee")
    .eq("id", true)
    .maybeSingle();

  return (
    <div>
      <p className="sp-eyebrow">Shop</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Delivery</h1>
      <p className="mt-3 max-w-xl text-[0.88rem] text-taupe/80">
        Checkout reads these numbers from the database. The price a customer pays cannot be edited in the browser.
      </p>
      <div className="mt-8">
        <SettingsForm
          currency={data?.currency ?? "AED"}
          shippingFee={Number(data?.shipping_fee ?? 0)}
          freeShippingThreshold={data?.free_shipping_threshold == null ? null : Number(data.free_shipping_threshold)}
          codFee={Number(data?.cod_fee ?? 0)}
        />
      </div>
    </div>
  );
}
