import { SITE, absoluteUrl } from "./site";
import type { KitCard, Product } from "./types";

export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: SITE.name,
  url: SITE.url,
  logo: absoluteUrl("/icon.svg"),
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: SITE.name,
  url: SITE.url,
  inLanguage: SITE.language,
  publisher: { "@id": absoluteUrl("/#organization") },
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const itemListJsonLd = (kits: KitCard[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: kits.map((k, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: absoluteUrl(`/kits/${k.slug}`),
    name: k.name,
  })),
});

export function productJsonLd(p: Product) {
  const url = absoluteUrl(`/kits/${p.slug}`);
  const images = [p.image, p.thumbnail, ...p.gallery.map((g) => g.url)].filter(Boolean) as string[];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    description: p.seoDescription ?? p.description ?? p.tagline ?? undefined,
    image: [...new Set(images)],
    sku: p.sku ?? undefined,
    category: `${p.category.name} > ${p.size.label}`,
    brand: { "@type": "Brand", name: SITE.name },
    url,
    offers: {
      "@type": "Offer",
      url,
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
    },
    ...(p.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating.average,
            reviewCount: p.rating.count,
          },
        }
      : {}),
  };
}

export const faqJsonLd = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
