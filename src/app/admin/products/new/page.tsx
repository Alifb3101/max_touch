import ProductForm from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin";
import { emptyDraft } from "@/lib/product-draft";

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: sizes } = await supabase.from("sizes").select("slug, label").order("sort_order");
  const options = (sizes ?? []) as { slug: string; label: string }[];

  return (
    <div>
      <p className="sp-eyebrow">Catalog</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">New kit</h1>
      <div className="mt-8">
        <ProductForm initial={emptyDraft(options[0]?.slug ?? "big")} sizes={options} />
      </div>
    </div>
  );
}
