export const FEATURE_ICONS = ["mirror", "trays", "drawer", "gift"] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

export interface ProductPayload {
  id?: string;
  name: string;
  slug: string;
  size_slug: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  pieces: number | null;
  sort_order: number;
  is_active: boolean;
  tagline: string;
  eyebrow: string;
  description: string;
  title_lines: string[];
  hero_subtitle: string;
  caption: string;
  cta_label: string;
  included_title: string;
  extras_title: string;
  perfect_for: string[];
  seo_title: string;
  seo_description: string;
  thumbnail_url: string;
  image_url: string;
  image_alt: string;
  images: { kind: "frame" | "gallery"; url: string; alt: string }[];
  showcase: { label: string; image_url: string }[];
  stats: { value: number; label: string }[];
  contents: { name: string; quantity: number; note: string; image_url: string }[];
  features: { title: string; body: string; icon: FeatureIcon }[];
  faqs: { question: string; answer: string }[];
}

/** What the kit form edits. Text areas stay strings until save. */
export interface ProductDraft {
  id?: string;
  name: string;
  slug: string;
  sizeSlug: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  pieces: string;
  sortOrder: string;
  isActive: boolean;
  tagline: string;
  eyebrow: string;
  description: string;
  titleLines: string;
  heroSubtitle: string;
  caption: string;
  ctaLabel: string;
  includedTitle: string;
  extrasTitle: string;
  perfectFor: string;
  seoTitle: string;
  seoDescription: string;
  thumbnailUrl: string;
  imageUrl: string;
  imageAlt: string;
  frames: string[];
  gallery: { url: string; alt: string }[];
  showcase: { label: string; imageUrl: string }[];
  stats: { value: string; label: string }[];
  contents: { name: string; quantity: string; note: string; imageUrl: string }[];
  features: { title: string; body: string; icon: FeatureIcon }[];
  faqs: { question: string; answer: string }[];
}

export function emptyDraft(sizeSlug = "big"): ProductDraft {
  return {
    name: "",
    slug: "",
    sizeSlug,
    sku: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    pieces: "",
    sortOrder: "0",
    isActive: false,
    tagline: "",
    eyebrow: "",
    description: "",
    titleLines: "",
    heroSubtitle: "",
    caption: "",
    ctaLabel: "",
    includedTitle: "",
    extrasTitle: "",
    perfectFor: "",
    seoTitle: "",
    seoDescription: "",
    thumbnailUrl: "",
    imageUrl: "",
    imageAlt: "",
    frames: [""],
    gallery: [],
    showcase: [{ label: "", imageUrl: "" }],
    stats: [{ value: "", label: "" }],
    contents: [{ name: "", quantity: "1", note: "", imageUrl: "" }],
    features: [{ title: "", body: "", icon: "mirror" }],
    faqs: [{ question: "", answer: "" }],
  };
}

const lines = (value: string) => value.split("\n").map((s) => s.trim()).filter(Boolean);

export function draftToPayload(draft: ProductDraft): ProductPayload {
  const price = Number(draft.price);
  const compare = draft.compareAtPrice.trim() === "" ? null : Number(draft.compareAtPrice);
  const pieces = draft.pieces.trim() === "" ? null : Number(draft.pieces);
  return {
    id: draft.id,
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    size_slug: draft.sizeSlug,
    sku: draft.sku.trim(),
    price: Number.isFinite(price) ? price : -1,
    compare_at_price: compare !== null && Number.isFinite(compare) ? compare : compare === null ? null : -1,
    stock: Number(draft.stock),
    pieces: pieces !== null && Number.isFinite(pieces) ? pieces : null,
    sort_order: Number(draft.sortOrder) || 0,
    is_active: draft.isActive,
    tagline: draft.tagline.trim(),
    eyebrow: draft.eyebrow.trim(),
    description: draft.description.trim(),
    title_lines: lines(draft.titleLines),
    hero_subtitle: draft.heroSubtitle.trim(),
    caption: draft.caption.trim(),
    cta_label: draft.ctaLabel.trim(),
    included_title: draft.includedTitle.trim(),
    extras_title: draft.extrasTitle.trim(),
    perfect_for: lines(draft.perfectFor),
    seo_title: draft.seoTitle.trim(),
    seo_description: draft.seoDescription.trim(),
    thumbnail_url: draft.thumbnailUrl.trim(),
    image_url: draft.imageUrl.trim(),
    image_alt: draft.imageAlt.trim(),
    images: [
      ...draft.frames.filter((url) => url.trim()).map((url) => ({ kind: "frame" as const, url: url.trim(), alt: "" })),
      ...draft.gallery.filter((g) => g.url.trim()).map((g) => ({ kind: "gallery" as const, url: g.url.trim(), alt: g.alt.trim() })),
    ],
    showcase: draft.showcase
      .filter((s) => s.label.trim() && s.imageUrl.trim())
      .map((s) => ({ label: s.label.trim(), image_url: s.imageUrl.trim() })),
    stats: draft.stats
      .filter((s) => s.label.trim() && s.value.trim() !== "")
      .map((s) => ({ label: s.label.trim(), value: Number(s.value) })),
    contents: draft.contents
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        quantity: Number(c.quantity) || 1,
        note: c.note.trim(),
        image_url: c.imageUrl.trim(),
      })),
    features: draft.features
      .filter((f) => f.title.trim() && f.body.trim())
      .map((f) => ({ title: f.title.trim(), body: f.body.trim(), icon: f.icon })),
    faqs: draft.faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
  };
}
