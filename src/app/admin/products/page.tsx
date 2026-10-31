import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export default async function AdminProductsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, price, currency, stock, is_active, thumbnail_url, image_url, size:sizes(label)")
    .order("sort_order")
    .order("created_at", { ascending: false });

  const kits = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    price: number | string;
    currency: string;
    stock: number;
    is_active: boolean;
    thumbnail_url: string | null;
    image_url: string | null;
    size: { label: string } | null;
  }[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sp-eyebrow">Catalog</p>
          <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">Kits</h1>
        </div>
        <Link href="/admin/products/new" className="sp-btn sp-btn-sm">
          Add a kit
        </Link>
      </div>

      <ul className="mt-8 divide-y divide-mauve/60">
        {kits.map((kit) => {
          const photo = mediaUrl(kit.thumbnail_url ?? kit.image_url);
          return (
            <li key={kit.id}>
              <Link href={`/admin/products/${kit.id}`} className="flex items-center gap-4 py-4 hover:text-burgundy">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span className="h-14 w-14 rounded-xl bg-blush" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{kit.name}</span>
                  <span className="text-[0.75rem] text-taupe/70">
                    {kit.size?.label ?? "Kit"} · {kit.stock} in stock · {kit.is_active ? "On sale" : "Hidden"}
                  </span>
                </span>
                <span className="font-semibold">{money(Number(kit.price), kit.currency)}</span>
              </Link>
            </li>
          );
        })}
        {kits.length === 0 ? (
          <li className="py-8 text-[0.9rem] text-taupe/80">
            No kits yet. Add the first one and tick On sale when the page is ready.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
