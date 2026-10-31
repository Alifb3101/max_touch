import { ReviewList } from "@/components/admin/DeskForms";
import { requireAdmin } from "@/lib/admin";

export default async function ReviewsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("reviews")
    .select("id, author_name, rating, title, body, is_approved, product:products(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <p className="sp-eyebrow">Trust</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Reviews</h1>
      <p className="mt-3 max-w-xl text-[0.88rem] text-taupe/80">
        A review stays hidden until you publish it. Published reviews are included in the kit page for Google.
      </p>
      <div className="mt-6">
        <ReviewList
          reviews={(data ?? []).map((r) => {
            const product = Array.isArray(r.product) ? r.product[0] : r.product;
            return {
              id: r.id,
              author_name: r.author_name,
              rating: r.rating,
              title: r.title,
              body: r.body,
              is_approved: r.is_approved,
              product: product ? { name: product.name } : null,
            };
          })}
        />
      </div>
    </div>
  );
}
