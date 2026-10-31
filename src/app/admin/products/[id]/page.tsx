import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin";
import type { FeatureIcon, ProductDraft } from "@/lib/product-draft";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!UUID.test(id)) notFound();

  const { supabase } = await requireAdmin();
  const [{ data }, { data: sizes }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, slug, sku, name, title_lines, tagline, eyebrow, description, pieces, price, compare_at_price,
         stock, thumbnail_url, image_url, image_alt, caption, hero_subtitle, cta_label, included_title,
         extras_title, perfect_for, seo_title, seo_description, is_active, sort_order,
         size:sizes(slug),
         product_images(kind, url, alt, sort_order),
         product_showcase(label, image_url, sort_order),
         product_stats(label, value, sort_order),
         product_contents(name, quantity, note, image_url, sort_order),
         product_features(title, body, icon, sort_order),
         product_faqs(question, answer, sort_order)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sizes").select("slug, label").order("sort_order"),
  ]);

  if (!data) notFound();
  const row = data as unknown as ProductRow;
  const options = (sizes ?? []) as { slug: string; label: string }[];

  return (
    <div>
      <p className="sp-eyebrow">Catalog</p>
      <h1 className="sp-title mt-2 text-[clamp(2.2rem,4vw,3.2rem)]">{row.name}</h1>
      <div className="mt-8">
        <ProductForm initial={toDraft(row)} sizes={options} saved={saved === "1"} />
      </div>
    </div>
  );
}

interface ProductRow {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  title_lines: string[] | null;
  tagline: string | null;
  eyebrow: string | null;
  description: string | null;
  pieces: number | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number;
  thumbnail_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  caption: string | null;
  hero_subtitle: string | null;
  cta_label: string | null;
  included_title: string | null;
  extras_title: string | null;
  perfect_for: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  sort_order: number;
  size: { slug: string } | null;
  product_images: { kind: "frame" | "gallery"; url: string; alt: string | null; sort_order: number }[];
  product_showcase: { label: string; image_url: string; sort_order: number }[];
  product_stats: { label: string; value: number; sort_order: number }[];
  product_contents: { name: string; quantity: number; note: string | null; image_url: string | null; sort_order: number }[];
  product_features: { title: string; body: string; icon: FeatureIcon; sort_order: number }[];
  product_faqs: { question: string; answer: string; sort_order: number }[];
}

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

function toDraft(row: ProductRow): ProductDraft {
  const images = [...(row.product_images ?? [])].sort(bySort);
  const frames = images.filter((i) => i.kind === "frame").map((i) => i.url);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sizeSlug: row.size?.slug ?? "big",
    sku: row.sku ?? "",
    price: String(row.price),
    compareAtPrice: row.compare_at_price == null ? "" : String(row.compare_at_price),
    stock: String(row.stock),
    pieces: row.pieces == null ? "" : String(row.pieces),
    sortOrder: String(row.sort_order),
    isActive: row.is_active,
    tagline: row.tagline ?? "",
    eyebrow: row.eyebrow ?? "",
    description: row.description ?? "",
    titleLines: (row.title_lines ?? []).join("\n"),
    heroSubtitle: row.hero_subtitle ?? "",
    caption: row.caption ?? "",
    ctaLabel: row.cta_label ?? "",
    includedTitle: row.included_title ?? "",
    extrasTitle: row.extras_title ?? "",
    perfectFor: (row.perfect_for ?? []).join("\n"),
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    thumbnailUrl: row.thumbnail_url ?? "",
    imageUrl: row.image_url ?? "",
    imageAlt: row.image_alt ?? "",
    frames: frames.length ? frames : [""],
    gallery: images.filter((i) => i.kind === "gallery").map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    showcase: [...(row.product_showcase ?? [])].sort(bySort).map((s) => ({ label: s.label, imageUrl: s.image_url })),
    stats: [...(row.product_stats ?? [])].sort(bySort).map((s) => ({ value: String(s.value), label: s.label })),
    contents: [...(row.product_contents ?? [])].sort(bySort).map((c) => ({
      name: c.name,
      quantity: String(c.quantity),
      note: c.note ?? "",
      imageUrl: c.image_url ?? "",
    })),
    features: [...(row.product_features ?? [])].sort(bySort).map((f) => ({ title: f.title, body: f.body, icon: f.icon })),
    faqs: [...(row.product_faqs ?? [])].sort(bySort).map((f) => ({ question: f.question, answer: f.answer })),
  };
}
