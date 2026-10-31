"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCoupon, saveSettings, setReviewApproval, setUserRole, updateOrder } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";

function Notice({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p className="sp-alert sp-alert-error">{error}</p>;
  if (ok) return <p className="sp-alert sp-alert-ok">{ok}</p>;
  return null;
}

export function OrderEditor({
  orderNumber,
  status,
  paymentStatus,
  notes,
}: {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  notes: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setOk(null);
    const result = await updateOrder({
      orderNumber,
      status: String(f.get("status")),
      paymentStatus: String(f.get("payment")),
      notes: String(f.get("notes") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Order updated. Cancelling or refunding puts the pieces back in stock.");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Notice error={error} ok={ok} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sp-field">
          <span className="sp-label">Order status</span>
          <select className="sp-input" name="status" defaultValue={status}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="sp-field">
          <span className="sp-label">Payment</span>
          <select className="sp-input" name="payment" defaultValue={paymentStatus}>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="sp-field">
        <span className="sp-label">Private note</span>
        <textarea className="sp-input" name="notes" rows={3} defaultValue={notes} />
      </label>
      <button type="submit" className="sp-btn sp-btn-sm" disabled={pending}>
        {pending ? "Saving…" : "Update order"}
      </button>
    </form>
  );
}

export function CouponManager({
  coupons,
}: {
  coupons: {
    id: string;
    code: string;
    description: string | null;
    discount_type: "percent" | "fixed";
    value: number;
    min_subtotal: number;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    is_active: boolean;
  }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const max = String(f.get("maxUses") ?? "").trim();
    setPending(true);
    setError(null);
    setOk(null);
    const result = await saveCoupon({
      code: String(f.get("code") ?? ""),
      description: String(f.get("description") ?? ""),
      discountType: String(f.get("discountType")) === "fixed" ? "fixed" : "percent",
      value: Number(f.get("value")),
      minSubtotal: Number(f.get("minSubtotal") || 0),
      maxUses: max === "" ? null : Number(max),
      expiresAt: String(f.get("expiresAt") ?? ""),
      isActive: true,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Coupon saved.");
    e.currentTarget.reset();
    router.refresh();
  };

  const toggle = async (coupon: (typeof coupons)[number]) => {
    setError(null);
    const result = await saveCoupon({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discount_type,
      value: Number(coupon.value),
      minSubtotal: Number(coupon.min_subtotal),
      maxUses: coupon.max_uses,
      expiresAt: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
      isActive: !coupon.is_active,
    });
    if (!result.ok) setError(result.error);
    else router.refresh();
  };

  return (
    <div className="space-y-8">
      <Notice error={error} ok={ok} />
      <form onSubmit={onSubmit} className="sp-panel grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <label className="sp-field">
          <span className="sp-label">Code</span>
          <input className="sp-input" name="code" required placeholder="WELCOME10" />
        </label>
        <label className="sp-field">
          <span className="sp-label">Type</span>
          <select className="sp-input" name="discountType" defaultValue="percent">
            <option value="percent">Percent</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className="sp-field">
          <span className="sp-label">Value</span>
          <input className="sp-input" name="value" inputMode="decimal" required />
        </label>
        <label className="sp-field">
          <span className="sp-label">Minimum spend</span>
          <input className="sp-input" name="minSubtotal" inputMode="decimal" defaultValue="0" />
        </label>
        <label className="sp-field">
          <span className="sp-label">Maximum uses</span>
          <input className="sp-input" name="maxUses" inputMode="numeric" placeholder="Unlimited" />
        </label>
        <label className="sp-field">
          <span className="sp-label">Expires</span>
          <input className="sp-input" type="date" name="expiresAt" />
        </label>
        <label className="sp-field sm:col-span-2">
          <span className="sp-label">Note shown at checkout</span>
          <input className="sp-input" name="description" />
        </label>
        <button type="submit" className="sp-btn sp-btn-sm" disabled={pending}>
          {pending ? "Saving…" : "Add coupon"}
        </button>
      </form>

      <ul className="divide-y divide-mauve/60">
        {coupons.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span>
              <span className="block font-semibold text-burgundy">{c.code}</span>
              <span className="text-[0.78rem] text-taupe/70">
                {c.discount_type === "percent" ? `${c.value}%` : `AED ${c.value}`} · used {c.used_count}
                {c.max_uses ? ` / ${c.max_uses}` : ""}
              </span>
            </span>
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => toggle(c)}>
              {c.is_active ? "Turn off" : "Turn on"}
            </button>
          </li>
        ))}
        {coupons.length === 0 ? <li className="py-4 text-[0.88rem] text-taupe/70">No coupons yet.</li> : null}
      </ul>
    </div>
  );
}

export function ReviewList({
  reviews,
}: {
  reviews: { id: string; author_name: string; rating: number; title: string | null; body: string | null; is_approved: boolean; product: { name: string } | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const toggle = async (id: string, approved: boolean) => {
    setError(null);
    const result = await setReviewApproval(id, approved);
    if (!result.ok) setError(result.error);
    else router.refresh();
  };

  return (
    <div>
      <Notice error={error} ok={null} />
      <ul className="mt-4 divide-y divide-mauve/60">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
            <span>
              <span className="block font-semibold text-burgundy">
                {r.author_name} · {r.rating}/5
              </span>
              <span className="text-[0.75rem] text-taupe/60">{r.product?.name}</span>
              {r.title ? <span className="mt-1 block text-[0.88rem]">{r.title}</span> : null}
              {r.body ? <span className="mt-1 block text-[0.85rem] text-taupe/80">{r.body}</span> : null}
            </span>
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => toggle(r.id, !r.is_approved)}>
              {r.is_approved ? "Hide" : "Publish"}
            </button>
          </li>
        ))}
        {reviews.length === 0 ? <li className="py-4 text-[0.88rem] text-taupe/70">No reviews yet.</li> : null}
      </ul>
    </div>
  );
}

export function SettingsForm({
  currency,
  shippingFee,
  freeShippingThreshold,
  codFee,
}: {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  codFee: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const free = String(f.get("free") ?? "").trim();
    setPending(true);
    setError(null);
    setOk(null);
    const result = await saveSettings({
      currency: String(f.get("currency") ?? "AED"),
      shippingFee: Number(f.get("shipping") || 0),
      freeShippingThreshold: free === "" ? null : Number(free),
      codFee: Number(f.get("cod") || 0),
    });
    setPending(false);
    if (!result.ok) setError(result.error);
    else {
      setOk("Delivery settings saved.");
      router.refresh();
    }
  };

  return (
    <form onSubmit={onSubmit} className="sp-panel grid max-w-xl gap-5 p-6 sm:p-8">
      <Notice error={error} ok={ok} />
      <label className="sp-field">
        <span className="sp-label">Currency</span>
        <input className="sp-input" name="currency" defaultValue={currency} maxLength={3} required />
      </label>
      <label className="sp-field">
        <span className="sp-label">Delivery fee</span>
        <input className="sp-input" name="shipping" inputMode="decimal" defaultValue={shippingFee} required />
      </label>
      <label className="sp-field">
        <span className="sp-label">Free delivery from</span>
        <input className="sp-input" name="free" inputMode="decimal" defaultValue={freeShippingThreshold ?? ""} placeholder="Never free" />
      </label>
      <label className="sp-field">
        <span className="sp-label">Cash on delivery fee</span>
        <input className="sp-input" name="cod" inputMode="decimal" defaultValue={codFee} required />
      </label>
      <button type="submit" className="sp-btn sp-btn-sm" disabled={pending}>
        {pending ? "Saving…" : "Save delivery"}
      </button>
    </form>
  );
}

export function CustomerTable({
  customers,
  selfId,
}: {
  customers: { id: string; email: string; full_name: string | null; phone: string | null; role: "customer" | "admin"; orders: number }[];
  selfId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const change = async (id: string, role: "customer" | "admin") => {
    setError(null);
    const result = await setUserRole(id, role);
    if (!result.ok) setError(result.error);
    else router.refresh();
  };

  return (
    <div>
      <Notice error={error} ok={null} />
      <ul className="divide-y divide-mauve/60">
        {customers.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span>
              <span className="block font-semibold text-burgundy">{c.full_name || c.email}</span>
              <span className="text-[0.78rem] text-taupe/70">
                {c.email}
                {c.phone ? ` · ${c.phone}` : ""} · {c.orders} order{c.orders === 1 ? "" : "s"}
              </span>
            </span>
            <select
              className="sp-input w-auto"
              value={c.role}
              disabled={c.id === selfId && c.role === "admin"}
              onChange={(e) => change(c.id, e.target.value === "admin" ? "admin" : "customer")}
            >
              <option value="customer">Customer</option>
              <option value="admin">Owner</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
