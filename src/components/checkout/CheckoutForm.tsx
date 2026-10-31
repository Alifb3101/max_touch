"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkCoupon, placeOrder } from "@/app/checkout/actions";
import { useCart } from "@/components/cart/CartProvider";
import { money } from "@/lib/format";
import { canOptimize } from "@/lib/media";
import { computeTotals } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import type { Address, StoreSettings } from "@/lib/types";

interface CheckoutFormProps {
  settings: StoreSettings;
  signedIn: boolean;
  defaults: {
    email: string;
    fullName: string;
    phone: string;
    address: Pick<Address, "line1" | "line2" | "city" | "region" | "postal_code"> | null;
  };
}

export default function CheckoutForm({ settings, signedIn, defaults }: CheckoutFormProps) {
  const router = useRouter();
  const { lines, subtotal, currency, ready, clear } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  if (!ready) return <div className="h-64" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="sp-panel mx-auto max-w-xl px-8 py-16 text-center">
        <p className="sp-title text-[2rem]">Your bag is empty</p>
        <Link href="/makeup-kits" className="sp-btn mt-8">
          Shop makeup kits
        </Link>
      </div>
    );
  }

  const discount = applied && applied.discount <= subtotal ? applied.discount : 0;
  const totals = computeTotals(subtotal, discount, settings, "cod");

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCheckingCoupon(true);
    setCouponMsg(null);
    const res = await checkCoupon(coupon, subtotal);
    setCheckingCoupon(false);
    if (res.valid && res.code && typeof res.discount === "number") {
      setApplied({ code: res.code, discount: Number(res.discount), message: res.message });
    } else {
      setApplied(null);
      setCouponMsg(res.message);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setError(null);

    startTransition(async () => {
      const result = await placeOrder({
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        contact: { email: get("email"), fullName: get("fullName"), phone: get("phone") },
        address: {
          line1: get("line1"),
          line2: get("line2"),
          city: get("city"),
          region: get("region"),
          postalCode: get("postalCode"),
        },
        paymentMethod: "cod",
        couponCode: applied?.code ?? "",
        notes: get("notes"),
        saveAddress: f.get("saveAddress") === "on",
      });

      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        if (result.field === "coupon") setApplied(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      clear();
      router.replace(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}&token=${result.token}`);
    });
  };

  const invalid = (field: string) => (error?.field === field ? true : undefined);

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="space-y-8">
        {error && (
          <p role="alert" className="sp-alert sp-alert-error">
            {error.message}
          </p>
        )}

        <fieldset className="sp-panel p-6 sm:p-8">
          <legend className="sr-only">Contact</legend>
          <p className="sp-eyebrow">01 · Contact</p>
          {!signedIn && (
            <p className="mt-2 text-[0.8rem] text-taupe/80">
              Have an account?{" "}
              <Link href="/login?next=/checkout" className="sp-link">
                Sign in
              </Link>{" "}
              for faster checkout and order tracking.
            </p>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="fullName" autoComplete="name" defaultValue={defaults.fullName} invalid={invalid("fullName")} required />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+971 50 000 0000" defaultValue={defaults.phone} invalid={invalid("phone")} required />
            <div className="sm:col-span-2">
              <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={defaults.email} invalid={invalid("email")} required />
            </div>
          </div>
        </fieldset>

        <fieldset className="sp-panel p-6 sm:p-8">
          <legend className="sr-only">Delivery address</legend>
          <p className="sp-eyebrow">02 · Delivery</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Street address, building, flat" name="line1" autoComplete="address-line1" defaultValue={defaults.address?.line1 ?? ""} invalid={invalid("line1")} required />
            </div>
            <div className="sm:col-span-2">
              <Field label="Landmark (optional)" name="line2" autoComplete="address-line2" defaultValue={defaults.address?.line2 ?? ""} />
            </div>
            <Field label="City / area" name="city" autoComplete="address-level2" defaultValue={defaults.address?.city ?? ""} invalid={invalid("city")} required />
            <label className="sp-field">
              <span className="sp-label">Emirate</span>
              <select name="region" className="sp-input" defaultValue={defaults.address?.region ?? ""} aria-invalid={invalid("region")} required>
                <option value="" disabled>
                  Choose…
                </option>
                {SITE.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Postal code (optional)" name="postalCode" autoComplete="postal-code" defaultValue={defaults.address?.postal_code ?? ""} />
            <label className="sp-field sm:col-span-2">
              <span className="sp-label">Delivery notes (optional)</span>
              <textarea name="notes" className="sp-input" maxLength={1000} placeholder="Gate code, best time to call, gift message…" />
            </label>
            {signedIn && (
              <label className="flex items-center gap-3 text-[0.85rem] sm:col-span-2">
                <input type="checkbox" name="saveAddress" defaultChecked={!defaults.address} className="size-4 accent-burgundy" />
                Save this address to my account
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="sp-panel p-6 sm:p-8">
          <legend className="sr-only">Payment</legend>
          <p className="sp-eyebrow">03 · Payment</p>
          <label className="mt-5 flex items-start gap-4 rounded-2xl border border-gold/60 bg-white/70 p-4">
            <input type="radio" name="payment" value="cod" defaultChecked className="mt-1 size-4 accent-burgundy" />
            <span>
              <span className="block text-[0.95rem] font-semibold text-burgundy">Cash on delivery</span>
              <span className="mt-1 block text-[0.8rem] text-taupe/80">
                Pay in cash or by card when your kit arrives.
                {settings.codFee > 0 ? ` A ${money(settings.codFee, settings.currency)} handling fee applies.` : ""}
              </span>
            </span>
          </label>
        </fieldset>
      </div>

      <aside className="sp-panel-dark h-fit p-6 sm:p-7 lg:sticky lg:top-24">
        <p className="sp-eyebrow" style={{ color: "#E9CF9C" }}>
          Your order
        </p>
        <ul className="mt-5 space-y-4">
          {lines.map((l) => (
            <li key={l.productId} className="flex items-center gap-4">
              <span className="relative size-16 flex-none rounded-xl bg-[radial-gradient(circle_at_35%_30%,#fff,#F3DCD4_75%)]">
                {l.image && (
                  <Image src={l.image} alt="" fill sizes="64px" className="object-contain p-1.5" unoptimized={!canOptimize(l.image)} />
                )}
                <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-champagne text-[0.62rem] font-bold text-[#3d121c]">
                  {l.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[1.1rem] text-ivory italic">{l.name}</span>
                <span className="text-[0.72rem] text-blush/70">{l.sizeLabel} kit</span>
              </span>
              <span className="text-[0.85rem] text-ivory">{money(l.price * l.quantity, l.currency)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-gold/25 pt-5">
          <label htmlFor="coupon" className="text-[0.66rem] font-semibold tracking-[0.18em] text-blush/80 uppercase">
            Discount code
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void applyCoupon();
                }
              }}
              className="h-11 min-w-0 flex-1 rounded-full border border-gold/40 bg-white/10 px-4 text-[0.85rem] tracking-[0.1em] text-ivory outline-none placeholder:text-blush/40 focus:border-champagne"
              placeholder="CODE"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={checkingCoupon}
              className="h-11 rounded-full border border-champagne px-4 text-[0.68rem] font-semibold tracking-[0.16em] text-champagne uppercase transition-colors hover:bg-champagne hover:text-[#3d121c] disabled:opacity-50"
            >
              {checkingCoupon ? "…" : "Apply"}
            </button>
          </div>
          {applied && <p className="mt-2 text-[0.75rem] text-champagne">{applied.code}: {applied.message}</p>}
          {couponMsg && <p className="mt-2 text-[0.75rem] text-blush">{couponMsg}</p>}
        </div>

        <dl className="mt-6 space-y-2 border-t border-gold/25 pt-5 text-[0.85rem]">
          <Row label="Subtotal" value={money(totals.subtotal, currency)} />
          {totals.discount > 0 && <Row label="Discount" value={`− ${money(totals.discount, currency)}`} />}
          <Row label="Delivery" value={totals.shipping === 0 ? "Free" : money(totals.shipping, currency)} />
          <div className="flex justify-between border-t border-gold/25 pt-3 text-[1.05rem] font-semibold text-ivory">
            <dt>Total</dt>
            <dd>{money(totals.total, currency)}</dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={pending}
          className="mt-7 flex h-[54px] w-full items-center justify-center rounded-full bg-champagne text-[0.78rem] font-bold tracking-[0.16em] text-[#3d121c] uppercase transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Placing order…" : `Place order · ${money(totals.total, currency)}`}
        </button>
        <p className="mt-3 text-center text-[0.7rem] text-blush/60">Prices and stock are confirmed when you place the order.</p>
      </aside>
    </form>
  );
}

function Field({
  label,
  invalid,
  ...props
}: { label: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="sp-field">
      <span className="sp-label">{label}</span>
      <input className="sp-input" aria-invalid={invalid} {...props} />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-blush/85">
      <dt>{label}</dt>
      <dd className="text-ivory">{value}</dd>
    </div>
  );
}
