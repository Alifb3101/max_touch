export interface Size {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Lightweight kit used by the wheel, listings and the cart. */
export interface KitCard {
  id: string;
  slug: string;
  /** Model number, e.g. "MT-2022". */
  sku: string | null;
  name: string;
  tagline: string | null;
  pieces: number | null;
  image: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stock: number;
  sizeSlug: string;
  sizeLabel: string;
}

export type Thumb =
  | { kind: "img"; src: string }
  | { kind: "swatch"; colors: string[] }
  | { kind: "stick"; body: string; tip: string };

export type ExtraIconKind = "mirror" | "trays" | "drawer" | "gift";

export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  /** Each entry renders on its own line in the drawer title. */
  titleLines: string[];
  tagline: string | null;
  eyebrow: string | null;
  description: string | null;
  pieces: number | null;
  /** Transparent cut-out shown in the drawer. */
  image: string | null;
  imageAlt: string;
  thumbnail: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stock: number;
  caption: string | null;
  ctaLabel: string | null;
  heroSubtitle: string | null;
  size: { slug: string; label: string };
  category: { slug: string; name: string };
  /** Kit-opening sequence played by the hero while scrolling. */
  frames: string[];
  gallery: { url: string; alt: string | null }[];
  showcase: { label: string; image: string }[];
  stats: { value: number; label: string }[];
  includedTitle: string | null;
  included: { name: string; qty: number; note: string | null; thumb: Thumb }[];
  extrasTitle: string | null;
  extras: { title: string; text: string; icon: ExtraIconKind }[];
  perfectFor: string[];
  details: { q: string; a: string }[];
  rating: { average: number; count: number } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface StoreSettings {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  codFee: number;
}

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  currency: string;
  sizeLabel: string;
  stock: number;
  quantity: number;
}

export interface Address {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  country: string;
  postal_code: string | null;
  is_default: boolean;
}

export interface OrderItem {
  product_name: string;
  product_slug: string | null;
  image_url: string | null;
  size_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderSummary {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  email: string;
  full_name: string;
  phone: string;
  shipping_address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    country: string;
    postal_code: string | null;
  };
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}
