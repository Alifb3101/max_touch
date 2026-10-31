import Link from "next/link";
import KitGrid from "@/components/shop/KitGrid";
import { money } from "@/lib/format";
import type { KitCard, Product } from "@/lib/types";
import { OpenDrawerButton } from "./ProductExperience";

/**
 * Server-rendered, always-visible product information under the hero.
 * Gives search engines (and shoppers who skip the animation) the full story.
 */
export default function ProductDetails({ product, related }: { product: Product; related: KitCard[] }) {
  const sizeHref = `/makeup-kits/${product.size.slug}`;
  const inStock = product.stock > 0;

  return (
    <div className="relative bg-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_50%_60%_at_85%_0%,rgba(243,220,212,0.9),transparent_70%)]"
      />
      <article className="relative mx-auto max-w-6xl px-6 pt-20 pb-24">
        <nav aria-label="Breadcrumb" className="text-[0.7rem] tracking-[0.14em] text-taupe/70 uppercase">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-burgundy">Home</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/makeup-kits" className="hover:text-burgundy">{product.category.name}</Link>
            </li>
            {product.size.slug && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={sizeHref} className="hover:text-burgundy">{product.size.label}</Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-burgundy">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="sp-eyebrow">
              {product.size.label} makeup kit{product.pieces ? ` · ${product.pieces} pieces` : ""}
            </p>
            <h2 className="sp-title mt-3 text-[clamp(2rem,4vw,3.2rem)]">About the {product.name}</h2>
            {product.description && (
              <p className="mt-6 max-w-2xl text-[0.98rem] leading-[1.8] text-taupe">{product.description}</p>
            )}
            {product.perfectFor.length > 0 && (
              <p className="mt-5 text-[0.85rem] text-taupe/80">
                <span className="font-semibold text-burgundy">Perfect for: </span>
                {product.perfectFor.join(", ")}.
              </p>
            )}
          </div>

          <aside className="sp-panel-dark h-fit p-7">
            <p className="sp-eyebrow" style={{ color: "#E9CF9C" }}>
              {inStock ? (product.stock <= 5 ? `Only ${product.stock} left` : "In stock") : "Sold out"}
            </p>
            <p className="mt-3 font-display text-[2.4rem] leading-none font-light text-ivory">
              {money(product.price, product.currency)}
            </p>
            {product.compareAtPrice !== null && product.compareAtPrice > product.price && (
              <s className="mt-1 block text-[0.85rem] text-blush/60">{money(product.compareAtPrice, product.currency)}</s>
            )}
            <dl className="mt-6 space-y-2 border-t border-gold/25 pt-5 text-[0.8rem] text-blush/80">
              <div className="flex justify-between">
                <dt>Size</dt>
                <dd className="text-ivory">{product.size.label}</dd>
              </div>
              {product.pieces ? (
                <div className="flex justify-between">
                  <dt>Pieces</dt>
                  <dd className="text-ivory">{product.pieces}</dd>
                </div>
              ) : null}
              {product.sku && (
                <div className="flex justify-between">
                  <dt>SKU</dt>
                  <dd className="text-ivory">{product.sku}</dd>
                </div>
              )}
            </dl>
            <OpenDrawerButton className="mt-7 w-full rounded-full border border-champagne px-5 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-champagne uppercase transition-colors hover:bg-champagne hover:text-[#3d121c]">
              {product.ctaLabel ?? "Shop the kit"}
            </OpenDrawerButton>
          </aside>
        </div>

        {product.included.length > 0 && (
          <section className="mt-20">
            <p className="sp-eyebrow">What&apos;s inside</p>
            <h2 className="sp-title mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">
              {product.includedTitle ?? "Everything in the box"}
            </h2>
            <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {product.included.map((item) => (
                <li key={item.name} className="flex gap-4 border-b border-mauve/60 pb-4">
                  <span className="min-w-[2.5rem] font-display text-[1.3rem] text-burgundy">×{item.qty}</span>
                  <span>
                    <span className="block text-[0.9rem] font-semibold text-taupe">{item.name}</span>
                    {item.note && <span className="mt-1 block text-[0.8rem] leading-relaxed text-taupe/75">{item.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.extras.length > 0 && (
          <section className="mt-20">
            <p className="sp-eyebrow">Also included</p>
            <h2 className="sp-title mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">{product.extrasTitle ?? "Extras in the box"}</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {product.extras.map((x) => (
                <li key={x.title} className="sp-panel p-6">
                  <h3 className="text-[1rem] font-semibold text-burgundy">{x.title}</h3>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-taupe">{x.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.details.length > 0 && (
          <section className="mt-20">
            <p className="sp-eyebrow">Good to know</p>
            <h2 className="sp-title mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">Questions about this kit</h2>
            <div className="mt-6 max-w-3xl">
              {product.details.map((d, i) => (
                <details key={d.q} open={i === 0} className="group border-b border-mauve">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[0.95rem] font-semibold text-burgundy">
                    {d.q}
                    <span className="text-[1.4rem] font-light text-gold transition-transform duration-500 group-open:rotate-135">+</span>
                  </summary>
                  <p className="pb-5 text-[0.88rem] leading-[1.8] text-taupe">{d.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="sp-eyebrow">Keep exploring</p>
                <h2 className="sp-title mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">More {product.size.label.toLowerCase()} makeup kits</h2>
              </div>
              <Link href={sizeHref} className="sp-link text-[0.85rem]">
                View all {product.size.label.toLowerCase()} kits
              </Link>
            </div>
            <div className="mt-10">
              <KitGrid kits={related} />
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
