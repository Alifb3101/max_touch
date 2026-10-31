import type { MetadataRoute } from "next";
import { getProductSlugs, getSizes } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sizes, products] = await Promise.all([getSizes(), getProductSlugs()]);
  const now = new Date();

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/makeup-kits"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...sizes.map((s) => ({
      url: absoluteUrl(`/makeup-kits/${s.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/kits/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
