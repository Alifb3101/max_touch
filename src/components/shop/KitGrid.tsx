import Image from "next/image";
import Link from "next/link";
import { money } from "@/lib/format";
import { canOptimize } from "@/lib/media";
import type { KitCard } from "@/lib/types";

export default function KitGrid({ kits, headingLevel = 3 }: { kits: KitCard[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {kits.map((kit, i) => (
        <li key={kit.id} className="sp-rise" style={{ "--d": `${Math.min(i, 8) * 70}ms` } as React.CSSProperties}>
          <Link href={`/kits/${kit.slug}`} className="sp-kit-card h-full">
            <div className="sp-kit-media">
              {kit.image ? (
                <Image
                  src={kit.image}
                  alt={`${kit.name} — ${kit.sizeLabel.toLowerCase()} makeup kit`}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                  unoptimized={!canOptimize(kit.image)}
                />
              ) : (
                <div className="mt-kit-fallback" />
              )}
            </div>
            <div className="flex flex-1 flex-col p-6 pt-5">
              <p className="sp-eyebrow">
                {kit.sizeLabel} kit{kit.pieces ? ` · ${kit.pieces} pieces` : ""}
              </p>
              <Heading className="sp-title mt-2 text-[1.65rem]">{kit.name}</Heading>
              {kit.tagline && <p className="mt-2 line-clamp-2 text-[0.8rem] leading-relaxed text-taupe/80">{kit.tagline}</p>}
              <div className="mt-auto flex items-center justify-between pt-5">
                <span className="text-[1.05rem] font-semibold text-burgundy">
                  {money(kit.price, kit.currency)}
                  {kit.compareAtPrice && kit.compareAtPrice > kit.price && (
                    <s className="ml-2 text-[0.8rem] font-normal text-taupe/60">{money(kit.compareAtPrice, kit.currency)}</s>
                  )}
                </span>
                <span className="text-[0.66rem] font-semibold tracking-[0.18em] text-gold uppercase">
                  {kit.stock > 0 ? "View kit →" : "Sold out"}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
