import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import JsonLd from "@/components/seo/JsonLd";
import KitGrid from "@/components/shop/KitGrid";
import { getKitsBySize, getSizes } from "@/lib/catalog";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ size: string }> };

export async function generateStaticParams() {
  return (await getSizes()).map((s) => ({ size: s.slug }));
}

async function findSize(slug: string) {
  return (await getSizes()).find((s) => s.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const size = await findSize((await params).size);
  if (!size) return { title: "Not found", robots: { index: false } };
  const title = size.seoTitle ?? `${size.label} Makeup Kits`;
  const description =
    size.seoDescription ?? `Shop ${size.label.toLowerCase()} Max Touch makeup kits — complete beauty sets, ready to gift.`;
  return {
    title,
    description,
    alternates: { canonical: `/makeup-kits/${size.slug}` },
    openGraph: { title, description, url: `/makeup-kits/${size.slug}` },
  };
}

export default async function SizePage({ params }: Params) {
  const size = await findSize((await params).size);
  if (!size) notFound();
  const [sizes, kits] = await Promise.all([getSizes(), getKitsBySize(size.slug)]);

  return (
    <PageShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Makeup Kits", path: "/makeup-kits" },
            { name: `${size.label} kits`, path: `/makeup-kits/${size.slug}` },
          ]),
          itemListJsonLd(kits),
        ]}
      />
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <nav aria-label="Breadcrumb" className="text-[0.7rem] tracking-[0.14em] text-taupe/70 uppercase">
          <Link href="/makeup-kits" className="hover:text-burgundy">Makeup kits</Link> / <span className="text-burgundy">{size.label}</span>
        </nav>
        <h1 className="sp-title sp-rise mt-5 text-[clamp(2.6rem,6vw,4.8rem)]">{size.label} makeup kits</h1>
        {size.description && (
          <p className="sp-rise mt-5 max-w-2xl text-[0.95rem] leading-[1.8] text-taupe" style={{ "--d": "100ms" } as React.CSSProperties}>
            {size.description}
          </p>
        )}

        <nav aria-label="Other sizes" className="mt-8 flex flex-wrap gap-3">
          {sizes.map((s) => (
            <Link
              key={s.id}
              href={`/makeup-kits/${s.slug}`}
              aria-current={s.slug === size.slug ? "page" : undefined}
              className={`sp-btn sp-btn-sm ${s.slug === size.slug ? "" : "sp-btn-ghost"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="mt-14">
          {kits.length === 0 ? (
            <p className="py-16 text-center font-display text-[1.6rem] font-light text-burgundy italic">
              New {size.label.toLowerCase()} kits are on their way — check back soon.
            </p>
          ) : (
            <KitGrid kits={kits} headingLevel={2} />
          )}
        </div>
      </section>
    </PageShell>
  );
}
