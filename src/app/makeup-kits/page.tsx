import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import JsonLd from "@/components/seo/JsonLd";
import KitGrid from "@/components/shop/KitGrid";
import { KITS_CATEGORY_SLUG, getCategory, getKits, getSizes } from "@/lib/catalog";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const category = await getCategory(KITS_CATEGORY_SLUG);
  const title = category?.seoTitle ?? "Makeup Kits & Gift Sets";
  const description =
    category?.seoDescription ??
    "Shop Max Touch makeup kits in big, medium and small sizes — complete beauty sets with eyeshadows, blush, lip colours and brushes, ready to gift.";
  return {
    title,
    description,
    alternates: { canonical: "/makeup-kits" },
    openGraph: { title, description, url: "/makeup-kits" },
  };
}

export default async function MakeupKitsPage() {
  const [category, sizes, kits] = await Promise.all([getCategory(KITS_CATEGORY_SLUG), getSizes(), getKits()]);

  return (
    <PageShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: category?.name ?? "Makeup Kits", path: "/makeup-kits" },
          ]),
          itemListJsonLd(kits),
        ]}
      />
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <p className="sp-eyebrow sp-rise">Max Touch collection</p>
        <h1 className="sp-title sp-rise mt-4 text-[clamp(2.6rem,6vw,4.8rem)]" style={{ "--d": "80ms" } as React.CSSProperties}>
          {category?.name ?? "Makeup Kits"}
        </h1>
        <p className="sp-rise mt-5 max-w-2xl text-[0.95rem] leading-[1.8] text-taupe" style={{ "--d": "160ms" } as React.CSSProperties}>
          {category?.description ??
            "Complete makeup kits in keepsake cases — eyeshadows, blush, lip colours and brushes, ready to gift."}
        </p>

        {sizes.length > 0 && (
          <nav aria-label="Kit sizes" className="sp-rise mt-8 flex flex-wrap gap-3" style={{ "--d": "240ms" } as React.CSSProperties}>
            {sizes.map((s) => (
              <Link key={s.id} href={`/makeup-kits/${s.slug}`} className="sp-btn sp-btn-ghost sp-btn-sm">
                {s.label} kits
              </Link>
            ))}
          </nav>
        )}

        {kits.length === 0 ? (
          <p className="mt-20 text-center font-display text-[1.6rem] font-light text-burgundy italic">
            New kits are on their way — check back soon.
          </p>
        ) : (
          sizes.map((s) => {
            const sizeKits = kits.filter((k) => k.sizeSlug === s.slug);
            if (sizeKits.length === 0) return null;
            return (
              <section key={s.id} className="mt-20" aria-labelledby={`size-${s.slug}`}>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-mauve/70 pb-5">
                  <div>
                    <p className="sp-eyebrow">{sizeKits.length} kits</p>
                    <h2 id={`size-${s.slug}`} className="sp-title mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)]">
                      {s.label} makeup kits
                    </h2>
                  </div>
                  <Link href={`/makeup-kits/${s.slug}`} className="sp-link text-[0.85rem]">
                    View {s.label.toLowerCase()} kits
                  </Link>
                </div>
                <KitGrid kits={sizeKits} />
              </section>
            );
          })
        )}
      </section>
    </PageShell>
  );
}
