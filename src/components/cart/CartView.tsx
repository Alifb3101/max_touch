"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { money } from "@/lib/format";
import { canOptimize } from "@/lib/media";
import { MAX_QTY } from "@/lib/pricing";

export default function CartView() {
  const { lines, subtotal, currency, ready, setQuantity, remove } = useCart();

  if (!ready) return <div className="h-64" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="sp-panel sp-rise mx-auto max-w-xl px-8 py-16 text-center">
        <p className="sp-title text-[2rem]">Your bag is empty</p>
        <p className="mt-3 text-[0.9rem] text-taupe/80">Find a kit you love — every one arrives gift-ready.</p>
        <Link href="/makeup-kits" className="sp-btn mt-8">
          Shop makeup kits
        </Link>
      </div>
    );
  }

  const unavailable = lines.some((l) => l.stock < l.quantity);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <ul className="space-y-4">
        {lines.map((line, i) => {
          const max = Math.max(1, Math.min(MAX_QTY, line.stock));
          return (
            <li
              key={line.productId}
              className="sp-panel sp-rise flex items-center gap-5 p-4 sm:p-5"
              style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
            >
              <Link
                href={`/kits/${line.slug}`}
                className="relative size-24 flex-none rounded-2xl bg-[radial-gradient(circle_at_35%_30%,#fff,#F3DCD4_75%)] sm:size-28"
              >
                {line.image && (
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                    unoptimized={!canOptimize(line.image)}
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="sp-eyebrow">{line.sizeLabel} kit</p>
                <Link href={`/kits/${line.slug}`} className="mt-1 block font-display text-[1.35rem] leading-tight text-burgundy italic">
                  {line.name}
                </Link>
                <p className="mt-1 text-[0.85rem] text-taupe">{money(line.price, line.currency)}</p>
                {line.stock < line.quantity && (
                  <p className="mt-1 text-[0.75rem] text-[#8a2433]">
                    {line.stock === 0 ? "Sold out — please remove" : `Only ${line.stock} left`}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="sp-qty" role="group" aria-label={`Quantity of ${line.name}`}>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= max}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="text-[0.7rem] font-semibold tracking-[0.16em] text-taupe/70 uppercase transition-colors hover:text-burgundy"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="hidden self-start font-semibold text-burgundy sm:block">
                {money(line.price * line.quantity, line.currency)}
              </p>
            </li>
          );
        })}
      </ul>

      <aside className="sp-panel-dark sp-rise h-fit p-7" style={{ "--d": "120ms" } as React.CSSProperties}>
        <p className="sp-eyebrow" style={{ color: "#E9CF9C" }}>
          Order summary
        </p>
        <div className="mt-5 flex justify-between text-[0.9rem]">
          <span>Subtotal</span>
          <span className="font-semibold text-ivory">{money(subtotal, currency)}</span>
        </div>
        <p className="mt-2 text-[0.75rem] text-blush/70">Shipping and discount codes are applied at checkout.</p>
        {unavailable ? (
          <p className="mt-6 rounded-xl bg-white/10 p-3 text-[0.8rem]">Update the items marked above to continue.</p>
        ) : (
          <Link
            href="/checkout"
            className="mt-7 flex h-[52px] w-full items-center justify-center rounded-full bg-champagne text-[0.75rem] font-bold tracking-[0.16em] text-[#3d121c] uppercase transition-transform hover:-translate-y-0.5"
          >
            Checkout
          </Link>
        )}
        <Link href="/makeup-kits" className="mt-4 block text-center text-[0.75rem] text-blush/80 underline-offset-4 hover:underline">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
