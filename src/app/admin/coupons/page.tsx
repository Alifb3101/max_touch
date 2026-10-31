import { CouponManager } from "@/components/admin/DeskForms";
import { requireAdmin } from "@/lib/admin";

export default async function CouponsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("coupons")
    .select("id, code, description, discount_type, value, min_subtotal, max_uses, used_count, expires_at, is_active")
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="sp-eyebrow">Offers</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Coupons</h1>
      <p className="mt-3 max-w-xl text-[0.88rem] text-taupe/80">
        Codes are checked on the server at checkout. A customer cannot see the list or change the discount.
      </p>
      <div className="mt-8">
        <CouponManager
          coupons={(data ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            description: c.description,
            discount_type: c.discount_type,
            value: Number(c.value),
            min_subtotal: Number(c.min_subtotal),
            max_uses: c.max_uses,
            used_count: c.used_count,
            expires_at: c.expires_at,
            is_active: c.is_active,
          }))}
        />
      </div>
    </div>
  );
}
