import "server-only";
import { cache } from "react";
import { mediaUrl } from "./media";
import { getPublicClient } from "./supabase/public";
import type { Category, ExtraIconKind, KitCard, Product, Size, StoreSettings, Thumb } from "./types";

export const KITS_CATEGORY_SLUG = "makeup-kits";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

function logError(scope: string, error: unknown) {
  if (error) console.error(`[catalog] ${scope}:`, (error as { message?: string }).message ?? error);
}

// ── Sizes & categories ────────────────────────────────────────────────────────
export const getSizes = cache(async (): Promise<Size[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sizes")
    .select("id, slug, label, description, seo_title, seo_description, sort_order")
    .order("sort_order");
  logError("sizes", error);
  return (data ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    label: s.label,
    description: s.description,
    seoTitle: s.seo_title,
    seoDescription: s.seo_description,
  }));
});

export const getCategory = cache(async (slug: string): Promise<Category | null> => {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, seo_title, seo_description")
    .eq("slug", slug)
    .maybeSingle();
  logError("category", error);
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
});

// ── Kit listings ──────────────────────────────────────────────────────────────
interface KitRow {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  tagline: string | null;
  pieces: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  currency: string;
  stock: number;
  size: { slug: string; label: string; sort_order: number } | null;
}

const KIT_COLUMNS =
  "id, slug, sku, name, tagline, pieces, thumbnail_url, image_url, price, compare_at_price, currency, stock, size:sizes!inner(slug, label, sort_order)";

function toKitCard(row: KitRow): KitCard {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    tagline: row.tagline,
    pieces: row.pieces,
    image: mediaUrl(row.thumbnail_url ?? row.image_url),
    price: Number(row.price),
    compareAtPrice: num(row.compare_at_price),
    currency: row.currency,
    stock: row.stock,
    sizeSlug: row.size?.slug ?? "",
    sizeLabel: row.size?.label ?? "",
  };
}

/** Every active kit, ordered by size then sort order. */
export const getKits = cache(async (): Promise<KitCard[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select(KIT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  logError("kits", error);
  const rows = (data ?? []) as unknown as KitRow[];
  return rows
    .sort((a, b) => (a.size?.sort_order ?? 0) - (b.size?.sort_order ?? 0))
    .map(toKitCard);
});

export async function getKitsBySize(sizeSlug: string) {
  return (await getKits()).filter((k) => k.sizeSlug === sizeSlug);
}

export async function getProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("slug, updated_at").eq("is_active", true);
  logError("slugs", error);
  return (data ?? []).map((p) => ({ slug: p.slug, updatedAt: p.updated_at }));
}

// ── Single product ────────────────────────────────────────────────────────────
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
  currency: string;
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
  updated_at: string;
  size: { slug: string; label: string } | null;
  category: { slug: string; name: string } | null;
  product_images: { kind: "frame" | "gallery"; url: string; alt: string | null; sort_order: number }[];
  product_showcase: { label: string; image_url: string; sort_order: number }[];
  product_stats: { label: string; value: number; sort_order: number }[];
  product_contents: {
    name: string;
    quantity: number;
    note: string | null;
    thumb_kind: "image" | "swatch" | "stick";
    image_url: string | null;
    colors: string[] | null;
    stick_body: string | null;
    stick_tip: string | null;
    sort_order: number;
  }[];
  product_features: { title: string; body: string; icon: ExtraIconKind; sort_order: number }[];
  product_faqs: { question: string; answer: string; sort_order: number }[];
}

function toThumb(c: ProductRow["product_contents"][number]): Thumb {
  if (c.thumb_kind === "swatch" && c.colors?.length) return { kind: "swatch", colors: c.colors };
  if (c.thumb_kind === "image") {
    const src = mediaUrl(c.image_url);
    if (src) return { kind: "img", src };
  }
  return { kind: "stick", body: c.stick_body ?? "#6B2737", tip: c.stick_tip ?? "#B0465A" };
}

export const getProduct = cache(async (slug: string): Promise<Product | null> => {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, sku, name, title_lines, tagline, eyebrow, description, pieces, price, compare_at_price,
       currency, stock, thumbnail_url, image_url, image_alt, caption, hero_subtitle, cta_label,
       included_title, extras_title, perfect_for, seo_title, seo_description, updated_at,
       size:sizes(slug, label),
       category:categories(slug, name),
       product_images(kind, url, alt, sort_order),
       product_showcase(label, image_url, sort_order),
       product_stats(label, value, sort_order),
       product_contents(name, quantity, note, thumb_kind, image_url, colors, stick_body, stick_tip, sort_order),
       product_features(title, body, icon, sort_order),
       product_faqs(question, answer, sort_order)`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  logError(`product ${slug}`, error);
  if (!data) return null;
  const row = data as unknown as ProductRow;

  const images = [...row.product_images].sort(bySort);
  const frames = images.filter((i) => i.kind === "frame").map((i) => mediaUrl(i.url)).filter(Boolean) as string[];
  const gallery = images
    .filter((i) => i.kind === "gallery")
    .map((i) => ({ url: mediaUrl(i.url) as string, alt: i.alt }))
    .filter((i) => i.url);

  const image = mediaUrl(row.image_url) ?? mediaUrl(row.thumbnail_url) ?? frames.at(-1) ?? null;
  const thumbnail = mediaUrl(row.thumbnail_url) ?? image;

  const { data: ratings } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", row.id)
    .eq("is_approved", true);
  const count = ratings?.length ?? 0;
  const average = count ? ratings!.reduce((s, r) => s + Number(r.rating), 0) / count : 0;

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    titleLines: row.title_lines?.length ? row.title_lines : [row.name],
    tagline: row.tagline,
    eyebrow: row.eyebrow,
    description: row.description,
    pieces: row.pieces,
    image,
    imageAlt: row.image_alt ?? row.name,
    thumbnail,
    price: Number(row.price),
    compareAtPrice: num(row.compare_at_price),
    currency: row.currency,
    stock: row.stock,
    caption: row.caption,
    ctaLabel: row.cta_label,
    heroSubtitle: row.hero_subtitle,
    size: row.size ?? { slug: "", label: "" },
    category: row.category ?? { slug: KITS_CATEGORY_SLUG, name: "Makeup Kits" },
    frames: frames.length ? frames : image ? [image] : [],
    gallery,
    showcase: [...row.product_showcase]
      .sort(bySort)
      .map((s) => ({ label: s.label, image: mediaUrl(s.image_url) as string }))
      .filter((s) => s.image),
    stats: [...row.product_stats].sort(bySort).map((s) => ({ label: s.label, value: s.value })),
    includedTitle: row.included_title,
    included: [...row.product_contents]
      .sort(bySort)
      .map((c) => ({ name: c.name, qty: c.quantity, note: c.note, thumb: toThumb(c) })),
    extrasTitle: row.extras_title,
    extras: [...row.product_features].sort(bySort).map((f) => ({ title: f.title, text: f.body, icon: f.icon })),
    perfectFor: row.perfect_for ?? [],
    details: [...row.product_faqs].sort(bySort).map((f) => ({ q: f.question, a: f.answer })),
    rating: count ? { average: Math.round(average * 10) / 10, count } : null,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    updatedAt: row.updated_at,
  };
});

// ── Store settings ────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: StoreSettings = { currency: "AED", shippingFee: 0, freeShippingThreshold: null, codFee: 0 };

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = getPublicClient();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase
    .from("store_settings")
    .select("currency, shipping_fee, free_shipping_threshold, cod_fee")
    .maybeSingle();
  logError("settings", error);
  if (!data) return DEFAULT_SETTINGS;
  return {
    currency: data.currency,
    shippingFee: Number(data.shipping_fee),
    freeShippingThreshold: num(data.free_shipping_threshold),
    codFee: Number(data.cod_fee),
  };
});
