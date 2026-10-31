import { CustomerTable } from "@/components/admin/DeskForms";
import SetupBanner from "@/components/admin/SetupBanner";
import { deskMissing, requireAdmin } from "@/lib/admin";

export default async function CustomersPage() {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_customers");
  const customers = (data ?? []) as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: "customer" | "admin";
    orders: number;
  }[];

  return (
    <div>
      <p className="sp-eyebrow">People</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Customers</h1>
      <p className="mt-3 max-w-xl text-[0.88rem] text-taupe/80">
        Owner accounts can open this desk. Customers only see their own orders.
      </p>
      <div className="mt-8">
        {deskMissing(error?.message) ? <SetupBanner /> : <CustomerTable customers={customers} selfId={user.id} />}
      </div>
    </div>
  );
}
